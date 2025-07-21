export function isValidFirebaseUid(uid: unknown): uid is string {
  return (
    typeof uid === "string" &&
    uid.length > 0 &&
    uid.length <= 128 &&
    /^[\w-]+$/.test(uid) // alphanumérique, tirets et underscores uniquement
  );
}
