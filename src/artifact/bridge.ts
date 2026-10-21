// Integration with the claude.ai artifact viewer (only in the single-file
// "artifact" build). There the page is the shared record: the organiser's view
// republishes the whole page with the tournament state embedded, and every
// other viewer (players' phones, the TV) reloads to the new version.

import type { TournamentState } from "../model/types";

export const ARTIFACT_MODE = import.meta.env.VITE_ARTIFACT === "1";


// Minimal shapes of the viewer's capabilities we use.
interface ArtifactNs {
  publish(html: string): Promise<unknown>;
}
interface UserNs {
  isOwner(): boolean;
  canEdit(): boolean;
}
interface DownloadsNs {
  save(req: { filename: string; data: string | Blob }): Promise<unknown>;
}
interface CapabilityMap {
  artifact: ArtifactNs;
  user: UserNs;
  downloads: DownloadsNs;
}

export function capability<K extends keyof CapabilityMap>(name: K): Promise<CapabilityMap[K] | null> {
  const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!ARTIFACT_MODE || !claude?.use) return Promise.resolve(null);
  return claude
    .use(name)
    .then((ns) => (ns ?? null) as CapabilityMap[K] | null)
    .catch(() => null);
}

/** The tournament state this version of the page was published with, if any. */
export function embeddedState(): unknown | null {
  const raw = document.getElementById("app-state")?.textContent?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Rebuilds the complete page with `state` embedded. The page's own style and
 * bundle are read from their marked elements – never from the live DOM.
 * Closing tags are written as `<\/…>` so this code can itself live in an inline script.
 */
export function buildDocument(state: TournamentState): string | null {
  const style = document.getElementById("app-style")?.textContent;
  const bundle = document.getElementById("app-bundle")?.textContent;
  if (style == null || bundle == null) return null;
  const json = JSON.stringify(state).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Padel Team Challenge</title>
<style id="app-style">${style}<\/style>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="app-state">${json}<\/script>
<script type="module" id="app-bundle">${bundle}<\/script>
</body>
</html>
`;
}
