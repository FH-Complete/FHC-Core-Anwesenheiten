-- Second version of the Lektor attendance widget: same purpose as 'anwesenheiten_lektor'
-- (000_widget_lektor.sql) but rendered through the shared fhc-calendar. Registered as a
-- SEPARATE widget so the original stays available and untouched.
CREATE OR REPLACE FUNCTION extension.insert_cis4_anw_lektor_cal_widget () returns boolean
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
			SELECT 'anwesenheiten_lektor_calendar', 'Extension Widget Anwesenheiten Lehrende (Kalender)',
				   '{
						"css": ""
					}'::jsonb,
					'{
						"file": "public/extensions/FHC-Core-Anwesenheiten/js/components/DashboardWidget/AnwesenheitenLektorCalendar.js",
						"icon": "/skin/images/fh_technikum_wien_illustration_klein.png",
						"name": "Anwesenheiten (Lehrende) – Kalender",
						"width": {
							"max": 4,
							"min": 1
						},
						"height": {
							"max": 4,
							"min": 1
						},
						"hideFooter": false
					}'::jsonb
			WHERE
				NOT EXISTS(SELECT 1 FROM dashboard.tbl_widget WHERE widget_kurzbz='anwesenheiten_lektor_calendar');

			INSERT INTO dashboard.tbl_dashboard_widget(dashboard_id, widget_id)
				SELECT 1, widget_id FROM dashboard.tbl_widget WHERE widget_kurzbz = 'anwesenheiten_lektor_calendar'
				AND NOT EXISTS(
					SELECT 1
					FROM dashboard.tbl_dashboard_widget
					JOIN dashboard.tbl_widget USING(widget_id)
					WHERE dashboard_id = 1
					  AND widget_kurzbz = 'anwesenheiten_lektor_calendar'
				);
		END IF;
	END IF;
	return true;
END;
$$;

SELECT extension.insert_cis4_anw_lektor_cal_widget();

DROP FUNCTION extension.insert_cis4_anw_lektor_cal_widget();
