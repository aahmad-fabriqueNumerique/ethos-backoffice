/**
 * Push broadcast utility
 *
 * Delivers one notification to every installation of the app, logged in or not,
 * through two independent channels so a failure of one does not lose the message:
 *
 *  1. Direct tokens: every document of `deviceTokens`, sent in batches of 500
 *     (FCM multicast limit). Tokens FCM reports as dead are deleted, so the
 *     collection self-heals and stats stay honest.
 *  2. Topic `all`: every device subscribes to it from the app, independently
 *     of Firestore (covers a missed/failed token write).
 *
 * Both channels carry the same `notifId` (used by the app to dedupe its history)
 * and the same collapse id (Android `tag`, iOS `apns-collapse-id`), so a device
 * reached twice displays the notification once.
 */
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import type { Messaging } from "firebase-admin/messaging";

export const ALL_DEVICES_TOPIC = "all";
const MULTICAST_LIMIT = 500;

const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export interface BroadcastInput {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface BroadcastResult {
  tokensTotal: number;
  successCount: number;
  failureCount: number;
  removedTokens: number;
  topicSent: boolean;
}

export async function broadcastToAllDevices(
  input: BroadcastInput,
): Promise<BroadcastResult> {
  const messaging = getMessaging();
  const db = getFirestore();

  const notifId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const data = {
    ...(input.data ?? {}),
    notifId,
    timestamp: Date.now().toString(),
  };

  const common = {
    notification: { title: input.title, body: input.body },
    data,
    android: {
      priority: "high" as const,
      collapseKey: notifId,
      notification: {
        tag: notifId,
        priority: "high" as const,
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    apns: {
      headers: { "apns-priority": "10", "apns-collapse-id": notifId },
      payload: {
        aps: {
          alert: { title: input.title, body: input.body },
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  // --- Channel 1: direct tokens, deduplicated, chunked, with cleanup ---------
  const snap = await db.collection("deviceTokens").get();
  const byToken = new Map<string, string[]>(); // token -> doc ids holding it
  snap.docs.forEach((d) => {
    const token = d.data().token;
    if (typeof token === "string" && token) {
      byToken.set(token, [...(byToken.get(token) ?? []), d.id]);
    }
  });
  const tokens = [...byToken.keys()];

  let successCount = 0;
  let failureCount = 0;
  const deadDocIds: string[] = [];

  for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
    const chunk = tokens.slice(i, i + MULTICAST_LIMIT);
    const res = await messaging.sendEachForMulticast({ ...common, tokens: chunk });
    successCount += res.successCount;
    failureCount += res.failureCount;
    res.responses.forEach((r, idx) => {
      if (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)) {
        deadDocIds.push(...(byToken.get(chunk[idx]) ?? []));
      } else if (!r.success) {
        console.error(`Push failed for ${chunk[idx]}:`, r.error?.code);
      }
    });
  }

  for (let i = 0; i < deadDocIds.length; i += MULTICAST_LIMIT) {
    const batch = db.batch();
    deadDocIds
      .slice(i, i + MULTICAST_LIMIT)
      .forEach((id) => batch.delete(db.collection("deviceTokens").doc(id)));
    await batch.commit();
  }

  // --- Channel 2: topic safety net ------------------------------------------
  let topicSent = false;
  try {
    await (messaging as Messaging).send({ ...common, topic: ALL_DEVICES_TOPIC });
    topicSent = true;
  } catch (error) {
    console.error("Topic broadcast failed:", error);
  }

  return {
    tokensTotal: tokens.length,
    successCount,
    failureCount,
    removedTokens: deadDocIds.length,
    topicSent,
  };
}
