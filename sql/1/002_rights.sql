-- extension pseudorollen 
-- 1.) rename old keys if already inserted 
-- 2.) insert them if they dont exist 
UPDATE system.tbl_berechtigung
SET berechtigung_kurzbz = 'extension/anw_r_ent_assistenz'
WHERE berechtigung_kurzbz = 'extension/anw_ent_admin'
  AND NOT EXISTS (
	SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz = 'extension/anw_r_ent_assistenz'
);
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_ent_assistenz', 'Entschuldigungsmanagement Digitale Anwesenheiten'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_ent_assistenz');

UPDATE system.tbl_berechtigung
SET berechtigung_kurzbz = 'extension/anw_r_lektor'
WHERE berechtigung_kurzbz = 'extension/anwesenheit_lektor'
  AND NOT EXISTS (
	SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz = 'extension/anw_r_lektor'
);
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_lektor', 'Digitale Anwesenheitskontrollen für LV-Teile durchführen'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_lektor');

UPDATE system.tbl_berechtigung
SET berechtigung_kurzbz = 'extension/anw_r_student'
WHERE berechtigung_kurzbz = 'extension/anwesenheit_student'
  AND NOT EXISTS (
	SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz = 'extension/anw_r_student'
);
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_student', 'Persönliche Digitale Anwesenheiten einsehen, Zugangscode checkin und Entschuldigung Upload'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_student');

UPDATE system.tbl_berechtigung
SET berechtigung_kurzbz = 'extension/anw_r_full_assistenz'
WHERE berechtigung_kurzbz = 'extension/anwesenheit_admin'
  AND NOT EXISTS (
	SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz = 'extension/anw_r_full_assistenz'
);
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_r_full_assistenz', 'Super User in Anwesenheiten Extension'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_r_full_assistenz');

-- profil api zugriffsberechtigungen
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_stud_ent', 'Digitale Anwesenheiten Entschuldigung für StudentUID Uploaden/Editieren/Löschen'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_stud_ent');