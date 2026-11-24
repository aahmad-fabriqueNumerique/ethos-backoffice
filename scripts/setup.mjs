#!/usr/bin/env node
/**
 * Assistant interactif de configuration (`npm run setup`).
 *
 * - Saisie des variables d'environnement dans la console
 * - Test de connexion à chaque service (Firebase client, Firebase Admin,
 *   OpenAgenda, dossier d'upload)
 * - Menu navigable aux flèches ; une coche verte apparaît à côté d'un service
 *   dès que sa connexion a été vérifiée
 * - Une fois tous les services au vert, une dernière option crée le `.env`
 *
 * Aucune dépendance externe : seuls Node et firebase-admin (déjà installé) sont utilisés.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env");
const LEGACY_ENV_FILE = path.join(ROOT, ".env.local");
const FETCH_TIMEOUT = 10_000;
/* eslint-disable no-control-regex */

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
const c = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;
const green = c(32);
const red = c(31);
const yellow = c(33);
const dim = c(2);
const bold = c(1);
const cyan = c(36);

// ---------------------------------------------------------------------------
// Fichier .env.local
// ---------------------------------------------------------------------------
function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

function loadEnv() {
  // Valeurs existantes : .env.local (utilisé par `npm run dev`), surchargé par .env
  const read = (f) => {
    try {
      return parseEnv(fs.readFileSync(f, "utf8"));
    } catch {
      return {};
    }
  };
  return { ...read(LEGACY_ENV_FILE), ...read(ENV_FILE) };
}

function formatValue(key, value) {
  return key === "FIREBASE_PRIVATE_KEY" || /\s|#/.test(value)
    ? `"${value.replace(/"/g, '\\"')}"`
    : value;
}

/** Met à jour les clés connues en conservant le reste du fichier. */
function saveEnv(values) {
  let lines = [];
  try {
    lines = fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/);
  } catch {
    /* nouveau fichier */
  }
  const remaining = new Map(
    Object.entries(values).filter(([, v]) => v !== undefined && v !== ""),
  );
  lines = lines.map((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && remaining.has(m[1])) {
      const v = remaining.get(m[1]);
      remaining.delete(m[1]);
      return `${m[1]}=${formatValue(m[1], v)}`;
    }
    return line;
  });
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  for (const [k, v] of remaining) lines.push(`${k}=${formatValue(k, v)}`);
  fs.writeFileSync(ENV_FILE, lines.join("\n") + "\n", { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// Entrées clavier (mode raw)
// ---------------------------------------------------------------------------
const stdin = process.stdin;
const stdout = process.stdout;

function cleanup() {
  if (stdin.isTTY) stdin.setRawMode(false);
  stdin.pause();
  stdout.write("\x1b[?25h");
}

function abort() {
  cleanup();
  stdout.write("\n");
  process.exit(130);
}

/** Attend un chunk de données brutes du terminal. */
function readChunk() {
  return new Promise((resolve) => {
    const onData = (buf) => {
      stdin.off("data", onData);
      stdin.pause();
      resolve(buf.toString("utf8"));
    };
    stdin.resume();
    stdin.on("data", onData);
  });
}

/** Saisie d'une ligne, avec valeur par défaut et masquage optionnel. */
async function ask(label, { def = "", secret = false } = {}) {
  const shown = def
    ? dim(` [${secret ? mask(def) : truncate(def, 40)}]`)
    : "";
  stdout.write(`${cyan("?")} ${label}${shown}: `);
  let value = "";
  for (;;) {
    const chunk = await readChunk();
    // Séquences d'échappement (flèches…) : ignorées
    const text = chunk.replace(/\x1b\[[0-9;]*[A-Za-z~]/g, "");
    for (const ch of text) {
      if (ch === "\x03") abort();
      if (ch === "\r" || ch === "\n") {
        stdout.write("\n");
        return value === "" ? def : value.trim();
      }
      if (ch === "\x7f" || ch === "\b") {
        if (value.length) {
          value = value.slice(0, -1);
          if (!secret) stdout.write("\b \b");
        }
      } else if (ch >= " ") {
        value += ch;
        if (!secret) stdout.write(ch);
      }
    }
    if (secret) stdout.write(""); // rien n'est affiché
  }
}

async function confirm(label, def = true) {
  const a = await ask(`${label} ${dim(def ? "(O/n)" : "(o/N)")}`);
  if (!a || a === String(def)) return def;
  return /^(o|oui|y|yes)$/i.test(a);
}

function mask(v) {
  return v.length <= 8 ? "••••" : `${v.slice(0, 4)}••••${v.slice(-2)}`;
}
function truncate(v, n) {
  return v.length > n ? `${v.slice(0, n - 1)}…` : v;
}

/** Menu navigable aux flèches. `items`: [{ label, status?, hint? }] */
async function menu(title, items) {
  let index = 0;
  let first = true;
  stdout.write("\x1b[?25l");
  const render = () => {
    if (!first) stdout.write(`\x1b[${items.length + 2}A`);
    first = false;
    stdout.write(`\x1b[2K${bold(title)}\n`);
    items.forEach((it, i) => {
      const mark =
        it.status === "ok"
          ? green("✔")
          : it.status === "ko"
            ? red("✖")
            : " ";
      const pointer = i === index ? cyan("❯") : " ";
      const label = i === index ? cyan(it.label) : it.label;
      const hint = it.hint ? dim(`  ${it.hint}`) : "";
      stdout.write(`\x1b[2K ${pointer} ${mark} ${label}${hint}\n`);
    });
    stdout.write(`\x1b[2K${dim("  ↑/↓ naviguer · Entrée choisir · Ctrl+C quitter")}\n`);
  };
  render();
  for (;;) {
    const k = await readChunk();
    if (k === "\x03") abort();
    if (k === "\x1b[A" || k === "k") index = (index - 1 + items.length) % items.length;
    else if (k === "\x1b[B" || k === "j") index = (index + 1) % items.length;
    else if (k === "\r" || k === "\n") {
      stdout.write("\x1b[?25h");
      return index;
    }
    render();
  }
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
const env = { ...loadEnv() };
// Valeurs déjà présentes dans l'environnement du shell
const fromShell = (k) => process.env[k];
const get = (k) => env[k] ?? fromShell(k) ?? "";

async function http(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* pas de JSON */
  }
  return { res, body };
}

const ok = (msg) => stdout.write(`  ${green("✔")} ${msg}\n`);
const ko = (msg) => stdout.write(`  ${red("✖")} ${msg}\n`);
const warn = (msg) => stdout.write(`  ${yellow("!")} ${msg}\n`);

async function promptVars(vars) {
  for (const v of vars) {
    env[v.key] = await ask(v.label, { def: get(v.key), secret: v.secret });
  }
}

const services = [
  {
    id: "firebase-client",
    label: "Firebase (client)",
    vars: [
      { key: "NUXT_PUBLIC_FIREBASE_API_KEY", label: "API key", secret: true },
      { key: "NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN", label: "Auth domain" },
      { key: "NUXT_PUBLIC_FIREBASE_PROJECT_ID", label: "Project ID" },
      { key: "NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET", label: "Storage bucket" },
      { key: "NUXT_PUBLIC_FIREBASE_APP_ID", label: "App ID" },
    ],
    async test() {
      let allOk = true;
      const key = get("NUXT_PUBLIC_FIREBASE_API_KEY");
      if (!key) return ko("API key manquante"), false;
      // Un idToken bidon : une clé valide répond INVALID_ID_TOKEN, une clé invalide API_KEY_INVALID
      const { res, body } = await http(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken: "test" }),
        },
      );
      const msg = body?.error?.message ?? "";
      const reason = body?.error?.details?.[0]?.reason ?? "";
      if (/INVALID_ID_TOKEN|INVALID_ARGUMENT/.test(msg) && !reason.startsWith("API_KEY")) {
        ok("API key acceptée par Firebase Auth");
      } else {
        ko(`API key refusée (${reason || msg || res.status})`);
        allOk = false;
      }
      const domain = get("NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
      const project = get("NUXT_PUBLIC_FIREBASE_PROJECT_ID");
      if (project && domain && !domain.startsWith(project)) {
        warn(`Auth domain (${domain}) ne correspond pas au project ID (${project})`);
      }
      for (const k of ["NUXT_PUBLIC_FIREBASE_PROJECT_ID", "NUXT_PUBLIC_FIREBASE_APP_ID"]) {
        if (!get(k)) (ko(`${k} manquant`), (allOk = false));
      }
      return allOk;
    },
  },
  {
    id: "firebase-admin",
    label: "Firebase Admin (serveur)",
    async collect() {
      const file = await ask(
        "Chemin du JSON de compte de service (vide = saisie manuelle)",
      );
      if (file) {
        try {
          const p = file.startsWith("~") ? path.join(os.homedir(), file.slice(1)) : file;
          const json = JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));
          env.FIREBASE_ADMIN_PROJECT_ID = json.project_id;
          env.FIREBASE_ADMIN_CLIENT_EMAIL = json.client_email;
          env.FIREBASE_PRIVATE_KEY = String(json.private_key).replace(/\n/g, "\\n");
          ok("Valeurs lues depuis le fichier JSON");
          return;
        } catch (e) {
          ko(`Lecture impossible : ${e.message}`);
        }
      }
      await promptVars([
        { key: "FIREBASE_ADMIN_PROJECT_ID", label: "Project ID" },
        { key: "FIREBASE_ADMIN_CLIENT_EMAIL", label: "Client email" },
        { key: "FIREBASE_PRIVATE_KEY", label: "Private key (avec les \\n)", secret: true },
      ]);
    },
    async test() {
      const projectId = get("FIREBASE_ADMIN_PROJECT_ID");
      const clientEmail = get("FIREBASE_ADMIN_CLIENT_EMAIL");
      const privateKey = get("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
      if (!projectId || !clientEmail || !privateKey) {
        return ko("Project ID, client email ou private key manquant"), false;
      }
      const bucket = get("NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
      let app;
      let allOk = true;
      try {
        app = initializeApp(
          {
            credential: cert({ projectId, clientEmail, privateKey }),
            storageBucket: bucket || undefined,
          },
          `setup-${Date.now()}`,
        );
      } catch (e) {
        return ko(`Identifiants invalides : ${e.message}`), false;
      }
      const checks = [
        ["Authentication", () => getAuth(app).listUsers(1)],
        ["Firestore", () => getFirestore(app).listCollections()],
      ];
      if (bucket) {
        checks.push([
          `Storage (${bucket})`,
          async () => {
            const [exists] = await getStorage(app).bucket().exists();
            if (!exists) throw new Error("bucket introuvable");
          },
        ]);
      } else {
        warn("Storage non testé (NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET absent)");
      }
      for (const [name, fn] of checks) {
        try {
          await Promise.race([
            fn(),
            new Promise((_, rej) =>
              setTimeout(() => rej(new Error("délai dépassé")), FETCH_TIMEOUT * 2),
            ),
          ]);
          ok(name);
        } catch (e) {
          ko(`${name} : ${String(e.message).split("\n")[0]}`);
          allOk = false;
        }
      }
      await deleteApp(app).catch(() => {});
      return allOk;
    },
    vars: [],
  },
  {
    id: "openagenda",
    label: "OpenAgenda",
    vars: [
      { key: "OPENAGENDA_API_KEY", label: "API key", secret: true },
      { key: "AGENDA_TRAD_UID", label: "UID agenda trad" },
      { key: "LO_CALEN_DIARI_UID", label: "UID agenda Lo Calendiari" },
    ],
    async test() {
      const key = get("OPENAGENDA_API_KEY");
      if (!key) return ko("API key manquante"), false;
      let allOk = true;
      for (const k of ["AGENDA_TRAD_UID", "LO_CALEN_DIARI_UID"]) {
        const uid = get(k);
        if (!uid) {
          ko(`${k} manquant`);
          allOk = false;
          continue;
        }
        try {
          const { res, body } = await http(
            `https://api.openagenda.com/v2/agendas/${encodeURIComponent(uid)}/events?size=1&key=${encodeURIComponent(key)}`,
          );
          if (res.ok) ok(`${k} (${uid}) : ${body?.total ?? "?"} événement(s)`);
          else {
            ko(`${k} (${uid}) : HTTP ${res.status} ${body?.message ?? ""}`.trim());
            allOk = false;
          }
        } catch (e) {
          ko(`${k} : ${e.message}`);
          allOk = false;
        }
      }
      return allOk;
    },
  },
  {
    id: "uploads",
    label: "Dossier d'upload temporaire",
    vars: [{ key: "TMP_UPLOADS_DIR", label: "Dossier (vide = /tmp)" }],
    async test() {
      const dir = get("TMP_UPLOADS_DIR") || "/tmp";
      try {
        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
        if (!fs.statSync(dir).isDirectory()) throw new Error("n'est pas un dossier");
        ok(`${dir} accessible en lecture/écriture`);
        return true;
      } catch (e) {
        ko(`${dir} : ${e.message}`);
        return false;
      }
    },
  },
];

const status = {};

async function runService(svc) {
  stdout.write(`\n${bold(svc.label)}\n`);
  if (svc.collect) await svc.collect();
  else await promptVars(svc.vars);
  stdout.write(`\n${dim("Test de connexion…")}\n`);
  let passed = false;
  try {
    passed = await svc.test();
  } catch (e) {
    ko(e.message);
  }
  status[svc.id] = passed ? "ok" : "ko";
  stdout.write(
    passed ? `\n${green("Connexion vérifiée.")}\n` : `\n${red("Échec de la vérification.")}\n`,
  );
  stdout.write(dim("\nAppuyez sur une touche pour revenir au menu…"));
  const k = await readChunk();
  if (k === "\x03") abort();
  stdout.write("\n");
}

async function main() {
  if (!stdin.isTTY || !stdout.isTTY) {
    console.error("Ce script doit être lancé dans un terminal interactif.");
    process.exit(1);
  }
  stdin.setRawMode(true);
  process.on("exit", cleanup);

  for (;;) {
    stdout.write("\x1b[2J\x1b[H");
    stdout.write(`${bold("Configuration de l'environnement")} ${dim(`→ ${path.basename(ENV_FILE)}`)}\n\n`);
    const allGreen = services.every((s) => status[s.id] === "ok");
    const items = [
      ...services.map((s) => ({ label: s.label, status: status[s.id] })),
      { label: "Tout tester avec les valeurs actuelles", hint: "sans ressaisie" },
      { label: "Quitter" },
      ...(allGreen
        ? [{ label: `Créer le ${path.basename(ENV_FILE)}`, status: "ok" }]
        : []),
    ];
    const choice = await menu("Choisissez un service à configurer et tester :", items);
    const label = items[choice].label;
    if (label === "Quitter") break;
    if (allGreen && choice === items.length - 1) {
      const name = path.basename(ENV_FILE);
      stdout.write("\n");
      if (
        !fs.existsSync(ENV_FILE) ||
        (await confirm(`${name} existe déjà : le mettre à jour ?`))
      ) {
        saveEnv(env);
        ok(`${name} écrit (${path.relative(ROOT, ENV_FILE)})`);
      } else {
        warn("Aucune modification");
      }
      stdout.write(dim("\nAppuyez sur une touche pour revenir au menu…"));
      if ((await readChunk()) === "\x03") abort();
      continue;
    }
    if (label.startsWith("Tout tester")) {
      stdout.write("\n");
      for (const svc of services) {
        stdout.write(`${bold(svc.label)}\n`);
        let passed = false;
        try {
          passed = await svc.test();
        } catch (e) {
          ko(e.message);
        }
        status[svc.id] = passed ? "ok" : "ko";
      }
      stdout.write(dim("\nAppuyez sur une touche pour revenir au menu…"));
      if ((await readChunk()) === "\x03") abort();
      continue;
    }
    await runService(services[choice]);
  }
  stdout.write("\n");
  cleanup();
}

main().catch((e) => {
  cleanup();
  console.error(e);
  process.exit(1);
});
