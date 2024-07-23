INSERT INTO public.tbl_vorlage (vorlage_kurzbz, bezeichnung, anmerkung, mimetype)
VALUES ('AnwesenheitSanchoEntschuldigung', 'AnwesenheitSanchoEntschuldigung', null, 'text/html')
ON CONFLICT (vorlage_kurzbz) DO NOTHING;

INSERT INTO public.tbl_vorlagestudiengang (vorlage_kurzbz, studiengang_kz, version, text, oe_kurzbz)
VALUES ('AnwesenheitSanchoEntschuldigung', 0, 1, '<p>Guten Tag,</p>
<p>es wurde eine Entschuldigung von {student}({UID}) in {stg} {Orgform} im {sem} hochgeladen.</p>
<p><a href="{linkEntschuldigungen}">&gt; Entschuldigungsmanagement</a></p>
<p>Ihr Sancho</p>', 'etw');