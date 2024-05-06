CREATE TABLE IF NOT EXISTS extension.tbl_anwesenheit_status
(
    status_kurzbz               varchar(64) NOT NULL,
    bezeichnung                 varchar(64) NOT NULL,
    bezeichnung_mehrsprachig    varchar(128)[],
    beschreibung                varchar(256),
    insertamum                  timestamp without time zone DEFAULT now(),
    insertvon                   varchar (32),
    updateamum                  timestamp without time zone,
    updatevon                   varchar(32)
);

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_status ADD CONSTRAINT tbl_anwesenheit_status_pkey PRIMARY KEY (status_kurzbz);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_status TO vilesci;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_status TO fhcomplete;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_status TO web;

INSERT INTO extension.tbl_anwesenheit_status (status_kurzbz, bezeichnung)
VALUES
    ('anwesend', 'Ja'),
    ('abwesend', 'Nein'),
    ('entschuldigt', 'Entschuldigt')
ON CONFLICT (status_kurzbz) DO NOTHING;

-----------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS extension.tbl_anwesenheit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    NO MINVALUE
    CACHE 1;

GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_id_seq TO vilesci;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_id_seq TO fhcomplete;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_id_seq TO web;

CREATE TABLE IF NOT EXISTS extension.tbl_anwesenheit
(
    anwesenheit_id              integer NOT NULL default NEXTVAL('extension.tbl_anwesenheit_id_seq'::regClass),
    lehreinheit_id              integer NOT NULL,
    von                         timestamp without time zone,
    bis                         timestamp without time zone,
    insertamum                  timestamp without time zone DEFAULT now(),
    insertvon                   varchar (32),
    updateamum                  timestamp without time zone,
    updatevon                   varchar(32)
);

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit ADD CONSTRAINT tbl_anwesenheit_pkey PRIMARY KEY (anwesenheit_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit ADD CONSTRAINT tbl_anwesenheit_lehreinheit_id_fkey
    FOREIGN KEY (lehreinheit_id) REFERENCES lehre.tbl_lehreinheit(lehreinheit_id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit TO vilesci;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit TO fhcomplete;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit TO web;

-----------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS extension.tbl_anwesenheit_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    NO MINVALUE
    CACHE 1;

GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_user_id_seq TO vilesci;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_user_id_seq TO fhcomplete;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_user_id_seq TO web;


CREATE TABLE IF NOT EXISTS extension.tbl_anwesenheit_user
(
    anwesenheit_user_id         integer NOT NULL default NEXTVAL('extension.tbl_anwesenheit_user_id_seq'::regClass),
    anwesenheit_id              integer NOT NULL,
    prestudent_id               integer NOT NULL,
    status                      varchar (32),
    statussetvon                varchar(32),
    statussetamum               timestamp without time zone,
    insertamum                  timestamp without time zone DEFAULT now(),
    insertvon                   varchar (32),
    updateamum                  timestamp without time zone,
    updatevon                   varchar(32)
);

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_user ADD CONSTRAINT tbl_anwesenheit_user_pkey PRIMARY KEY (anwesenheit_user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_user ADD CONSTRAINT tbl_anwesenheit_user_prestudent_id_fkey
    FOREIGN KEY (prestudent_id) REFERENCES public.tbl_prestudent(prestudent_id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_user ADD CONSTRAINT tbl_anwesenheit_user_anwesenheit_id_fkey
    FOREIGN KEY (anwesenheit_id) REFERENCES extension.tbl_anwesenheit(anwesenheit_id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_user ADD CONSTRAINT tbl_anwesenheit_user_status_fkey
    FOREIGN KEY (status) REFERENCES extension.tbl_anwesenheit_status(status_kurzbz) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_user ADD CONSTRAINT tbl_anwesenheit_user_statussetvon_fkey
    FOREIGN KEY (statussetvon) REFERENCES public.tbl_benutzer(uid) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_user TO vilesci;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_user TO fhcomplete;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_user TO web;


-----------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS extension.tbl_anwesenheit_check_id_seq
	START WITH 1
	INCREMENT BY 1
	NO MAXVALUE
	NO MINVALUE
	CACHE 1;

GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_check_id_seq TO vilesci;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_check_id_seq TO fhcomplete;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_check_id_seq TO web;

CREATE TABLE IF NOT EXISTS extension.tbl_anwesenheit_check
(
	anwesenheit_check_id        integer NOT NULL default NEXTVAL('extension.tbl_anwesenheit_check_id_seq'::regClass),
	zugangscode                 varchar (32),
    anwesenheit_id              integer NOT NULL,
    insertamum                  timestamp without time zone DEFAULT now(),
    insertvon                   varchar (32)
);

DO $$
BEGIN
	ALTER TABLE extension.tbl_anwesenheit_check ADD CONSTRAINT tbl_anwesenheit_check_pkey PRIMARY KEY (anwesenheit_check_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_check ADD CONSTRAINT tbl_anwesenheit_check_lehreinheit_id_fkey
    FOREIGN KEY (anwesenheit_id) REFERENCES extension.tbl_anwesenheit(anwesenheit_id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_check TO vilesci;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_check TO fhcomplete;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_check TO web;

-----------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS extension.tbl_anwesenheit_entschuldigung_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    NO MINVALUE
    CACHE 1;

GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_entschuldigung_id_seq TO vilesci;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_entschuldigung_id_seq TO fhcomplete;
GRANT SELECT, UPDATE ON SEQUENCE extension.tbl_anwesenheit_entschuldigung_id_seq TO web;

CREATE TABLE IF NOT EXISTS extension.tbl_anwesenheit_entschuldigung
(
    entschuldigung_id           integer NOT NULL default NEXTVAL('extension.tbl_anwesenheit_entschuldigung_id_seq'::regClass),
    person_id                   integer NOT NULL,
    von                         timestamp without time zone,
    bis                         timestamp without time zone,
    dms_id                      integer NOT NULL,
    statussetvon                varchar(32),
    statussetamum               timestamp without time zone,
    akzeptiert                  boolean DEFAULT NULL,
    insertamum                  timestamp without time zone DEFAULT now(),
    insertvon                   varchar (32),
    updateamum                  timestamp without time zone,
    updatevon                   varchar(32)
);

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_entschuldigung ADD CONSTRAINT tbl_anwesenheit_entschuldigung_pkey PRIMARY KEY (entschuldigung_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_entschuldigung ADD CONSTRAINT tbl_anwesenheit_entschuldigung_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.tbl_person(person_id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_entschuldigung ADD CONSTRAINT tbl_anwesenheit_entschuldigung_dms_id_fkey
    FOREIGN KEY (dms_id) REFERENCES campus.tbl_dms(dms_id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
ALTER TABLE extension.tbl_anwesenheit_entschuldigung ADD CONSTRAINT tbl_anwesenheit_entschuldigung_statussetvon_fkey
    FOREIGN KEY (statussetvon) REFERENCES public.tbl_benutzer(uid) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_entschuldigung TO vilesci;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_entschuldigung TO fhcomplete;
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE extension.tbl_anwesenheit_entschuldigung TO web;