import { useSyncExternalStore } from "react";
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

function load(): TournamentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      lastRaw = raw;
      return parseState(raw);
    }
  } catch {
    // Corrupt or unavailable storage: start fresh rather than crash.
  }
  return createInitialState();
}

let state: TournamentState = load();

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
  const next = reducer(state, action);
  if (next === state) return;
  state = next;
  save(state);
  channel?.postMessage(state);
  notify();
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
