CREATE OR REPLACE FUNCTION extension.insert_cis4_anw_widget () returns boolean
	LANGUAGE plpgsql AS
$$ BEGIN
	IF EXISTS (
		SELECT 1 
		FROM INFORMATION_SCHEMA.SCHEMATA 
		WHERE SCHEMA_NAME = 'dashboard'
	) THEN
		IF EXISTS (
			SELECT 1 
			FROM INFORMATION_SCHEMA.TABLES 
			WHERE TABLE_SCHEMA = 'dashboard'
			  AND TABLE_NAME = 'tbl_dashboard_widget'
		) AND EXISTS (
			SELECT 1 
			FROM INFORMATION_SCHEMA.TABLES 
			WHERE TABLE_SCHEMA = 'dashboard'
			  AND TABLE_NAME = 'tbl_widget'
		) THEN
			INSERT INTO dashboard.tbl_widget(widget_kurzbz, beschreibung, arguments, setup)
			SELECT 'anwesenheiten', 'Extension Widget Digitale Anwesenheiten', 
				   '{
						"css": "d-flex justify-content-center align-items-center h-100", "title": "Digitale Anwesenheiten"
					}'::jsonb,
					'{
						"file": "../../extensions/FHC-Core-Anwesenheiten/js/components/DashboardWidget/Anwesenheiten.js",
						"icon": "/skin/images/fh_technikum_wien_illustration_klein.png",
						"name": "Anwesenheiten",
						"width": {
							"max": 4,
							"min": 1
						},
						"height": {
							"max": 4,
							"min": 1
						},
						"cis4link": "/extensions/FHC-Core-Anwesenheiten",
						"hideFooter": false
					}'::jsonb
			WHERE
				NOT EXISTS(SELECT 1 FROM dashboard.tbl_widget WHERE widget_kurzbz='anwesenheiten');

			INSERT INTO dashboard.tbl_dashboard_widget(dashboard_id, widget_id)
				SELECT 1, widget_id FROM dashboard.tbl_widget WHERE widget_kurzbz = 'anwesenheiten'
				AND NOT EXISTS(
					SELECT 1 
					FROM dashboard.tbl_dashboard_widget 
					JOIN dashboard.tbl_widget USING(widget_id) 
					WHERE dashboard_id = 1 
					  AND widget_kurzbz = 'anwesenheiten'
				);
		END IF;
	END IF;
	return true;
END;
$$;

SELECT extension.insert_cis4_anw_widget();

DROP FUNCTION extension.insert_cis4_anw_widget();