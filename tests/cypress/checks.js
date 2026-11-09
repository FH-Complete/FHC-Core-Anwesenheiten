// The fixture checks of the suite for dbCheck.js of core. They only read; "seed" applies seed/anw.sql first.
//   in tests/cypress of core: node tools/dbCheck.js ../../application/extensions/FHC-Core-Anwesenheiten/tests/cypress [seed]
// A check with a list as value names what is missing: an empty list passes.

const path = require('path');
const { ACTIVE_STUDENTS, TEST_LE_SQL, otherLvSql } = require('./tasks/anwDb');

const STAFF = ['demolektor1', 'demolektor2', 'demolektor3', 'demoassistenz', 'demoadmin'];
const STUDENTS = ['s325b311', 's125b101'];
const list = uids => uids.map(uid => `'${uid}'`).join(', ');

const NEEDED = [
	['demolektor1', 'extension/anw_r_lektor'],
	['demolektor2', 'extension/anw_r_lektor'],
	['demolektor3', 'extension/anw_r_lektor'],
	['demolektor3', 'extension/anw_supplierung'],
	['demoassistenz', 'extension/anw_r_ent_assistenz'],
	['demoadmin', 'extension/anw_r_full_assistenz'],
	...STUDENTS.flatMap(uid => [[uid, 'extension/anw_r_student'], [uid, 'extension/anw_stud_ent']]),
];

// a check on the test LE of the run: the query and the parameters of the context task (anw:db:context)
const onTestLe = select => ({
	text: `WITH test_le AS (${TEST_LE_SQL}), active AS (${ACTIVE_STUDENTS}) ${select}`,
	values: ['demolektor1', 'demolektor2', STUDENTS],
});

const nothingMissing = r => r.value === '';
const some = r => r.value > 0;

module.exports = {
	title: 'Anwesenheiten',

	sqlFiles: {
		seed: path.join(__dirname, 'seed', 'anw.sql'),
	},

	checks: [
		{
			label: 'extension schema of version 2',
			sql: `SELECT COALESCE(string_agg(c, ', '), '') AS value
				FROM unnest(ARRAY['tbl_anwesenheit_user', 'tbl_anwesenheit_user_history']) AS c
				WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns
					WHERE table_schema = 'extension' AND table_name = c AND column_name = 'fehlminuten')`,
			ok: nothingMissing,
			hint: 'Install the extension (CLI_Manager uploadExtension) or run its sql/ scripts.',
		},
		{
			label: 'accounts active',
			sql: `SELECT COALESCE(string_agg(u, ', '), '') AS value
				FROM unnest(ARRAY[${list([...STAFF, ...STUDENTS])}]) AS u
				WHERE NOT EXISTS (SELECT 1 FROM public.tbl_benutzer WHERE uid = u AND aktiv)`,
			ok: nothingMissing,
			hint: 'The demo accounts come from the seeders of core. Use a database with the repository dump and seeders.',
		},
		{
			label: 'permissions of the accounts',
			sql: `WITH eff AS (
					SELECT br.uid, COALESCE(br.berechtigung_kurzbz, rb.berechtigung_kurzbz) AS berechtigung_kurzbz
					FROM system.tbl_benutzerrolle br
						LEFT JOIN system.tbl_rolleberechtigung rb ON (rb.rolle_kurzbz = br.rolle_kurzbz)
					WHERE NOT br.negativ AND (br.start IS NULL OR br.start <= now()) AND (br.ende IS NULL OR br.ende >= now()))
				SELECT COALESCE(string_agg(n.uid || ' ' || n.b, ', '), '') AS value
				FROM (VALUES ${NEEDED.map(([uid, b]) => `('${uid}', '${b}')`).join(', ')}) AS n(uid, b)
				WHERE NOT EXISTS (SELECT 1 FROM eff WHERE eff.uid = n.uid AND eff.berechtigung_kurzbz = n.b)`,
			ok: nothingMissing,
			hint: 'Run the seed.',
		},
		// the preconditions of requireFixture in the specs, on the test LE of the run. A student outside the
		// Studiengaenge of the staff is checked at runtime only: PermissionLib maps the rights through the OE tree
		// of the legacy berechtigung class
		{
			label: 'test LV-Teil of the run, with a test student',
			sql: onTestLe('SELECT CASE WHEN with_test_student THEN le_id END AS value FROM test_le'),
			ok: r => r.value !== null && r.value !== undefined,
			hint: 'The context task finds no LE of demolektor1 with a test student and an LE of demolektor2 in the LV.',
		},
		{
			label: '3 active students in the test LV-Teil',
			sql: onTestLe('SELECT COUNT(*)::int AS value FROM active a JOIN test_le t ON (a.lehreinheit_id = t.le_id)'),
			ok: r => r.value >= 3,
			hint: 'The specs need 3 students in the test LE (poll counts, two entries in one request).',
		},
		{
			label: 'a test student outside the test LV-Teil',
			sql: onTestLe(`SELECT COUNT(*)::int AS value FROM unnest($3::text[]) u
				WHERE NOT EXISTS (SELECT 1 FROM active a JOIN test_le t ON (a.lehreinheit_id = t.le_id) WHERE a.uid = u)`),
			ok: some,
			hint: 'profil/scan.cy.js needs a test student who is not in the test LE (errorNotParticipantOfLE).',
		},
		{
			label: 'a student only in the LV-Teil of demolektor2',
			sql: onTestLe(`SELECT COUNT(*)::int AS value FROM active f JOIN test_le t ON (f.lehreinheit_id = t.foreign_le_id)
				WHERE NOT EXISTS (SELECT 1 FROM active o WHERE o.lehreinheit_id = t.le_id AND o.prestudent_id = f.prestudent_id)`),
			ok: some,
			hint: 'Run the seed: demolektor2 takes over an LV-Teil without s325b311.',
		},
		{
			label: 'demolektor3 in the LV-Teil of demolektor2',
			sql: onTestLe(`SELECT COUNT(*)::int AS value FROM lehre.tbl_lehreinheitmitarbeiter m
				JOIN test_le t ON (m.lehreinheit_id = t.foreign_le_id) WHERE m.mitarbeiter_uid = 'demolektor3'`),
			ok: some,
			hint: 'Run the seed: SUPPL_LEKTOR teaches the LE of LEKTOR2, not the one of LEKTOR.',
		},
		{
			label: 'an LV of demolektor1 without demolektor2',
			sql: onTestLe(`SELECT COUNT(*)::int AS value FROM (${otherLvSql('(SELECT lv_id FROM test_le)')}) o`),
			ok: some,
			hint: 'The access specs need an LV that LEKTOR teaches and LEKTOR2 does not.',
		},
		{
			label: 'Termine of the test LV-Teil',
			sql: onTestLe('SELECT COUNT(*)::int AS value FROM lehre.vw_stundenplan sp JOIN test_le t ON (sp.lehreinheit_id = t.le_id)'),
			ok: some,
			hint: 'info/read.cy.js reads the lessons of LEKTOR on a Termin of the test LE.',
		},
		{
			label: 'demolektor2 without anw_supplierung',
			sql: `SELECT COUNT(*)::int AS value FROM system.tbl_benutzerrolle br
				LEFT JOIN system.tbl_rolleberechtigung rb ON (rb.rolle_kurzbz = br.rolle_kurzbz)
				WHERE br.uid = 'demolektor2' AND NOT br.negativ
					AND COALESCE(br.berechtigung_kurzbz, rb.berechtigung_kurzbz) = 'extension/anw_supplierung'`,
			ok: r => r.value === 0,
			hint: 'kontrolle/access.cy.js needs LEKTOR2 without the right; SUPPL_LEKTOR (demolektor3) has it.',
		},
		{
			label: 'the Stunden raster starts at 01:00 or later',
			sql: `SELECT to_char(MIN(beginn), 'HH24:MI') AS value FROM lehre.tbl_stunde`,
			ok: r => r.value !== null && r.value >= '01:00',
			hint: 'profil/read.cy.js needs a time before the raster (a Kontrolle with 0 counted minutes).',
		},
		{
			label: 'DMS category ext_anw_entschuldigungen',
			sql: `SELECT COUNT(*)::int AS value FROM campus.tbl_dms_kategorie WHERE kategorie_kurzbz = 'ext_anw_entschuldigungen'`,
			ok: r => r.value > 0,
			hint: 'Run the seed.',
		},
	],
};
