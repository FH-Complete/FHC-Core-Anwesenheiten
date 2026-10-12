# Wiki screenshots

The suite takes the screenshots of the user wiki page
[extension:anwesenheit](https://wiki.fhcomplete.org/doku.php?id=extension:anwesenheit).
The text of the page is in [`../wiki_anwesenheit.dokuwiki.txt`](../wiki_anwesenheit.dokuwiki.txt).

The suite logs in with test accounts and creates its own test data through the extension API.
Then it takes one PNG per wiki image. The PNG names are the wiki media names: `{{ :extension:lektor1.png }}` → `png/lektor1.png`.

## Setup

1. Copy `.env.example` to `.env`. Fill in `BASE_URL` and the passwords. 
2. Run `prepare_cy_db.sql` against the test cy- database. Every row of the check result must show `ok = true`.

## Run

Run the command in a folder that holds the cypress package:

```bash
npx cypress run --project <path to FHC-Core-Anwesenheiten>/wiki_screenshots
```

The run has three steps:

1. Preflight: the suite checks the logins, the permissions, the DB schema and the phrases.
   It searches an LV of the lektor with a test student. If a check fails, the run stops before the first screenshot.
2. Seed: the suite deletes the test data of the last run in the LV and creates new data.
3. Screenshots: one test per wiki chapter.

## Files

| File | Content |
|---|---|
| `cypress.config.js` | `.env`, base URL, browser window size, tasks |
| `wiki.cy.js` | preflight, seed, the screenshots per wiki chapter |
| `lib/api.js` | requests, accounts, session switch |
| `lib/ui.js` | screenshots, `png/index.json`, CIS menu, modals, tabulator |
| `lib/seed.js` | reset and test data through the extension API |
| `fixtures/entschuldigung.pdf` | the test document of the uploads |
| `prepare_cy_db.sql` | permissions, colleague LV-Teil, dashboard widget, checks, cleanup |

## Output in `png/`

Git ignores the folder.

| File | Content |
|---|---|
| `*.png` | the screenshots |
| `index.json` | every screenshot with section and title; `wikiWithoutShot` lists the wiki images without a screenshot |
| `preflight.json` | the results of the preflight checks |
| `discovery.json` | the LV of the run |
| `seed.json` | the deleted and the created test data |

## Switches

- `--env skipPreflight=1`: take the screenshots despite failed checks.
- `--env noSeed=1`: no reset, the data of the last run stays.

## Cleanup after the screenshots

Part 4 of `prepare_cy_db.sql` removes the permissions and the dashboard widget. It also gives the colleague LV-Teil
back to `demolektor1`. The next run deletes the test data of the run accounts in the LV.
