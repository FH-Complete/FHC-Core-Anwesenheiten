-- The fixture of the Cypress suite on a test database with the repository dump and seeders. Idempotent.
-- Apply it with dbCheck.js of core: node tests/cypress/tools/dbCheck.js <this tests/cypress folder> seed
-- The uids are the demo accounts of the seeders, the defaults of .env.example:
--   demolektor1 (LEKTOR), demolektor2 (LEKTOR2), demoassistenz (ENT_ASSISTENZ), demoadmin (FULL_ASSISTENZ),
--   s325b311 (STUDENT) and s125b101 (STUDENT2).
-- The Kontrollen, statuses and Entschuldigungen come from the specs through the API, not from this file.

-- ---------- permissions ----------
-- on the oe of the students' Studiengaenge: the Entschuldigungsmanagement lists only the Studiengaenge
-- with an anw_r_ent_assistenz assignment, the other checks accept any oe

INSERT INTO system.tbl_benutzerrolle (berechtigung_kurzbz, uid, oe_kurzbz, art, negativ, insertamum, insertvon, anmerkung)
SELECT DISTINCT g.berechtigung_kurzbz, g.uid, g.oe_kurzbz, g.art, false, now(), 'cypress', 'Cypress suite Anwesenheiten'
FROM (
	SELECT b.berechtigung_kurzbz, b.uid, sg.oe_kurzbz, b.art
	FROM public.tbl_student st
		JOIN public.tbl_studiengang sg USING (studiengang_kz)
		CROSS JOIN (VALUES
			('extension/anw_r_lektor', 'demolektor1', 'suid'),
			('extension/anw_r_lektor', 'demolektor2', 'suid'),
			('extension/anw_r_ent_assistenz', 'demoassistenz', 'suid'),
			('extension/anw_r_full_assistenz', 'demoadmin', 'suid')
		) AS b(berechtigung_kurzbz, uid, art)
	WHERE st.student_uid IN ('s325b311', 's125b101')

	UNION ALL

	SELECT b.berechtigung_kurzbz, st.student_uid, sg.oe_kurzbz, b.art
	FROM public.tbl_student st
		JOIN public.tbl_studiengang sg USING (studiengang_kz)
		CROSS JOIN (VALUES
			('extension/anw_r_student', 'suid'),
			('extension/anw_stud_ent', 'suid')
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

-- ---------- data the API cannot create ----------
-- the DMS category of the Entschuldigung documents, every upload fails without it. Like the core categories
-- in system/dbupdate_3.0.php: no parent, locked for the CMS by the group CMS_LOCK

INSERT INTO campus.tbl_dms_kategorie (kategorie_kurzbz, bezeichnung, beschreibung, parent_kategorie_kurzbz)
SELECT 'ext_anw_entschuldigungen', 'Entschuldigungen', 'Dokumente zu Entschuldigungen der Extension Anwesenheiten', NULL
WHERE NOT EXISTS (SELECT 1 FROM campus.tbl_dms_kategorie WHERE kategorie_kurzbz = 'ext_anw_entschuldigungen');

INSERT INTO campus.tbl_dms_kategorie_gruppe (kategorie_kurzbz, gruppe_kurzbz, insertamum, insertvon)
SELECT 'ext_anw_entschuldigungen', 'CMS_LOCK', now(), 'cypress'
WHERE EXISTS (SELECT 1 FROM public.tbl_gruppe WHERE gruppe_kurzbz = 'CMS_LOCK')
	AND NOT EXISTS (SELECT 1 FROM campus.tbl_dms_kategorie_gruppe
		WHERE kategorie_kurzbz = 'ext_anw_entschuldigungen' AND gruppe_kurzbz = 'CMS_LOCK');

-- a LV-Teil of the colleague in an LV of demolektor1, for the colleague LE rules:
-- demolektor2 takes over one LV-Teil of demolektor1 without s325b311. Only once per LV.

UPDATE lehre.tbl_lehreinheitmitarbeiter lem
SET mitarbeiter_uid = 'demolektor2'
WHERE lem.mitarbeiter_uid = 'demolektor1'
	AND lem.lehreinheit_id = (
		SELECT le.lehreinheit_id
		FROM lehre.tbl_lehreinheit le
			JOIN lehre.tbl_lehreinheitmitarbeiter m USING (lehreinheit_id)
		WHERE m.mitarbeiter_uid = 'demolektor1'
			-- an LV of demolektor1 with s325b311
			AND EXISTS (SELECT 1 FROM campus.vw_student_lehrveranstaltung v
				WHERE v.lehrveranstaltung_id = le.lehrveranstaltung_id AND v.studiensemester_kurzbz = le.studiensemester_kurzbz
					AND v.uid = 's325b311')
			-- but not the LV-Teil of s325b311
			AND NOT EXISTS (SELECT 1 FROM campus.vw_student_lehrveranstaltung v
				WHERE v.lehreinheit_id = le.lehreinheit_id AND v.uid = 's325b311')
			-- and no LV-Teil of demolektor2 in this LV yet
			AND NOT EXISTS (SELECT 1 FROM lehre.tbl_lehreinheit le2
					JOIN lehre.tbl_lehreinheitmitarbeiter m2 USING (lehreinheit_id)
				WHERE le2.lehrveranstaltung_id = le.lehrveranstaltung_id AND le2.studiensemester_kurzbz = le.studiensemester_kurzbz
					AND m2.mitarbeiter_uid = 'demolektor2')
		ORDER BY le.lehreinheit_id
		LIMIT 1);
