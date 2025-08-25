CREATE OR REPLACE FUNCTION extension.get_epoch_from_anw_times(
	timestamp_von timestamp,
	timestamp_bis timestamp
)
	RETURNS numeric
	LANGUAGE plpgsql
AS $$
DECLARE
	validtime RECORD;
	total_seconds DOUBLE PRECISION := 0;
BEGIN
	FOR validtime IN
		SELECT
			stunde,
			GREATEST(date_trunc('day', timestamp_von) + beginn::interval, timestamp_von) AS von,
			LEAST(date_trunc('day', timestamp_bis) + ende::interval, timestamp_bis) AS bis
		FROM lehre.tbl_stunde
		WHERE date_trunc('day', timestamp_von) + ende::interval >= timestamp_von
		  AND date_trunc('day', timestamp_bis) + beginn::interval <= timestamp_bis
		ORDER BY stunde ASC
		LOOP
			total_seconds := total_seconds + EXTRACT(EPOCH FROM (validtime.bis - validtime.von));

		END LOOP;

	RETURN total_seconds::numeric;
END;
$$;

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