// Builds the player poster (A4, page 1 German, page 2 Spanish) as a PDF.
// The club's Barlow fonts are embedded, so the PDF renders identically anywhere.
//
//   cd poster && npm install && npm run build
//
// Set CHROMIUM_PATH if Playwright should use a Chromium that is already installed.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";

// Where the QR code on the poster points: the live results page.
// Nothing on the poster spells the address out, players just scan it.
const LIVE_URL = "https://claude.ai/artifact/2mq9ZsXNVi99zRDX7GD8yj";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const faces = [
  ["Barlow", 400, "@fontsource/barlow/files/barlow-latin-400-normal.woff2"],
  ["Barlow", 600, "@fontsource/barlow/files/barlow-latin-600-normal.woff2"],
  ["Barlow", 700, "@fontsource/barlow/files/barlow-latin-700-normal.woff2"],
  ["Barlow Condensed", 600, "@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2"],
  ["Barlow Condensed", 700, "@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2"],
  ["Barlow Condensed", 800, "@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2"],
];
const fontCss = faces
  .map(([family, weight, spec]) => {
    const b64 = readFileSync(require.resolve(spec)).toString("base64");
    return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
  })
  .join("\n");

// Error correction H leaves room for the 4PADEL mark in the middle of the code.
const qrSvg = (
  await QRCode.toString(LIVE_URL, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 0,
    color: { dark: "#01135B", light: "#FFFFFF" },
  })
).replace(/\s(width|height)="[^"]*"/g, "");

const html = readFileSync(resolve(here, "poster.html"), "utf8")
  .replace("__FONTS__", `<style>\n${fontCss}\n</style>`)
  .replaceAll("__QR__", qrSvg);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

// Guard against content spilling off a page (the decorative circle is ignored on purpose).
const overflow = await page.evaluate(() =>
  [...document.querySelectorAll(".page")].map((p) => {
    const limit = p.getBoundingClientRect().bottom - parseFloat(getComputedStyle(p).paddingBottom);
    return +(p.querySelector("footer").getBoundingClientRect().bottom - limit).toFixed(1);
  }),
);
if (overflow.some((px) => px > 0.5)) throw new Error(`content overflows its page: ${overflow.join(", ")} px`);

// The logo sits on top of the code, so check the code still decodes to the URL.
const shot = await page.locator(".qr-card").first().screenshot();
const img = PNG.sync.read(shot);
const decoded = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
if (decoded?.data !== LIVE_URL) throw new Error(`QR does not scan back to the link (got: ${decoded?.data ?? "nothing"})`);

const out = resolve(here, "Tennessee-Tournament.pdf");
await page.pdf({ path: out, format: "A4", printBackground: true });
await browser.close();
console.log("written:", out, "- page overflow:", overflow.join(", "), "px - QR verified");
