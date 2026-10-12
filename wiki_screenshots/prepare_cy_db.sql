-- Prepares and checks the test database for the wiki screenshot run.
-- Run all statements in order. Part 1 and 2 are idempotent. Part 3 lists the checks: every row must show ok = true.
-- The uids are the demo accounts of the Cypress test database, the same as in .env:
--   demolektor1 (lektor), demolektor2 (colleague), demoassistenz, demoadmin, s325b311 and s125b101 (students).
-- Other accounts: replace the uids in every part of this script.
-- Phrases: the Cypress preflight checks them (png/preflight.json), run system/checksystem.php of the core when keys are missing.
-- The Kontrollen, statuses and Entschuldigungen come from the Cypress seed (lib/seed.js), not from this script.

-- ---------- 1. permissions ----------
-- on the oe of the students' Studiengaenge: the Entschuldigungsmanagement lists only the Studiengaenge
-- with an anw_r_ent_assistenz assignment, the other checks accept any oe.
-- basis/cis: the CIS4 router (cis.php, dashboard) answers 401 without it.

INSERT INTO system.tbl_benutzerrolle (berechtigung_kurzbz, uid, oe_kurzbz, art, negativ, insertamum, insertvon, anmerkung)
SELECT DISTINCT g.berechtigung_kurzbz, g.uid, g.oe_kurzbz, g.art, false, now(), 'wikirun', 'wiki screenshots'
FROM (
	SELECT b.berechtigung_kurzbz, b.uid, sg.oe_kurzbz, b.art
	FROM public.tbl_student st
		JOIN public.tbl_studiengang sg USING (studiengang_kz)
		CROSS JOIN (VALUES
			('extension/anw_r_lektor', 'demolektor1', 'suid'),
			('extension/anw_r_ent_assistenz', 'demoassistenz', 'suid'),
			('extension/anw_r_full_assistenz', 'demoadmin', 'suid'),
			('basis/cis', 'demolektor1', 's'),
			('basis/cis', 'demoassistenz', 's'),
			('basis/cis', 'demoadmin', 's')
		) AS b(berechtigung_kurzbz, uid, art)
	WHERE st.student_uid IN ('s325b311', 's125b101')

	UNION ALL

	SELECT b.berechtigung_kurzbz, st.student_uid, sg.oe_kurzbz, b.art
	FROM public.tbl_student st
		JOIN public.tbl_studiengang sg USING (studiengang_kz)
		CROSS JOIN (VALUES
			('extension/anw_r_student', 'suid'),
			('extension/anw_stud_ent', 'suid'),
			('basis/cis', 's')
		) AS b(berechtigung_kurzbz, art)
	WHERE st.student_uid IN ('s325b311', 's125b101')

	UNION ALL

	-- KontrolleApi checks anw_r_full_assistenz on the oe of the LV, not of the Studiengang
	SELECT 'extension/anw_r_full_assistenz', 'demoadmin', lv.oe_kurzbz, 'suid'
	FROM lehre.tbl_lehrveranstaltung lv
	WHERE lv.oe_kurzbz IS NOT NULL
		AND lv.lehrveranstaltung_id IN (
			SELECT le.lehrveranstaltung_id
			FROM lehre.tbl_lehreinheitmitarbeiter lem
				JOIN lehre.tbl_lehreinheit le USING (lehreinheit_id)
				JOIN campus.vw_student_lehrveranstaltung v ON (v.lehrveranstaltung_id = le.lehrveranstaltung_id
					AND v.studiensemester_kurzbz = le.studiensemester_kurzbz)
			WHERE lem.mitarbeiter_uid IN ('demolektor1', 'demolektor2') AND v.uid IN ('s325b311', 's125b101'))
) g
WHERE EXISTS (SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz = g.berechtigung_kurzbz)
	AND NOT EXISTS (
		SELECT 1 FROM system.tbl_benutzerrolle br
		WHERE br.uid = g.uid AND br.berechtigung_kurzbz = g.berechtigung_kurzbz AND br.oe_kurzbz IS NOT DISTINCT FROM g.oe_kurzbz
	);

-- ---------- 2. configuration and test data the API cannot create ----------
-- the DMS category of the Entschuldigung documents, every upload fails without it. Like the core categories
-- in system/dbupdate_3.0.php: no parent, locked for the CMS by the group CMS_LOCK. Step 4 keeps it
INSERT INTO campus.tbl_dms_kategorie (kategorie_kurzbz, bezeichnung, beschreibung, parent_kategorie_kurzbz)
SELECT 'ext_anw_entschuldigungen', 'Entschuldigungen', 'Dokumente zu Entschuldigungen der Extension Anwesenheiten', NULL
WHERE NOT EXISTS (SELECT 1 FROM campus.tbl_dms_kategorie WHERE kategorie_kurzbz = 'ext_anw_entschuldigungen');

INSERT INTO campus.tbl_dms_kategorie_gruppe (kategorie_kurzbz, gruppe_kurzbz, insertamum, insertvon)
SELECT 'ext_anw_entschuldigungen', 'CMS_LOCK', now(), 'wikirun'
WHERE EXISTS (SELECT 1 FROM public.tbl_gruppe WHERE gruppe_kurzbz = 'CMS_LOCK')
	AND NOT EXISTS (SELECT 1 FROM campus.tbl_dms_kategorie_gruppe
		WHERE kategorie_kurzbz = 'ext_anw_entschuldigungen' AND gruppe_kurzbz = 'CMS_LOCK');

-- the Anwesenheiten widget on the dashboard of the test students. The widget is only registered for dashboard 1,
-- a user sees it after adding it. The entry has the format of the "add widget" dialog (dashboard/User/addWidget),
-- top left in every grid width. Core writes an empty override as JSON array, the merge needs an object.

INSERT INTO dashboard.tbl_dashboard_benutzer_override (dashboard_id, uid, override)
SELECT 1, u.uid, '{}'::jsonb
FROM (VALUES ('s325b311'), ('s125b101')) AS u(uid)
WHERE NOT EXISTS (SELECT 1 FROM dashboard.tbl_dashboard_benutzer_override o WHERE o.dashboard_id = 1 AND o.uid = u.uid);

UPDATE dashboard.tbl_dashboard_benutzer_override o
SET override = (CASE WHEN jsonb_typeof(o.override) = 'object' THEN o.override ELSE '{}'::jsonb END)
	|| jsonb_build_object('wikirunanwesenheiten', jsonb_build_object(
		'widgetid', 'wikirunanwesenheiten',
		'widget', w.widget_id,
		'custom', true,
		'config', '{}'::jsonb,
		'place', (SELECT jsonb_object_agg(g::text, jsonb_build_object('x', 0, 'y', 0, 'w', LEAST(g, 2), 'h', 2))
			FROM generate_series(1, 8) g)))
FROM dashboard.tbl_widget w
WHERE w.widget_kurzbz = 'anwesenheiten'
	AND o.dashboard_id = 1 AND o.uid IN ('s325b311', 's125b101')
	AND o.override -> 'wikirunanwesenheiten' IS NULL;

-- a LV-Teil of a colleague in the LV of the run, for "Weitere LV-Teile" and the Gesamtansicht:
-- demolektor2 takes over one LV-Teil of demolektor1 without the test student. Only once per LV.
-- png/seed.json shows the lehreinheit_id as foreignLe, step 4 has the revert

UPDATE lehre.tbl_lehreinheitmitarbeiter lem
SET mitarbeiter_uid = 'demolektor2'
WHERE lem.mitarbeiter_uid = 'demolektor1'
	AND lem.lehreinheit_id = (
		SELECT le.lehreinheit_id
		FROM lehre.tbl_lehreinheit le
			JOIN lehre.tbl_lehreinheitmitarbeiter m USING (lehreinheit_id)
		WHERE m.mitarbeiter_uid = 'demolektor1'
			-- an LV of demolektor1 with the test student
			AND EXISTS (SELECT 1 FROM campus.vw_student_lehrveranstaltung v
				WHERE v.lehrveranstaltung_id = le.lehrveranstaltung_id AND v.studiensemester_kurzbz = le.studiensemester_kurzbz
					AND v.uid = 's325b311')
			-- but not the LV-Teil of the test student
			AND NOT EXISTS (SELECT 1 FROM campus.vw_student_lehrveranstaltung v
				WHERE v.lehreinheit_id = le.lehreinheit_id AND v.uid = 's325b311')
			-- and no LV-Teil of demolektor2 in this LV yet
			AND NOT EXISTS (SELECT 1 FROM lehre.tbl_lehreinheit le2
					JOIN lehre.tbl_lehreinheitmitarbeiter m2 USING (lehreinheit_id)
				WHERE le2.lehrveranstaltung_id = le.lehrveranstaltung_id AND le2.studiensemester_kurzbz = le.studiensemester_kurzbz
					AND m2.mitarbeiter_uid = 'demolektor2')
		ORDER BY le.lehreinheit_id
		LIMIT 1);

-- ---------- 3. checks ----------
WITH
-- valid permissions per uid, direct or by role
eff AS (
	SELECT br.uid, COALESCE(br.berechtigung_kurzbz, rb.berechtigung_kurzbz) AS berechtigung_kurzbz
	FROM system.tbl_benutzerrolle br
		LEFT JOIN system.tbl_rolleberechtigung rb ON (rb.rolle_kurzbz = br.rolle_kurzbz)
	WHERE NOT br.negativ
		AND (br.start IS NULL OR br.start <= now())
		AND (br.ende IS NULL OR br.ende >= now())
),
needed(uid, berechtigung_kurzbz) AS (VALUES
	('demolektor1', 'extension/anw_r_lektor'), ('demolektor1', 'basis/cis'),
	('demoassistenz', 'extension/anw_r_ent_assistenz'), ('demoassistenz', 'basis/cis'),
	('demoadmin', 'extension/anw_r_full_assistenz'), ('demoadmin', 'basis/cis'),
	('s325b311', 'extension/anw_r_student'), ('s325b311', 'extension/anw_stud_ent'), ('s325b311', 'basis/cis'),
	('s125b101', 'extension/anw_r_student'), ('s125b101', 'extension/anw_stud_ent'), ('s125b101', 'basis/cis')
),
-- the LVs of demolektor1 with the test student
run_lv AS (
	SELECT DISTINCT le.lehrveranstaltung_id, le.studiensemester_kurzbz
	FROM lehre.tbl_lehreinheitmitarbeiter lem
		JOIN lehre.tbl_lehreinheit le USING (lehreinheit_id)
		JOIN campus.vw_student_lehrveranstaltung v ON (v.lehrveranstaltung_id = le.lehrveranstaltung_id
			AND v.studiensemester_kurzbz = le.studiensemester_kurzbz)
	WHERE lem.mitarbeiter_uid = 'demolektor1' AND v.uid IN ('s325b311', 's125b101')
),
checks(nr, pruefung, ok, hinweis) AS (
	SELECT 10, 'permission exists: ' || p, EXISTS (SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz = p), 'run sql/1/002_rights.sql'
	FROM unnest(ARRAY['extension/anw_r_lektor', 'extension/anw_r_ent_assistenz', 'extension/anw_r_full_assistenz',
		'extension/anw_r_student', 'extension/anw_stud_ent', 'extension/anw_supplierung', 'basis/cis']) AS p

	UNION ALL SELECT 20, 'column tbl_anwesenheit_user.fehlminuten',
		EXISTS (SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'extension' AND table_name = 'tbl_anwesenheit_user' AND column_name = 'fehlminuten'),
		'run sql/2/002_fehlminuten.sql'
	UNION ALL SELECT 21, 'column tbl_anwesenheit_user_history.fehlminuten',
		EXISTS (SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'extension' AND table_name = 'tbl_anwesenheit_user_history' AND column_name = 'fehlminuten'),
		'run sql/2/002_fehlminuten.sql'
	UNION ALL SELECT 22, 'status fehlminuten, no status verspaetet',
		EXISTS (SELECT 1 FROM extension.tbl_anwesenheit_status WHERE status_kurzbz = 'fehlminuten')
			AND NOT EXISTS (SELECT 1 FROM extension.tbl_anwesenheit_status WHERE status_kurzbz = 'verspaetet'),
		'run sql/2/002_fehlminuten.sql'
	UNION ALL SELECT 23, 'get_anwesenheiten_by_time() subtracts the fehlminuten',
		COALESCE((SELECT prosrc ILIKE '%fehlminuten%' FROM pg_proc
			WHERE oid = to_regprocedure('extension.get_anwesenheiten_by_time(integer, integer, character varying)')), false),
		'run sql/2/002_fehlminuten.sql'
	UNION ALL SELECT 24, 'index on tbl_anwesenheit_user_history.anwesenheit_user_id',
		to_regclass('extension.anwesenheit_user_history_anwesenheit_user_id_index') IS NOT NULL,
		'run sql/2/002_fehlminuten.sql'
	UNION ALL SELECT 30, 'widget anwesenheiten on dashboard 1',
		EXISTS (SELECT 1 FROM dashboard.tbl_dashboard_widget dw JOIN dashboard.tbl_widget w USING (widget_id)
			WHERE w.widget_kurzbz = 'anwesenheiten' AND dw.dashboard_id = 1),
		'run sql/1/004_widget.sql'
	UNION ALL SELECT 31, 'DMS category ext_anw_entschuldigungen, locked by CMS_LOCK',
		EXISTS (SELECT 1 FROM campus.tbl_dms_kategorie_gruppe
			WHERE kategorie_kurzbz = 'ext_anw_entschuldigungen' AND gruppe_kurzbz = 'CMS_LOCK'),
		'run part 2 of this script; without the group CMS_LOCK run system/checksystem.php of the core first'

	UNION ALL SELECT 32, 'Anwesenheiten widget on the dashboard of ' || u,
		EXISTS (SELECT 1 FROM dashboard.tbl_dashboard_benutzer_override o
			WHERE o.dashboard_id = 1 AND o.uid = u AND o.override -> 'wikirunanwesenheiten' IS NOT NULL),
		'run part 2 of this script'
	FROM unnest(ARRAY['s325b311', 's125b101']) AS u

	UNION ALL SELECT 40, 'account active: ' || u,
		EXISTS (SELECT 1 FROM public.tbl_benutzer WHERE uid = u AND aktiv), 'activate the account'
	FROM unnest(ARRAY['demolektor1', 'demolektor2', 'demoassistenz', 'demoadmin', 's325b311', 's125b101']) AS u
	UNION ALL SELECT 50, 'permission ' || n.berechtigung_kurzbz || ' for ' || n.uid,
		EXISTS (SELECT 1 FROM eff WHERE eff.uid = n.uid AND eff.berechtigung_kurzbz = n.berechtigung_kurzbz),
		'run part 1 of this script'
	FROM needed n

	UNION ALL SELECT 60, 'demolektor1 teaches an LV of s325b311 or s125b101',
		EXISTS (SELECT 1 FROM run_lv), 'use other test accounts in .env and in this script'
	UNION ALL SELECT 61, 'LV-Teil of demolektor2 in the LV of the run',
		EXISTS (SELECT 1 FROM run_lv r
			JOIN lehre.tbl_lehreinheit le ON (le.lehrveranstaltung_id = r.lehrveranstaltung_id AND le.studiensemester_kurzbz = r.studiensemester_kurzbz)
			JOIN lehre.tbl_lehreinheitmitarbeiter lem USING (lehreinheit_id)
			WHERE lem.mitarbeiter_uid = 'demolektor2'),
		'run part 2 of this script; without it the run skips the screenshots of the colleague LV-Teil'
)
SELECT nr, pruefung, ok, CASE WHEN ok THEN '' ELSE hinweis END AS hinweis
FROM checks
ORDER BY ok, nr, pruefung;

-- ---------- 4. Reset ----------
-- DELETE FROM system.tbl_benutzerrolle WHERE insertvon = 'wikirun';
-- UPDATE dashboard.tbl_dashboard_benutzer_override SET override = override - 'wikirunanwesenheiten'
-- WHERE dashboard_id = 1 AND uid IN ('s325b311', 's125b101');
-- UPDATE lehre.tbl_lehreinheitmitarbeiter SET mitarbeiter_uid = 'demolektor1'
-- WHERE mitarbeiter_uid = 'demolektor2' AND lehreinheit_id = <foreignLe of png/seed.json>;
