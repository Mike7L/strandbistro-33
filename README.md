# Strandbistro 33

Restaurant website: https://mike7l.github.io/strandbistro-33/

Static HTML/CSS/JavaScript, published by GitHub Pages from the main branch root. No build step. The editable project lives in Projects/kiosk/website/dist.

Includes a categorized food and drinks menu with visible prices and serving sizes, approved restaurant photographs and selected Google Maps reviews since 1 May 2026. Historical restaurant reviews and the mixed aggregate rating are excluded. See SOURCES.md for provenance.

## Version 2

An alternative design lives in `v2/` and is served at https://mike7l.github.io/strandbistro-33/v2/ once merged. It reuses `assets/` and the same content as the main page.

## Tests

Playwright smoke tests for `v2/` (opening status, menu tabs and search, images, mobile navigation) run on every pull request via GitHub Actions. To run them locally (needs Node and Python 3):

```sh
cd tests
npm install
npx playwright install chromium
npx playwright test
```
