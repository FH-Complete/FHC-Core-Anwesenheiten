INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anw_ent_admin', 'Entschuldigungsmanagement Digitale Anwesenheiten'
    WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anw_ent_admin');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anwesenheit_lektor', 'Digitale Anwesenheitskontrollen für LV-Teile durchführen'
    WHERE
    NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anwesenheit_lektor');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anwesenheit_student', 'Persönliche Digitale Anwesenheiten einsehen, Zugangscode checkin und Entschuldigung Upload'
    WHERE
    NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anwesenheit_student');
INSERT INTO system.tbl_berechtigung(berechtigung_kurzbz, beschreibung)
SELECT 'extension/anwesenheit_admin', 'Super User in Anwesenheiten Extension'
WHERE
	NOT EXISTS(SELECT 1 FROM system.tbl_berechtigung WHERE berechtigung_kurzbz='extension/anwesenheit_admin');