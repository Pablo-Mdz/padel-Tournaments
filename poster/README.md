# Player poster — Tennessee Tournament

One A4 sheet per language explaining the tournament to the players: format,
scoring, schedule and how to read the standings. Page 1 German, page 2 English.

```sh
npm install
npm run build        # → Tennessee-Tournament.pdf
```

Edit the text in `poster.html`; `__FONTS__` is replaced at build time with the
club's Barlow fonts, embedded as base64 so the PDF renders the same everywhere.
The 4PADEL wordmark is inlined from `4padel-logo.svg`, cropped to its own bounds
and recoloured through `currentColor`.
The build fails if any content would spill off its page.

The poster carries a QR code to the live results instead of a written-out web
address. Change `LIVE_URL` at the top of `build.mjs` to point it somewhere else.
The 4PADEL mark sits in the middle of the code, so the build decodes its own
render and fails if the code no longer scans back to that link.

`CHROMIUM_PATH` makes Playwright use a Chromium that is already installed.
