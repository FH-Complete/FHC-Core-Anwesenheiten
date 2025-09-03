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

	public function getAllUncoveredAnwesenheitenInTimespan($entschuldigung_id, $person_id, $von, $bis) {
		
		$query = 'SELECT anwesenheit_user_id FROM extension.tbl_anwesenheit JOIN extension.tbl_anwesenheit_user USING (anwesenheit_id)
				WHERE von >= ?
					AND bis <= ?
					AND prestudent_id IN (
						SELECT tbl_prestudent.prestudent_id
						FROM tbl_prestudent JOIN tbl_student USING (prestudent_id)
						WHERE tbl_prestudent.prestudent_id = tbl_student.prestudent_id
					  	AND person_id = ?
				)
				EXCEPT
				SELECT anwesenheit_user_id
				FROM
					(SELECT anwesenheit_id, extension.tbl_anwesenheit.von as kVon,
							extension.tbl_anwesenheit.bis as kBis,
							andereEntsch.von as eVon,
							andereEntsch.bis as eBis, pid
					FROM extension.tbl_anwesenheit
					JOIN
			
						(SELECT extension.tbl_anwesenheit_entschuldigung.*, person_id as pid, student_uid, prestudent_id
						FROM extension.tbl_anwesenheit_entschuldigung
							JOIN tbl_benutzer USING (person_id)
							JOIN tbl_student ON (tbl_benutzer.uid = tbl_student.student_uid)
						WHERE person_id = ?
						AND (
							von <= ?
							OR bis >= ?)
						AND akzeptiert = true
						AND entschuldigung_id != ?) AS andereEntsch
						ON (
							andereEntsch.von <= extension.tbl_anwesenheit.von
							  AND
							andereEntsch.bis >= extension.tbl_anwesenheit.bis
							)
				
					) AS gedeckteAnwesenheiten
				JOIN extension.tbl_anwesenheit_user USING (anwesenheit_id)';

		return $this->execReadOnlyQuery($query, array($von, $bis, $person_id, $person_id, $von, $bis, $entschuldigung_id));
	}

	public function getEntschuldigungenByPerson($person_id)
	{
		$query = 'SELECT dms_id, von, bis, akzeptiert, entschuldigung_id, notiz, person_id, statussetvon, statussetamum, version, insertamum, insertvon, updateamum, updatevon
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE person_id = ?
					ORDER by von DESC, akzeptiert DESC NULLS LAST';

		return $this->execReadOnlyQuery($query, array($person_id));
	}
	
	// when changing anw kontrolle von - bis zeiten, compare if a student has different entschuldigt
	// status between to timespans -> update this students anw_user entries 
	public function compareStatusZeitenForLE($vonNew, $bisNew, $vonOld, $bisOld, $le_id) {
		$qry = 'SELECT * FROM (
			SELECT prestudent_id,
				 (SELECT entschuldigung.akzeptiert
				  FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
				  WHERE entschuldigung.person_id = public.tbl_prestudent.person_id
					AND ? >= entschuldigung.von AND ? <= entschuldigung.bis
				  ORDER BY akzeptiert DESC NULLS LAST
				  LIMIT 1
				 ) as statusAkzeptiertNew,
				 (SELECT entschuldigung.akzeptiert
				  FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
				  WHERE entschuldigung.person_id = public.tbl_prestudent.person_id
					AND ? >= entschuldigung.von AND ? <= entschuldigung.bis
				  ORDER BY akzeptiert DESC NULLS LAST
				  LIMIT 1
				 ) as statusAkzeptiertOld
			FROM campus.vw_student_lehrveranstaltung
				   JOIN public.tbl_student ON (uid = student_uid)
				   JOIN public.tbl_prestudent USING(prestudent_id)
			WHERE lehreinheit_id = ?
					  ) as alias
		WHERE statusAkzeptiertNew IS DISTINCT FROM statusAkzeptiertOld';

		return $this->execReadOnlyQuery($qry, array($vonNew, $bisNew, $vonOld, $bisOld, $le_id));
	}
	
	

	public function getEntschuldigungenForStudiengaenge($stg_kz_arr, $von, $bis)
	{
		$params = [$stg_kz_arr];
		$query = "SELECT DISTINCT ON (dms_id,
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
						extension.tbl_anwesenheit_entschuldigung.akzeptiert as akzeptiert,
						extension.tbl_anwesenheit_entschuldigung.notiz as notiz,
						public.tbl_studiengang.studiengang_kz as studiengang_kz,
						public.tbl_studiengang.bezeichnung as bezeichnung,
						public.tbl_studiengang.kurzbzlang as kurzbzlang,
						public.tbl_studiengang.orgform_kurzbz as orgform_kurzbz,
						status.orgform_kurzbz as studentorgform,
						TO_CHAR(extension.tbl_anwesenheit_entschuldigung.insertamum, 'YYYY-MM-DD HH24:MI:00') as uploaddatum,
						public.tbl_student.semester as semester
					FROM extension.tbl_anwesenheit_entschuldigung
						JOIN public.tbl_person ON extension.tbl_anwesenheit_entschuldigung.person_id = public.tbl_person.person_id
						JOIN public.tbl_prestudent ON (public.tbl_person.person_id = public.tbl_prestudent.person_id)
						JOIN public.tbl_prestudentstatus status USING(prestudent_id)
						JOIN public.tbl_student USING (prestudent_id, studiengang_kz)
						JOIN public.tbl_studiengang USING (studiengang_kz)
						JOIN lehre.tbl_studienplan stpl USING(studienplan_id)
						JOIN public.tbl_studiensemester sem USING(studiensemester_kurzbz)
						JOIN tbl_benutzer ON(public.tbl_student.student_uid = tbl_benutzer.uid)
					WHERE tbl_benutzer.aktiv = TRUE AND tbl_studiengang.aktiv = true AND tbl_studiengang.studiengang_kz IN ? ";

		// $von & $bis are not clearable in UI but once were...
		// used to be von/bis >=/<= ?
		if($von) {
			$query.= 'AND Date(extension.tbl_anwesenheit_entschuldigung.insertamum) >= ? ';
			$params[] = $von;
		}
		if($bis) {
			$query.= 'AND Date(extension.tbl_anwesenheit_entschuldigung.insertamum) <= ? ';
			$params[] = $bis;
		}

		$query.='ORDER by vorname, von DESC, akzeptiert DESC NULLS FIRST';

		return $this->execReadOnlyQuery($query, $params);
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
			   tbl_studiengang.bezeichnung, tbl_studiengang.kurzbzlang, 
			   tbl_studiengang.orgform_kurzbz, tbl_student.semester, tbl_prestudent.dual,
			public.tbl_studiensemester.studiensemester_kurzbz, public.tbl_studiensemester.start
		FROM public.tbl_person
				 JOIN public.tbl_prestudent USING (person_id)
				 JOIN public.tbl_studiengang USING (studiengang_kz)
				 JOIN public.tbl_student USING(prestudent_id)
				 JOIN public.tbl_studentlehrverband USING(student_uid)
				 JOIN public.tbl_studiensemester USING(studiensemester_kurzbz)
		WHERE public.tbl_student.semester > 0 AND person_id = ?
		ORDER BY public.tbl_studiensemester.start DESC
		LIMIT 1";

		return $this->execReadOnlyQuery($query, [$person_id]);
	}

	/**
	 * Expects parameter '$anw_user_ids'
	 * Checks if anw_user_entries are linked to an exam kontrolle that has been held in the past relative to entschuldigung uploaddatum.
	 */
	public function checkForExam($anw_user_ids, $uploaddatum) {
		$query = "SELECT anwesenheit_user_id
				  FROM extension.tbl_anwesenheit_user 
						JOIN extension.tbl_anwesenheit USING(anwesenheit_id)
						JOIN lehre.tbl_lehreinheit USING(lehreinheit_id) 
				  WHERE lehrform_kurzbz = 'EXAM' AND anwesenheit_user_id IN ? AND DATE(von) < DATE(?)";

		return $this->execReadOnlyQuery($query, [$anw_user_ids, $uploaddatum]);
	}

	/**
	 * this query loads all user anwesenheiten entries of a person
	 * where the person has an entschuldigung in akzeptiert state but also a kontrolle
	 * of a lehreinheit that is still marked as abwesend. This should only ever happen
	 * if the lehreinheit in question is of Lehrform EXAM and the INSERTAMUM field of entschuldigung (which is set
	 * when declaring an entschuldigung, not when uploading the document) is after the kontrolle von date (kvon in this query).
	 */
	public function getExamEntriesIgnoredByEntschuldigungenForPerson($person_id) {

		$query = "SELECT DISTINCT ON (tbl_anwesenheit_user.anwesenheit_id, tbl_anwesenheit_user.anwesenheit_user_id) 
			anwesenheit_id, tbl_anwesenheit_user.anwesenheit_user_id,
			extension.tbl_anwesenheit_user.status as konAnwesend, extension.tbl_anwesenheit.von as kVon,
			extension.tbl_anwesenheit.bis as kBis,
			akzeptierteEntsch.von as eVon,
			akzeptierteEntsch.bis as eBis, pid, akzeptierteEntsch.entschuldigung_id as entid, akzeptierteEntsch.akzeptiert as entAkzeptiert
		FROM extension.tbl_anwesenheit
				 JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
				 JOIN
		(SELECT extension.tbl_anwesenheit_entschuldigung.*, person_id as pid, student_uid, prestudent_id
			FROM extension.tbl_anwesenheit_entschuldigung
					 JOIN public.tbl_benutzer USING (person_id)
					 JOIN public.tbl_student ON (public.tbl_benutzer.uid = public.tbl_student.student_uid)
			WHERE
				person_id = ? AND
				akzeptiert = true) AS akzeptierteEntsch
			ON (
				akzeptierteEntsch.von <= extension.tbl_anwesenheit.von
				AND
				akzeptierteEntsch.bis >= extension.tbl_anwesenheit.bis
				AND extension.tbl_anwesenheit_user.prestudent_id IN (
				SELECT public.tbl_prestudent.prestudent_id
				FROM public.tbl_prestudent JOIN public.tbl_student USING (prestudent_id)
				WHERE public.tbl_prestudent.prestudent_id = public.tbl_student.prestudent_id
				AND person_id = ?
				)
			)
		WHERE extension.tbl_anwesenheit_user.status = 'abwesend'";

		return $this->execReadOnlyQuery($query, [$person_id, $person_id]);
	}
}