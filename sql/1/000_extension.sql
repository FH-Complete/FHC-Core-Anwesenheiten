CREATE SCHEMA IF NOT EXISTS extension;

CREATE OR REPLACE FUNCTION extension.calculate_anwesenheiten_sum(
	IN lva_id_param INTEGER,
	IN prestudent_id_param INTEGER,
	IN sem_bz_param VARCHAR(16),
	OUT anwesenheit FLOAT
)
AS $$
DECLARE
	abwesenheiten integer;
	lva_ceiling integer;
BEGIN
	-- count of dates where anwesenheiten have been recorded this semester for this lva
	SELECT COUNT(DISTINCT(DATE(tbl_anwesenheit.datum))) INTO lva_ceiling
	FROM extension.tbl_anwesenheit
			 JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
	WHERE lehrveranstaltung_id = lva_id_param
	  AND studiensemester_kurzbz = sem_bz_param;

	--count of prestudents entries in lva in semester where status is absent
	SELECT COUNT(anwesenheit_id) INTO abwesenheiten
	FROM extension.tbl_anwesenheit
			 JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
	WHERE lehrveranstaltung_id = lva_id_param
	  AND studiensemester_kurzbz = sem_bz_param
	  AND extension.tbl_anwesenheit.prestudent_id = prestudent_id_param
	  AND status = 'abw';

	anwesenheit := ((lva_ceiling - abwesenheiten) / lva_ceiling::FLOAT);
END;
$$ LANGUAGE plpgsql;
