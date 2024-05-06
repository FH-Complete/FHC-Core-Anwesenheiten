create or replace function get_anwesenheiten_by_time(integer, integer, character varying) returns float
	stable
	language plpgsql
as
$$
DECLARE i_prestudent_id ALIAS FOR $1;
	DECLARE i_lv_id ALIAS FOR $2;
	DECLARE cv_studiensemester_kurzbz ALIAS FOR $3;
	DECLARE returnrec RECORD;
	DECLARE timerec RECORD;
BEGIN
	SELECT
		INTO timerec ROUND((SUM(CASE WHEN status IN ('anwesend', 'entschuldigt')
										 THEN EXTRACT(EPOCH FROM (bis - von))
									 ELSE 0 END) * 100.0)
							   / SUM(EXTRACT(EPOCH FROM (bis - von))), 2) AS anwesenheitsquote
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
