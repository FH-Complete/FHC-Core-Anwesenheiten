<?php

class Entschuldigung_model extends \DB_Model
{

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->dbTable = 'extension.tbl_anwesenheit_entschuldigung';
        $this->pk = 'entschuldigung_id';
    }

	public function getEntschuldigungenByPerson($person_id)
	{
		$query = 'SELECT dms_id, von, bis, akzeptiert, entschuldigung_id, notiz
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE person_id = ?
					ORDER by von DESC, akzeptiert DESC NULLS LAST';

		return $this->execReadOnlyQuery($query, array($person_id));
	}
	public function getAllEntschuldigungen()
	{
		$query = 'SELECT DISTINCT ON (dms_id,
							von,
							bis,
							public.tbl_person.person_id,
							tbl_anwesenheit_entschuldigung.entschuldigung_id,
							vorname,
							nachname,
							akzeptiert)
						dms_id,
						von,
						bis,
						public.tbl_person.person_id,
						tbl_anwesenheit_entschuldigung.entschuldigung_id,
						vorname,
						nachname,
						akzeptiert,
						notiz,
						studiengang_kz,
						bezeichnung,
						kurzbzlang,
						orgform_kurzbz
					FROM extension.tbl_anwesenheit_entschuldigung
						JOIN public.tbl_person ON extension.tbl_anwesenheit_entschuldigung.person_id = public.tbl_person.person_id
						JOIN public.tbl_prestudent ON (public.tbl_person.person_id = public.tbl_prestudent.person_id)
						JOIN public.tbl_student USING (prestudent_id, studiengang_kz)
						JOIN public.tbl_studiengang USING (studiengang_kz)
					JOIN tbl_benutzer ON(public.tbl_student.student_uid = tbl_benutzer.uid)
					WHERE tbl_benutzer.aktiv = TRUE
					ORDER by vorname, von DESC, akzeptiert DESC NULLS FIRST
					';

		return $this->execReadOnlyQuery($query);
	}

	public function getEntschuldigungenForStudiengaenge($stg_kz_arr)
	{

		$query = 'SELECT DISTINCT ON (dms_id,
							von,
							bis,
							public.tbl_person.person_id,
							tbl_anwesenheit_entschuldigung.entschuldigung_id,
							vorname,
							nachname,
							akzeptiert)
						dms_id,
						von,
						bis,
						public.tbl_person.person_id,
						tbl_anwesenheit_entschuldigung.entschuldigung_id,
						notiz,
						vorname,
						nachname,
						akzeptiert,
						studiengang_kz,
						bezeichnung,
						kurzbzlang,
						orgform_kurzbz
					FROM extension.tbl_anwesenheit_entschuldigung
						JOIN public.tbl_person ON extension.tbl_anwesenheit_entschuldigung.person_id = public.tbl_person.person_id
						JOIN public.tbl_prestudent ON (public.tbl_person.person_id = public.tbl_prestudent.person_id)
						JOIN public.tbl_student USING (prestudent_id, studiengang_kz)
						JOIN public.tbl_studiengang USING (studiengang_kz)
						JOIN tbl_benutzer ON(public.tbl_student.student_uid = tbl_benutzer.uid)
					WHERE tbl_benutzer.aktiv = TRUE AND tbl_studiengang.aktiv = true AND (';

		foreach($stg_kz_arr as $index => $stg_kz) {
			if($index > 0) $query .= " OR ";
			$query .= "tbl_studiengang.studiengang_kz = {$stg_kz}";
		}

		$query .= ') ORDER by vorname, von DESC, akzeptiert DESC NULLS FIRST';

		return $this->execReadOnlyQuery($query);
	}
	
	public function checkZuordnungByDms($dms_id, $person_id = null)
	{
		$query = 'SELECT 1
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE dms_id = ?';

		$params = array($dms_id);
		
		if ($person_id !== null)
		{
			$query .= " AND person_id = ?";
			$params[] = $person_id;
		}

		return $this->execReadOnlyQuery($query, $params);
	}
	
	public function checkZuordnung($entschuldigung_id, $person_id)
	{
		$query = 'SELECT dms_id, person_id, entschuldigung_id
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE entschuldigung_id = ?
						AND person_id = ?
						AND akzeptiert IS NULL';

		return $this->execReadOnlyQuery($query, array($entschuldigung_id, $person_id));
	}

	public function getMailInfoForStudent($person_id) {
		$query = "SELECT tbl_person.vorname, tbl_person.nachname, tbl_student.student_uid, tbl_studiengang.email,
				   tbl_studiengang.bezeichnung, tbl_studiengang.kurzbzlang, tbl_studiengang.orgform_kurzbz, tbl_student.semester
			FROM tbl_person
				JOIN tbl_prestudent USING (person_id)
				JOIN tbl_studiengang USING (studiengang_kz)
				JOIN tbl_student USING(prestudent_id)
			WHERE person_id = ?
		";

		return $this->execReadOnlyQuery($query, [$person_id]);
	}
}