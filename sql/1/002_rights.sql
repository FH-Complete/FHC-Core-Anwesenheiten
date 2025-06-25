-- extension pseudorollen
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_ent_assistenz', 'Entschuldigungsmanagement Digitale Anwesenheiten'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_ent_assistenz');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_lektor', 'Digitale Anwesenheitskontrollen für LV-Teile durchführen'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_lektor');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_student', 'Persönliche Digitale Anwesenheiten einsehen, Zugangscode checkin und Entschuldigung Upload'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_student');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_full_assistenz', 'Super User in Anwesenheiten Extension'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_full_assistenz');

-- kontrolle api zugriffsberechtigungen
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_lekt_load', 'Digitale Anwesenheiten Lektorseite Daten Laden'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_lekt_load');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_lekt_edit', 'Digitale Anwesenheiten Kontrollen und Einträge editieren'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_lekt_edit');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_lekt_exec', 'Durchführen von digitalen Anwesenheitskontrollen'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_lekt_exec');

-- profil api zugriffsberechtigungen
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_stud_load', 'Digitale Anwesenheiten Studentenseite Daten Laden'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_stud_load');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_stud_ent_upload', 'Digitale Anwesenheiten Entschuldigung für StudentUID Uploaden/Editieren/Löschen'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_stud_ent_upload');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_stud_ent_load', 'Laden der Entschuldigungen im digitalen Anwesenheitsmanagement'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_stud_ent_load');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_stud_code_entry', 'Berechtigung um Codes an den checkIn abzusenden im digitalen Anwesenheitsmanagement'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_stud_code_entry');

-- administration api zugriffsberechtigungen
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_ent_load_assist', 'Laden der Entschuldigungen im Entschuldigungsmanagement'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_ent_load_assist');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_ent_update_assist', 'Entschuldigung Status akzeptieren/ablehnen im Entschuldigungsmanagement'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/ent_ent_update_assist'