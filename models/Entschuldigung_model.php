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
	
	// FROM and WHERE of the entschuldigungsmanagement table. The count query uses the same
	// part, so the count and the table always select the same entschuldigungen
	private function _fromStudiengaenge()
	{
		return "FROM extension.tbl_anwesenheit_entschuldigung
					JOIN public.tbl_person ON extension.tbl_anwesenheit_entschuldigung.person_id = public.tbl_person.person_id
					JOIN public.tbl_prestudent ON (public.tbl_person.person_id = public.tbl_prestudent.person_id)
					JOIN public.tbl_prestudentstatus status USING(prestudent_id)
					JOIN public.tbl_student USING (prestudent_id, studiengang_kz)
					JOIN public.tbl_studiengang USING (studiengang_kz)
					JOIN public.tbl_studiensemester sem USING(studiensemester_kurzbz)
					JOIN tbl_benutzer ON(public.tbl_student.student_uid = tbl_benutzer.uid)
					LEFT JOIN campus.tbl_dms_version USING(dms_id)
				WHERE tbl_benutzer.aktiv = TRUE AND tbl_studiengang.aktiv = true AND tbl_studiengang.studiengang_kz IN ? ";
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
						TO_CHAR(extension.tbl_anwesenheit_entschuldigung.insertamum, 'YYYY-MM-DD HH24:MI:00') as entuploaddatum,
						TO_CHAR(campus.tbl_dms_version.insertamum, 'YYYY-MM-DD HH24:MI:00') as fileuploaddatum,
						public.tbl_student.semester as semester
					" . $this->_fromStudiengaenge();

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
	
	// open entschuldigungen: anzahl counts the ones with an antragsdatum outside von - bis, the table does
	// not load them. von and bis give the antragsdatum range of all open ones, so the frontend can load them all
	public function getOffeneTimespan($stg_kz_arr, $von, $bis)
	{
		// like getEntschuldigungenForStudiengaenge: a missing date is no limit, nothing lies outside on that side
		$outside = 'FALSE';
		$params = [];
		if($von) {
			$outside.= ' OR Date(extension.tbl_anwesenheit_entschuldigung.insertamum) < ?';
			$params[] = $von;
		}
		if($bis) {
			$outside.= ' OR Date(extension.tbl_anwesenheit_entschuldigung.insertamum) > ?';
			$params[] = $bis;
		}
		$params[] = $stg_kz_arr;

		$query = "SELECT COUNT(DISTINCT CASE WHEN " . $outside . " THEN tbl_anwesenheit_entschuldigung.entschuldigung_id END) AS anzahl,
						MIN(Date(extension.tbl_anwesenheit_entschuldigung.insertamum)) AS von,
						MAX(Date(extension.tbl_anwesenheit_entschuldigung.insertamum)) AS bis
					" . $this->_fromStudiengaenge() . "
						AND extension.tbl_anwesenheit_entschuldigung.akzeptiert IS NULL";

		return $this->execReadOnlyQuery($query, $params);
	}

	// active student accounts of the persons with their studiengang and the orgform of the last status
	// (same order as Prestudentstatus_model::getLastStatus), one row per account in the order of the uids
	public function getStudentAccountsForPersons($person_ids)
	{
		$query = 'SELECT tbl_benutzer.person_id, tbl_benutzer.uid, tbl_student.studiengang_kz, tbl_studiengang.kurzbzlang, tbl_studiengang.bezeichnung,
						(SELECT tbl_prestudentstatus.orgform_kurzbz
							FROM public.tbl_prestudentstatus
							WHERE tbl_prestudentstatus.prestudent_id = tbl_student.prestudent_id
							ORDER BY datum DESC, insertamum DESC, ext_id DESC
							LIMIT 1) AS orgform_kurzbz
					FROM public.tbl_student
						JOIN public.tbl_benutzer ON (tbl_student.student_uid = tbl_benutzer.uid)
						JOIN public.tbl_studiengang USING (studiengang_kz)
					WHERE tbl_benutzer.aktiv = TRUE
						AND tbl_benutzer.person_id IN ?
					ORDER BY tbl_benutzer.uid';

		return $this->execReadOnlyQuery($query, array($person_ids));
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
		// need all columns for history anyway
		$query = 'SELECT *
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE entschuldigung_id = ?
						AND person_id = ?
						AND akzeptiert IS NULL';

		return $this->execReadOnlyQuery($query, array($entschuldigung_id, $person_id));
	}
	
	public function getMailInfoForStudent($person_id) {
		$query ="
		SELECT vorname, nachname, person_id, tbl_benutzer.uid, tbl_studiengang.bezeichnung, tbl_studiengang.kurzbzlang, tbl_student.semester,
			tbl_studiengang.email,
				 (
				 SELECT
					 COALESCE(tbl_studienplan.orgform_kurzbz, 
			tbl_prestudentstatus.orgform_kurzbz, tbl_studiengang.orgform_kurzbz) as 
			orgform
				 FROM
					 public.tbl_prestudent
					 JOIN public.tbl_prestudentstatus USING(prestudent_id)
					 JOIN public.tbl_studiensemester USING(studiensemester_kurzbz)
					 JOIN public.tbl_studiengang USING(studiengang_kz)
					 LEFT JOIN lehre.tbl_studienplan USING(studienplan_id)
				 WHERE
					 prestudent_id=tbl_student.prestudent_id
				 ORDER BY tbl_prestudentstatus.datum DESC LIMIT 1
				 ) as orgform
			FROM
				 public.tbl_benutzer
				 JOIN public.tbl_student ON(uid = student_uid)
				 JOIN public.tbl_studiengang USING(studiengang_kz)
				 JOIN public.tbl_person USING(person_id)
			WHERE
				 tbl_benutzer.aktiv
				 AND person_id = ?
		";

		return $this->execReadOnlyQuery($query, [$person_id]);
	}
	
	// used for autodecline job - filters for old applications still missing their attachment and which would
	// have applied for a past timeframe
	public function findOlderThanInterval($interval) {
		$query = "SELECT *
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE akzeptiert IS NULL
						AND insertamum <= NOW() - INTERVAL ?
						AND dms_id IS null
						AND bis <= NOW()";

		return $this->execReadOnlyQuery($query, [$interval]);
	}

	// used to detect entschuldigungen older than a certain date to send stg assistenz an email to remind them to
	// manually set the status declined if they think it should be declined. 
	public function findOlderThanDateIntervalMissingUploads($dateTime) {
		$query = "SELECT *
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE akzeptiert IS NULL
						AND insertamum <= ?
						AND dms_id IS null";

		return $this->execReadOnlyQuery($query, [$dateTime]);
	}
}