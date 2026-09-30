-- status verspaetet: the student was present for a part of the kontrolle only.
-- fehlminuten holds the missed minutes, the quote deducts them for status verspaetet only.
-- every other status ignores the value, so a declined entschuldigung that reverts the status
-- back to verspaetet also gets the minutes back.

INSERT INTO extension.tbl_anwesenheit_status (status_kurzbz, bezeichnung, beschreibung)
VALUES
	('verspaetet', 'Verspätet', 'Anwesend, die Fehlminuten zählen nicht zur Anwesenheit')
ON CONFLICT (status_kurzbz) DO NOTHING;

DO $$
BEGIN
	ALTER TABLE extension.tbl_anwesenheit_user ADD COLUMN fehlminuten integer NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
	ALTER TABLE extension.tbl_anwesenheit_user ADD CONSTRAINT tbl_anwesenheit_user_fehlminuten_check CHECK (fehlminuten >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
	ALTER TABLE extension.tbl_anwesenheit_user_history ADD COLUMN fehlminuten integer NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN extension.tbl_anwesenheit_user.fehlminuten IS 'Versäumte Minuten der Kontrolle. Die Anwesenheitsquote zieht sie nur beim Status verspaetet ab.';
COMMENT ON COLUMN extension.tbl_anwesenheit_user_history.fehlminuten IS 'Versäumte Minuten der Kontrolle zum Zeitpunkt des History-Eintrags.';

-- replaces the version of sql/1/001_function.sql
CREATE OR REPLACE FUNCTION extension.get_anwesenheiten_by_time(integer, integer, character varying) RETURNS float
	stable
	LANGUAGE plpgsql
AS
$$
DECLARE i_prestudent_id ALIAS FOR $1;
	DECLARE i_lv_id ALIAS FOR $2;
	DECLARE cv_studiensemester_kurzbz ALIAS FOR $3;
	DECLARE returnrec RECORD;
	DECLARE timerec RECORD;
BEGIN
	SELECT
		INTO timerec ROUND((SUM(CASE WHEN status IN ('anwesend', 'entschuldigt')
										 THEN extension.get_epoch_from_anw_times(von, bis)
									 WHEN status = 'verspaetet'
										 THEN GREATEST(extension.get_epoch_from_anw_times(von, bis) - fehlminuten * 60, 0)
									 ELSE 0 END) * 100.0)
							   / SUM(extension.get_epoch_from_anw_times(von, bis)), 2) AS anwesenheitsquote
	FROM
		extension.tbl_anwesenheit_user
			JOIN extension.tbl_anwesenheit ON tbl_anwesenheit_user.anwesenheit_id = tbl_anwesenheit.anwesenheit_id
			JOIN lehre.tbl_lehreinheit ON tbl_anwesenheit.lehreinheit_id = tbl_lehreinheit.lehreinheit_id
			JOIN lehre.tbl_lehrveranstaltung ON tbl_lehreinheit.lehrveranstaltung_id = tbl_lehrveranstaltung.lehrveranstaltung_id
	WHERE
		prestudent_id = i_prestudent_id
	  AND studiensemester_kurzbz = cv_studiensemester_kurzbz
	  AND tbl_lehrveranstaltung.lehrveranstaltung_id = i_lv_id
	GROUP BY
		tbl_lehrveranstaltung.lehrveranstaltung_id;

	SELECT INTO returnrec
		CASE
			WHEN timerec.anwesenheitsquote IS NOT NULL
				THEN timerec.anwesenheitsquote
			ELSE 100 END
			AS anwesenheitsquote;

	RETURN returnrec.anwesenheitsquote;
END
$$;

-- the qr scan, a declined entschuldigung and changed kontrolle times read the history of single entries.
-- without this index every lookup reads the whole history table
CREATE INDEX IF NOT EXISTS anwesenheit_user_history_anwesenheit_user_id_index ON
	extension.tbl_anwesenheit_user_history (anwesenheit_user_id);
