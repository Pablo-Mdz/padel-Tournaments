# Player poster

One A4 sheet per language explaining the tournament to the players: format,
scoring, schedule and how to read the standings. Page 1 German, page 2 Spanish.

```sh
npm install
npm run build        # → Padel-Team-Challenge.pdf
```

Edit the text in `poster.html`; `__FONTS__` is replaced at build time with the
club's Barlow fonts, embedded as base64 so the PDF renders the same everywhere.
The build fails if any content would spill off its page.

`CHROMIUM_PATH` makes Playwright use a Chromium that is already installed.
