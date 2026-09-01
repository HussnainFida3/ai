import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

/**
 * Server-only, file-backed storage for the two real admin sessions this
 * console holds on the operator's behalf, so a visitor who passes the
 * console's own login never has to separately sign into GhrFix or ShadiLife.
 *
 * Lives outside src/ deliberately (under .runtime/, project root) so a
 * source-code redeploy (tar of src/+public/+config) never touches or wipes
 * a live session — only this running server writes to this file.
 */

interface GhrfixSession {
  accessToken: string;
  refreshToken: string;
}

interface ShadilifeSession {
  accessCookie: string;
  refreshCookie: string;
}

interface Store {
  ghrfix?: GhrfixSession;
  shadilife?: ShadilifeSession;
}

const STORE_DIR = path.join(process.cwd(), ".runtime");
const STORE_PATH = path.join(STORE_DIR, "sessions.json");

function readStore(): Store {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function getGhrfixSession(): GhrfixSession | null {
  return readStore().ghrfix ?? null;
}

export function setGhrfixSession(session: GhrfixSession) {
  const store = readStore();
  store.ghrfix = session;
  writeStore(store);
}

export function getShadilifeSession(): ShadilifeSession | null {
  return readStore().shadilife ?? null;
}

export function setShadilifeSession(session: ShadilifeSession) {
  const store = readStore();
  store.shadilife = session;
  writeStore(store);
}
