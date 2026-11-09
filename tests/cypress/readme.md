# Cypress suite Anwesenheiten

API tests for the extension. The Cypress project of FH-Complete core (`tests/cypress`) runs the suite.
The contract between core and a suite is in `tests/cypress/suites/readme_suites.txt` of core.

**Warning:** the suite writes and deletes attendance data. Run it only against a test instance with a test database.

## Setup

1. Install the extension on the instance. On the instance the suite is in
   `application/extensions/FHC-Core-Anwesenheiten/tests/cypress/`.
2. Put the instance values into `tests/cypress/.env` of core: `BASE_URL`, `USER_NAME`, `USER_PASSWORD`, `TEST_DB_*`.
3. Put the passwords of the accounts into `.env` of this folder. The template is `.env.example`.
   The local stack and the pipeline set all values in the environment.
4. Seed and check the fixture in `tests/cypress` of core:

   ```bash
   node tools/dbCheck.js ../../application/extensions/FHC-Core-Anwesenheiten/tests/cypress seed
   ```

## Run

In `tests/cypress` of core:

```bash
CY_SUITE=../../application/extensions/FHC-Core-Anwesenheiten/tests/cypress npx cypress run
```

`CY_SUITE` is relative to `tests/cypress` of core, or absolute. For a run from a separate clone of the extension,
set it to the `tests/cypress` folder of the clone.

## Files

| File | Content |
|---|---|
| `suite.js` | The contract: `specPattern` and `setupNodeEvents` with the `cy.task` functions and `Cypress.env()` keys |
| `checks.js`, `seed/anw.sql` | Fixture checks and seed for `dbCheck.js` of core. The checks of the test LE run the query of the context task (`TEST_LE_SQL` of `tasks/anwDb.js`) |
| `e2e/api/setup.cy.js` | Smoke spec: the logins of all roles and the database |
| `e2e/api/<suite>/<topic>.cy.js` | The specs per controller: `info/`, `kontrolle/`, `profil/`, `entschuldigung/`, `assistenz/` |
| `e2e/api/security/` | How far a student and the staff reach: other students, staff fields, documents, ids that are no ids, the pages |
| `e2e/api/scenario/` | Chains of events in one `it`, one `step()` per event: Kontrolle, Entschuldigung, late events |
| `support/anwApi.js` | One function per endpoint of the extension API |
| `support/accounts.js` | The accounts per role. SUPPL_LEKTOR (demolektor3, `anw_supplierung`) teaches the LE of LEKTOR2, not the one of LEKTOR: the seed adds it |
| `support/anwContext.js` | `useAnwContext()`: the setup of a spec. `ctx` holds the test LV, LEs, students, `ctx.student` (the test student in the test LE), rule values, the day of the server and the PDF fixture |
| `support/anwScenario.js` | `givenKontrolle`, `givenStatus`, resets and `readKontrolle` |
| `support/anwChecks.js` | `expectPhraseError`, `expectPhraseText`, `expectNoDbText`, `skipIf` |
| `support/anwSteps.js` | `step(name, fn)` for the chains of `e2e/api/scenario/`: a failure names its step |
| `support/anwDates.js` | Date math on the day of the server, date and time parameters |
| `tasks/anwDb.js` | The database tasks: context, scoped resets, backdating, reads |
| `fixtures/entschuldigung.pdf` | The document of an Entschuldigung, a PDF in plain ASCII: `cy.fhcUpload` sends text only |

Run one folder of specs with `--spec "../../application/extensions/FHC-Core-Anwesenheiten/tests/cypress/e2e/api/kontrolle/*.cy.js"`.

## Rules

- The suite runs without a file change on every test instance with the extension. Do not write an instance value into a file.
- Get the LV, the semester, the students and all ids from the API at runtime.
- A spec imports no core file. Use the custom commands of core: `cy.login`, `cy.fhcGet`, `cy.fhcPost`,
  `cy.fhcUpload`, `.fhcData()`, `.fhcErrors()`. Pass the path after the entry point; core sends it through `cis.php`.
- A Node file requires no npm package and no core file. `setupNodeEvents` gets the DB part of core.
- The extension API sends a translated phrase as error message. Check it with
  `expectPhraseError(response, 'global/<phrase>', account)`: it compares with the phrase text of the phrase API
  in the language of the account. Never compare a literal text. Do not use `.fhcErrors()` without a phrase check:
  it also passes when the server crashes.
- Get the rule values from `ctx.config` (`InfoApi::getViewPermissions`) and dates from `ctx.today`, the day of the server.
- Get `ctx` from `useAnwContext()`: it resets the data before each test. Create the data with the `given*` helpers.
- Use `UNKNOWN_ID` of `anwApi.js` for an id that no row has.
- Check the stored state with `readKontrolle`, not only the response.
- Never compute a duration from the times. The server counts only the time inside the Stunden raster
  (`extension.get_epoch_from_anw_times`), so 10:00 - 11:30 can count 80 minutes. Use `kontrolle.dauer` of
  `readKontrolle` or `countedMinutes(date, von, bis)`.
- Skip only for a config value or for the date of the run, with `skipIf(this, condition, reason)` in a test written
  as `function () {}`. Missing test data is no reason to skip: use `requireFixture(value, what)`, which fails the test,
  and add a check to `checks.js` when SQL can state it.
- An endpoint spec owns one rule. A scenario step checks how two or more endpoints work together.
- Do not stub the extension API.
- A scenario chain is one `it`. Do not share state between `it` calls: a retry or a skip breaks the chain.
- `cy.fhcUpload` sends text only, so the suite cannot upload a real JPG or PNG. The PDF fixture is plain ASCII.
- `resetEntschuldigungen` keeps the DMS rows and files of the documents: a database task cannot delete a file on the
  instance. Each run with a PDF adds files to the DMS folder of the test instance.
