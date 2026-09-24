import { useSyncExternalStore } from "react";
import { ARTIFACT_MODE, buildDocument, capability, embeddedState } from "../artifact/bridge";
import { parseState, STORAGE_KEY } from "../model/persistence";
import { Action, reducer } from "../model/reducer";
import { createInitialState } from "../model/tournament";
import { TournamentState } from "../model/types";

// Single source of truth for the whole app. Every change is written to
// localStorage immediately and broadcast to other tabs (e.g. the /display TV
// screen). The `rev` counter decides which copy is newer.

const CHANNEL = "padel-team-challenge";

type Listener = () => void;
const listeners = new Set<Listener>();

let lastRaw: string | null = null;
let saveFailed = false;

function loadLocal(): TournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      lastRaw = raw;
      return parseState(raw);
    }
  } catch {
    // Corrupt or unavailable storage: start fresh rather than crash.
  }
  return null;
}

function loadEmbedded(): TournamentState | null {
  const raw = ARTIFACT_MODE ? embeddedState() : null;
  if (!raw) return null;
  try {
    return parseState(raw);
  } catch {
    return null;
  }
}

const embedded = loadEmbedded();
const local = loadLocal();
/** Local edits newer than the shared copy – only the organiser's view may adopt them. */
const localCandidate = local && embedded && local.rev > embedded.rev ? local : null;

// Everyone first sees the shared (published) copy; without one, this browser's copy.
let state: TournamentState = embedded ?? local ?? createInitialState();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;

function notify() {
  for (const l of listeners) l();
}

function save(s: TournamentState) {
  try {
    const raw = JSON.stringify(s);
    localStorage.setItem(STORAGE_KEY, raw);
    lastRaw = raw;
    saveFailed = false;
  } catch {
    saveFailed = true;
  }
}

/** Adopts a copy coming from another tab if it is newer than ours. */
function adopt(incoming: unknown) {
  try {
    const next = parseState(incoming);
    if (next.rev > state.rev) {
      state = next;
      notify();
    }
  } catch {
    // Ignore malformed messages.
  }
}

if (channel) channel.onmessage = (e) => adopt(e.data);

if (typeof window !== "undefined") {
  // Fallback 1: the storage event fires in other tabs of the same browser.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      lastRaw = e.newValue;
      adopt(e.newValue);
    }
  });
  // Fallback 2: cheap polling in case neither mechanism delivers (e.g. some kiosk browsers).
  window.setInterval(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && raw !== lastRaw) {
        lastRaw = raw;
        adopt(raw);
      }
    } catch {
      /* storage unavailable */
    }
  }, 2000);
}

export function dispatch(action: Action) {
  if (sharing.status === "readonly" || sharing.status === "checking") return;
  const next = reducer(state, action);
  if (next === state) return;
  state = next;
  save(state);
  channel?.postMessage(state);
  notify();
  schedulePublish();
}

// ---------------------------------------------------------------------------
// Sharing (artifact build only): the organiser's view republishes the page with
// the state embedded; everybody else gets a read-only view that reloads to it.

export type ShareStatus =
  | "off" // normal hosting: nothing to share
  | "checking" // asking the viewer who we are
  | "readonly" // players / TV: view only
  | "live" // everything is shared
  | "pending" // shared automatically in a few seconds
  | "unshared" // older changes found on this device; waiting for "Share now"
  | "publishing"
  | "error";

const AUTO_DELAY_MS = 4000;
const MIN_INTERVAL_MS = 8000;
const AUTO_FLAG = "pts:autoShare";

const shareListeners = new Set<Listener>();
let sharing: { status: ShareStatus } = { status: ARTIFACT_MODE ? "checking" : "off" };
let artifactNs: { publish(html: string): Promise<unknown> } | null = null;
let timer = 0;
let lastPublish = 0;
let retried = false;

function setShare(status: ShareStatus) {
  if (sharing.status === status) return;
  sharing = { status };
  shareListeners.forEach((l) => l());
}

function isWriter(): boolean {
  return artifactNs != null && sharing.status !== "readonly" && sharing.status !== "checking";
}

function schedulePublish(delay = AUTO_DELAY_MS) {
  if (!isWriter()) return;
  window.clearTimeout(timer);
  setShare("pending");
  timer = window.setTimeout(tryPublish, delay);
}

function tryPublish() {
  // Don't reload the organiser's screen while they are typing a score.
  const el = document.activeElement;
  if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
    timer = window.setTimeout(tryPublish, 1500);
    return;
  }
  const wait = lastPublish + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    timer = window.setTimeout(tryPublish, wait);
    return;
  }
  void publishNow();
}

/** Publishes the current state right away (the "Share now" button). */
export async function shareNow() {
  window.clearTimeout(timer);
  await publishNow();
}

async function publishNow() {
  if (!artifactNs) return;
  const html = buildDocument(state);
  if (!html) {
    setShare("error");
    return;
  }
  setShare("publishing");
  lastPublish = Date.now();
  try {
    sessionStorage.setItem(AUTO_FLAG, "1");
  } catch {
    /* ignore */
  }
  try {
    await artifactNs.publish(html);
    retried = false;
    setShare("live"); // the viewer now reloads every open view, this one included
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "conflict") return; // the view reloads to the newer version on its own
    if (code === "rate_limited") return schedulePublish(20_000);
    if (code === "not_writer" || code === "not_granted" || code === "not_declared") {
      artifactNs = null;
      setShare("readonly");
      return;
    }
    setShare("error");
    if (!retried) {
      retried = true;
      timer = window.setTimeout(() => void publishNow(), 10_000);
    }
  }
}

if (ARTIFACT_MODE && typeof window !== "undefined") {
  let auto = false;
  try {
    auto = sessionStorage.getItem(AUTO_FLAG) === "1";
    sessionStorage.removeItem(AUTO_FLAG);
  } catch {
    /* ignore */
  }
  if (embedded && !localCandidate) save(embedded);
  void Promise.all([capability("user"), capability("artifact")]).then(([user, art]) => {
    let writer = false;
    try {
      writer = !!user && (user.isOwner() || user.canEdit());
    } catch {
      writer = false;
    }
    if (!writer || !art) {
      // Viewers always follow the shared copy, never an old copy in their own browser.
      if (embedded) save(embedded);
      setShare("readonly");
      return;
    }
    artifactNs = art;
    if (localCandidate || (!embedded && local)) {
      // This device has changes the shared page doesn't show yet.
      if (localCandidate) {
        state = localCandidate;
        notify();
      }
      if (auto) schedulePublish(1000);
      else setShare("unshared");
    } else {
      setShare("live");
    }
  });
}

export function useShareStatus(): ShareStatus {
  return useSyncExternalStore(
    (l) => {
      shareListeners.add(l);
      return () => shareListeners.delete(l);
    },
    () => sharing.status,
  );
}

/** Players and the TV only look; editing controls are hidden for them. */
export function useReadOnly(): boolean {
  const s = useShareStatus();
  return s === "readonly" || s === "checking";
}

export function getState(): TournamentState {
  return state;
}

export function storageOk(): boolean {
  return !saveFailed;
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTournament(): TournamentState {
  return useSyncExternalStore(subscribe, getState);
}
