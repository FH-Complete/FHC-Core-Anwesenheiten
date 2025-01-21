INSERT INTO public.tbl_gruppe(gruppe_kurzbz, studiengang_kz, bezeichnung, beschreibung, sichtbar, lehre, aktiv, content_visible)
SELECT 'ANW_EXT_STUDENT', 0, 'CMS Sichtbarkeitsgruppe Student', 'CMS Sichtbarkeitsgruppe Student', true, false, true, true
WHERE
	NOT EXISTS(SELECT 1 FROM public.tbl_gruppe WHERE gruppe_kurzbz='ANW_EXT_STUDENT');

INSERT INTO public.tbl_gruppe(gruppe_kurzbz, studiengang_kz, bezeichnung, beschreibung, sichtbar, lehre, aktiv, content_visible)
SELECT 'ANW_EXT_ENT_ADMIN', 0, 'CMSEntAdmin', 'CMSEntAdmin', true, false, true, true
WHERE
	NOT EXISTS(SELECT 1 FROM public.tbl_gruppe WHERE gruppe_kurzbz='ANW_EXT_ENT_ADMIN');