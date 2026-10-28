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

`CHROMIUM_PATH` makes Playwright use a Chromium that is already installed.
