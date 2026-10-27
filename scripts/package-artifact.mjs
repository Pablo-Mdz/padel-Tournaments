// Turns the single-file build into the page published on claude.ai.
// The page must carry three marked elements so it can republish itself with
// new results: #app-style, #app-state (tournament JSON) and #app-bundle.
//
//   node scripts/package-artifact.mjs [state.json]
//
// Pass the state currently embedded in the published page to keep its results.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const html = readFileSync("dist-artifact/index.html", "utf8");
const statePath = process.argv[2];
const state = statePath && existsSync(statePath) ? readFileSync(statePath, "utf8").trim() : "";

const scriptOpen = html.indexOf('<script type="module"');
const jsStart = html.indexOf(">", scriptOpen) + 1;
const jsEnd = html.indexOf("</script>", jsStart);
const styleOpen = html.indexOf("<style", jsEnd);
const cssStart = html.indexOf(">", styleOpen) + 1;
const cssEnd = html.indexOf("</style>", cssStart);
const js = html.slice(jsStart, jsEnd);
const css = html.slice(cssStart, cssEnd);

// Inline content must not close its own element early.
if (/<\/script/i.test(js) || /<\/script/i.test(state)) throw new Error("script content contains </script");
if (/<\/style/i.test(css)) throw new Error("style content contains </style");
if (state) JSON.parse(state);

const out = `<title>Padel Team Challenge</title>
<style id="app-style">${css}</style>
<div id="root"></div>
<script type="application/json" id="app-state">${state}</script>
<script type="module" id="app-bundle">${js}</script>
`;
writeFileSync("dist-artifact/padel-team-challenge.html", out);
console.log(`dist-artifact/padel-team-challenge.html (${out.length} bytes${state ? ", with state" : ""})`);
