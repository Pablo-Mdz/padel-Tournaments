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

const ORGANIZER_FLAG = "pts:organizer";

/** This device was confirmed as the organiser's before (set after the first successful check). */
function rememberedOrganizer(): boolean {
  try {
    return localStorage.getItem(ORGANIZER_FLAG) === "1";
  } catch {
    return false;
  }
}

const embedded = loadEmbedded();
const local = loadLocal();
/** Local edits newer than the shared copy – only the organiser's view may adopt them. */
const localCandidate = local && embedded && local.rev > embedded.rev ? local : null;
const organizerDevice = ARTIFACT_MODE && rememberedOrganizer();

// Everyone first sees the shared (published) copy; without one, this browser's copy.
// The organiser's own device never waits for the network: its newer local copy wins at once.
let state: TournamentState =
  (organizerDevice ? localCandidate : null) ?? embedded ?? local ?? createInitialState();

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
  if (!canEdit()) return;
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
//
// The organiser must never be blocked by the network: every change is saved on
// the device first, and sharing is retried in the background until it succeeds.

export type ShareStatus =
  | "off" // normal hosting: nothing to share
  | "checking" // asking the viewer who we are (unknown device, view only meanwhile)
  | "connecting" // organiser's device, connection not confirmed yet – editing allowed
  | "readonly" // players / TV: view only
  | "live" // everything is shared
  | "pending" // shared automatically in a few seconds
  | "unshared" // older changes found on this device; waiting for "Share now"
  | "publishing"
  | "offline" // no connection: changes are kept on this device and shared later
  | "error"; // sharing failed; retrying automatically

const AUTO_DELAY_MS = 4000;
const MIN_INTERVAL_MS = 8000;
const CHECK_TIMEOUT_MS = 8000;
const PUBLISH_TIMEOUT_MS = 25_000;
const RETRY_STEPS_MS = [5000, 10_000, 20_000, 30_000, 60_000];
const AUTO_FLAG = "pts:autoShare";

const shareListeners = new Set<Listener>();
let sharing: { status: ShareStatus } = {
  status: !ARTIFACT_MODE ? "off" : organizerDevice ? "connecting" : "checking",
};
let artifactNs: { publish(html: string): Promise<unknown> } | null = null;
let timer = 0;
let lastPublish = 0;
let attempt = 0;
/** Changes exist that the shared page does not show yet. */
let dirty = false;

function setShare(status: ShareStatus) {
  if (sharing.status === status) return;
  sharing = { status };
  shareListeners.forEach((l) => l());
}

function canEdit(): boolean {
  return sharing.status !== "readonly" && sharing.status !== "checking";
}

const online = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);

function schedulePublish(delay = AUTO_DELAY_MS) {
  if (!ARTIFACT_MODE) return;
  dirty = true;
  if (!artifactNs) {
    // Not connected to claude.ai yet: keep working, share once the connection is there.
    if (sharing.status !== "connecting") setShare(online() ? "connecting" : "offline");
    return;
  }
  window.clearTimeout(timer);
  setShare(online() ? "pending" : "offline");
  timer = window.setTimeout(tryPublish, delay);
}

function retryLater() {
  const wait = RETRY_STEPS_MS[Math.min(attempt, RETRY_STEPS_MS.length - 1)];
  attempt++;
  window.clearTimeout(timer);
  timer = window.setTimeout(tryPublish, wait);
}

function tryPublish() {
  if (!online()) {
    setShare("offline");
    return; // the "online" event picks it up again
  }
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
  attempt = 0;
  if (!artifactNs) {
    // Never connected in this visit: a reload reconnects; the data is safe on this device.
    if (online()) window.location.reload();
    else setShare("offline");
    return;
  }
  await publishNow();
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([p, new Promise<"timeout">((r) => window.setTimeout(() => r("timeout"), ms))]);
}

async function publishNow() {
  if (!artifactNs) return;
  if (!online()) {
    setShare("offline");
    return;
  }
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
    const result = await withTimeout(artifactNs.publish(html), PUBLISH_TIMEOUT_MS);
    if (result === "timeout") throw { code: "timeout" };
    attempt = 0;
    dirty = false;
    setShare("live"); // the viewer now reloads every open view, this one included
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "not_writer" || code === "not_granted" || code === "not_declared") {
      // This account may not publish: keep the data here, but say sharing is not possible.
      artifactNs = null;
      setShare("error");
      return;
    }
    if (code === "conflict") {
      // A newer version exists; the viewer reloads this view to it. If that reload never
      // comes (flaky connection), fall back to retrying like any other failure.
      window.setTimeout(() => {
        if (sharing.status === "publishing") {
          setShare("error");
          retryLater();
        }
      }, 15_000);
      return;
    }
    setShare(online() ? "error" : "offline");
    retryLater();
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
  const hasUnshared = !!localCandidate || (!embedded && !!local);
  if (organizerDevice && hasUnshared) dirty = true;

  window.addEventListener("offline", () => {
    if (canEdit() && sharing.status !== "off") setShare("offline");
  });
  window.addEventListener("online", () => {
    if (!canEdit()) return;
    if (!artifactNs) setShare("connecting");
    else if (dirty) schedulePublish(500);
    else setShare("live");
  });

  const check = Promise.all([capability("user"), capability("artifact")]);
  void withTimeout(check, CHECK_TIMEOUT_MS).then((r) => {
    if (r !== "timeout") return;
    // No answer from claude.ai yet. The organiser's device keeps working offline;
    // anyone else sees the shared copy read-only. A late answer still upgrades the view.
    if (organizerDevice) setShare(online() ? "connecting" : "offline");
    else setShare("readonly");
  });
  void check.then(([user, art]) => {
    let writer = false;
    try {
      writer = !!user && (user.isOwner() || user.canEdit());
    } catch {
      writer = false;
    }
    if (!writer || !art) {
      if (organizerDevice && !user && !art) {
        // The viewer could not be reached at all: stay usable, share after a reconnect.
        setShare(online() ? "error" : "offline");
        return;
      }
      // Viewers always follow the shared copy, never an old copy in their own browser.
      if (embedded) save(embedded);
      try {
        localStorage.removeItem(ORGANIZER_FLAG);
      } catch {
        /* ignore */
      }
      setShare("readonly");
      return;
    }
    try {
      localStorage.setItem(ORGANIZER_FLAG, "1");
    } catch {
      /* ignore */
    }
    artifactNs = art;
    if (localCandidate && state !== localCandidate && state.rev < localCandidate.rev) {
      state = localCandidate;
      notify();
    }
    if (dirty || hasUnshared) {
      // This device has changes the shared page doesn't show yet.
      if (auto || dirty) schedulePublish(1000);
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

/** True when the organiser's latest changes are not on the shared page yet. */
export function hasUnsharedChanges(): boolean {
  return dirty;
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
