CREATE OR REPLACE FUNCTION extension.insert_cis4_anw_lektor_widget () returns boolean
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
			SELECT 'anwesenheiten_lektor', 'Extension Widget Anwesenheiten Lehrende',
				   '{
						"css": ""
					}'::jsonb,
					'{
						"file": "public/extensions/FHC-Core-Anwesenheiten/js/components/DashboardWidget/AnwesenheitenLektor.js",
						"icon": "/skin/images/fh_technikum_wien_illustration_klein.png",
						"name": "Anwesenheiten (Lehrende)",
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
				NOT EXISTS(SELECT 1 FROM dashboard.tbl_widget WHERE widget_kurzbz='anwesenheiten_lektor');

			INSERT INTO dashboard.tbl_dashboard_widget(dashboard_id, widget_id)
				SELECT 1, widget_id FROM dashboard.tbl_widget WHERE widget_kurzbz = 'anwesenheiten_lektor'
				AND NOT EXISTS(
					SELECT 1
					FROM dashboard.tbl_dashboard_widget
					JOIN dashboard.tbl_widget USING(widget_id)
					WHERE dashboard_id = 1
					  AND widget_kurzbz = 'anwesenheiten_lektor'
				);

			-- self-heal older definitions of this widget:
			--  - keep it resizable in both directions (min/max instead of a fixed size)
			--  - drop the unparameterized cis4link header button (the tool needs the
			--    stg_kz/sem/lvid/sem_kurzbz params, so there is no meaningful fallback for Lektoren)
			UPDATE dashboard.tbl_widget
			SET setup = jsonb_set(
					jsonb_set(setup, '{width}',  '{"min": 1, "max": 4}'::jsonb, true),
					'{height}', '{"min": 1, "max": 4}'::jsonb, true)
				- 'cis4link'
			WHERE widget_kurzbz = 'anwesenheiten_lektor';
		END IF;
	END IF;
	return true;
END;
$$;

SELECT extension.insert_cis4_anw_lektor_widget();

DROP FUNCTION extension.insert_cis4_anw_lektor_widget();
