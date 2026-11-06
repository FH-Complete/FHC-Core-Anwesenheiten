// The fixture checks of the suite for dbCheck.js of core. They only read; "seed" applies seed/anw.sql first.
//   in tests/cypress of core: node tools/dbCheck.js ../../application/extensions/FHC-Core-Anwesenheiten/tests/cypress [seed]
// A check with a list as value names what is missing: an empty list passes.

const path = require('path');

const STAFF = ['demolektor1', 'demolektor2', 'demoassistenz', 'demoadmin'];
const STUDENTS = ['s325b311', 's125b101'];
const list = uids => uids.map(uid => `'${uid}'`).join(', ');

const NEEDED = [
	['demolektor1', 'extension/anw_r_lektor'],
	['demolektor2', 'extension/anw_r_lektor'],
	['demoassistenz', 'extension/anw_r_ent_assistenz'],
	['demoadmin', 'extension/anw_r_full_assistenz'],
	...STUDENTS.flatMap(uid => [[uid, 'extension/anw_r_student'], [uid, 'extension/anw_stud_ent']]),
];

// the LVs of demolektor1 with a test student
const RUN_LV = `SELECT DISTINCT le.lehrveranstaltung_id, le.studiensemester_kurzbz
	FROM lehre.tbl_lehreinheitmitarbeiter lem
		JOIN lehre.tbl_lehreinheit le USING (lehreinheit_id)
		JOIN campus.vw_student_lehrveranstaltung v ON (v.lehrveranstaltung_id = le.lehrveranstaltung_id
			AND v.studiensemester_kurzbz = le.studiensemester_kurzbz)
	WHERE lem.mitarbeiter_uid = 'demolektor1' AND v.uid IN (${list(STUDENTS)})`;

const nothingMissing = r => r.value === '';

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
		{
			label: 'LVs of demolektor1 with a test student',
			sql: `SELECT COUNT(*)::int AS value FROM (${RUN_LV}) r`,
			ok: r => r.value > 0,
			hint: 'The seeders give demolektor1 no LV with s325b311 or s125b101 in a semester.',
		},
		{
			label: 'LV-Teil of demolektor2 in such an LV',
			sql: `SELECT COUNT(*)::int AS value FROM (${RUN_LV}) r
				JOIN lehre.tbl_lehreinheit le ON (le.lehrveranstaltung_id = r.lehrveranstaltung_id
					AND le.studiensemester_kurzbz = r.studiensemester_kurzbz)
				JOIN lehre.tbl_lehreinheitmitarbeiter lem USING (lehreinheit_id)
				WHERE lem.mitarbeiter_uid = 'demolektor2'`,
			ok: r => r.value > 0,
			hint: 'Run the seed.',
		},
		{
			label: 'DMS category ext_anw_entschuldigungen',
			sql: `SELECT COUNT(*)::int AS value FROM campus.tbl_dms_kategorie WHERE kategorie_kurzbz = 'ext_anw_entschuldigungen'`,
			ok: r => r.value > 0,
			hint: 'Run the seed.',
		},
	],
};
