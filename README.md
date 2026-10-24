# Websites

Website drafts for businesses on Amrum: https://mike7l.github.io/websites/

Static HTML/CSS/JavaScript, published by GitHub Pages from the main branch root. No build step. The root `index.html` is a catalog linking to every site; each site lives in its own folder with its own `assets/`.

| Folder | Site |
| --- | --- |
| `strandbistro-33/` | Strandbistro 33 restaurant (`v2/` is an alternative design). The editable project lives in Projects/kiosk/website/dist. See `strandbistro-33/SOURCES.md` for content provenance. |
| `neptun/` | Hotel-Restaurant Neptun, hotel and restaurant on one page |
| `neptun-hotel/` | Hotel Neptun on its own |
| `neptun-restaurant/` | Restaurant Neptun on its own |
| `onerbaeaenke/` | Onerbäänke bar & bistro (`v2/` is the night design) |
| `seaside-amrum/` | Seaside Amrum holiday flats |
| `die-muschelsucher/` | Die Muschelsucher café & restaurant |

To add a site, create a new folder with an `index.html` and add a link to the catalog in the root `index.html`.

## Tests

Playwright smoke tests for `strandbistro-33/v2/` (opening status, menu tabs and search, images, mobile navigation) run on every pull request via GitHub Actions. To run them locally (needs Node and Python 3):

```sh
cd tests
npm install
npx playwright install chromium
npx playwright test
```
