ALTER TABLE extension.tbl_anwesenheit_entschuldigung
	ALTER COLUMN dms_id DROP NOT NULL;

ALTER TABLE extension.tbl_anwesenheit_entschuldigung_history
	ALTER COLUMN dms_id DROP NOT NULL;