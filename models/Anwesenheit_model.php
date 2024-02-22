<?php

class Anwesenheit_model extends \DB_Model
{

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->dbTable = 'extension.tbl_anwesenheit';
        $this->pk = 'anwesenheit_id';
    }

	public function getAllAnwesenheitenByLektor($ma_uid, $lv_id, $sem_kurzbz)
	{
		$query = "
			SELECT *
			-- 	prestudent_id, vorname, nachname, lehreinheit_id, extension.tbl_anwesenheit_user.status,
			--        DATE(extension.tbl_anwesenheit.von)
			--        , sum
			FROM
				(SELECT DISTINCT vorname, nachname, prestudent_id,
								 students.lehrveranstaltung_id, students.lehreinheit_id,
								 students.semester,
								 students.verband
				FROM (
						  SELECT person_id, student_uid, prestudent_id, matrikelnr, uid,
								 lehrveranstaltung_id, lehreinheit_id, studiensemester_kurzbz,
								 campus.vw_student_lehrveranstaltung.studiengang_kz, campus.vw_student_lehrveranstaltung.semester,
								 verband, gruppe, vorname, nachname
						  FROM campus.vw_student_lehrveranstaltung
								   JOIN public.tbl_student ON (uid = student_uid)
								   JOIN public.tbl_benutzer USING (uid)
								   JOIN tbl_person USING (person_id)
						  WHERE studiensemester_kurzbz = '{$sem_kurzbz}' AND lehrveranstaltung_id = {$lv_id} AND verband != 'I'
					  ) students JOIN (
					 SELECT tbl_lehreinheit.lehrveranstaltung_id as lehrveranstaltung_id, lehreinheit_id,
							mitarbeiter_uid, lehreinheitgruppe_id, studiengang_kz,
							tbl_lehreinheit.studiensemester_kurzbz as studiensemester_kurzbz, gruppe, gruppe_kurzbz
					 FROM lehre.tbl_lehreinheitmitarbeiter
							  JOIN lehre.tbl_lehreinheitgruppe USING (lehreinheit_id)
							  JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
					 WHERE mitarbeiter_uid = '{$ma_uid}'
					   AND studiensemester_kurzbz = '{$sem_kurzbz}'
					   AND tbl_lehreinheit.lehrveranstaltung_id = {$lv_id}
				) lehrende
									  ON (students.lehrveranstaltung_id = lehrende.lehrveranstaltung_id)) lektorXstudents
					LEFT JOIN extension.tbl_anwesenheit USING (lehreinheit_id)
					LEFT JOIN extension.tbl_anwesenheit_user USING (prestudent_id)
			ORDER BY nachname ASC;
		";

		return $this->execQuery($query);
	}

	public function getAllPersonIdsForLE($le_id){
		$query = "
			SELECT person_id, prestudent_id FROM lehre.tbl_lehreinheit
				JOIN campus.vw_student_lehrveranstaltung USING (lehreinheit_id)
				JOIN tbl_student ON (tbl_student.student_uid = campus.vw_student_lehrveranstaltung.uid)
				JOIN tbl_prestudent USING (prestudent_id)
			WHERE lehreinheit_id = {$le_id} AND verband != 'I';
		";

		return $this->execQuery($query);
	}

	public function getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz)
	{
		$query="
			SELECT extension.tbl_anwesenheit.anwesenheit_id, Date(extension.tbl_anwesenheit.von) as datum, extension.tbl_anwesenheit_user.status
			FROM extension.tbl_anwesenheit
				JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
				JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
			WHERE studiensemester_kurzbz = '{$sem_kurzbz}' AND prestudent_id = {$prestudent_id} AND lehrveranstaltung_id = '{$lv_id}'
			ORDER BY datum ASC;
		";

		return $this->execQuery($query);
	}

	public function getAnwesenheitenCheckViewData($anwRow) {
		$query="
			SELECT vorname, nachname, bezeichnung, kurzbz, verband, foto
			FROM campus.vw_student_lehrveranstaltung
					 JOIN public.tbl_student ON (uid = student_uid)
					 JOIN public.tbl_benutzer USING (uid)
					 JOIN tbl_person USING (person_id)
			WHERE
			  lehreinheit_id = {$anwRow->lehreinheit_id}
			  AND prestudent_id = {$anwRow->prestudent_id};
		";

		return $this->execQuery($query);
	}

	public function getAllAnwesenheitenByLehreinheitByDate($le_id, $date){
		$query="
			SELECT *
			FROM extension.tbl_anwesenheit_user JOIN extension.tbl_anwesenheit USING (anwesenheit_id)
			WHERE lehreinheit_id = '{$le_id}' AND DATE(extension.tbl_anwesenheit.von) = '{$date}'
			ORDER BY von ASC;
		";

		return $this->execQuery($query);
	}

	public function getHoursForLE($le_id, $date)
	{
		// TODO: test how reliable this is in edge cases

		$query="
			SELECT * FROM (SELECT DISTINCT(stunde)
			FROM lehre.tbl_stundenplan JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
			WHERE lehreinheit_id = {$le_id} AND DATE(lehre.tbl_stundenplan.datum) = '{$date}')
				stunden JOIN lehre.tbl_stunde USING(stunde);
		";

		return $this->execQuery($query);
	}
	public function getLehreinheitAndLektorData($le_id, $ma_uid, $date)
	{
		$query="
			SELECT DISTINCT tbl_stundenplan.mitarbeiter_uid, bezeichnung, kurzbz, tbl_stundenplan.ort_kurzbz, beginn, ende
			FROM lehre.tbl_stundenplan JOIN lehre.tbl_stunde USING(stunde)
			JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
			JOIN lehre.tbl_lehrveranstaltung USING(lehrveranstaltung_id)
			WHERE
			lehreinheit_id = '{$le_id}'
			AND
			mitarbeiter_uid = '{$ma_uid}'
			AND datum = '{$date}'
		";

		return $this->execQuery($query);

	}


	public function getAllByStudent($student, $studiensemester)
	{
		$query = '
			SELECT tbl_lehrveranstaltung.bezeichnung,
				tbl_anwesenheit_status.status_kurzbz as status,
				(tbl_anwesenheit.von) as von,
				(tbl_anwesenheit.bis) as bis,
				CONCAT(get_anwesenheiten(tbl_anwesenheit_user.prestudent_id, tbl_lehrveranstaltung.lehrveranstaltung_id, tbl_lehreinheit.studiensemester_kurzbz), \'%\') as anwesenheit,
				(
					SELECT entschuldigung.akzeptiert
					FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
					WHERE entschuldigung.person_id = (
						SELECT tbl_prestudent.person_id
						FROM tbl_prestudent
						WHERE tbl_prestudent.prestudent_id = extension.tbl_anwesenheit_user.prestudent_id
							AND tbl_anwesenheit.von >= entschuldigung.von AND tbl_anwesenheit.bis <= entschuldigung.bis
					)
					ORDER BY akzeptiert DESC NULLS LAST
					LIMIT 1
				) as status_entschuldigung,
				(
					SELECT 1
					FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
					WHERE entschuldigung.person_id = (
						SELECT tbl_prestudent.person_id
						FROM tbl_prestudent
						WHERE tbl_prestudent.prestudent_id = extension.tbl_anwesenheit_user.prestudent_id
							AND tbl_anwesenheit.von >= entschuldigung.von AND tbl_anwesenheit.bis <= entschuldigung.bis
						)
					LIMIT 1
				) as exists_entschuldigung
			FROM extension.tbl_anwesenheit
				JOIN extension.tbl_anwesenheit_user ON tbl_anwesenheit.anwesenheit_id = tbl_anwesenheit_user.anwesenheit_id
				JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
				JOIN public.tbl_prestudent ON tbl_anwesenheit_user.prestudent_id = tbl_prestudent.prestudent_id
				JOIN public.tbl_person ON tbl_prestudent.person_id = tbl_person.person_id
				JOIN public.tbl_benutzer ON tbl_person.person_id = tbl_benutzer.person_id
				JOIN extension.tbl_anwesenheit_status ON tbl_anwesenheit_user.status = tbl_anwesenheit_status.status_kurzbz
			WHERE tbl_benutzer.uid = ? AND tbl_lehreinheit.studiensemester_kurzbz = ?
			ORDER BY tbl_lehrveranstaltung.bezeichnung, von, bis;
		';

		return $this->execReadOnlyQuery($query, array($student, $studiensemester));
	}

	public function updateAnwesenheiten($changedAnwesenheiten) {

		// TODO (johann) maybe there is a better way to update a set of entries?

		$this->db->trans_start(false);

		forEach ($changedAnwesenheiten as $entry) {
			$result = $this->update($entry->anwesenheit_id, array(
				'datum' => $entry->datum,
				'status' => $entry->status,
				'updateamum' => $this->escape('NOW()'),
				'updatevon' => getAuthUID()
			));

			if (isError($result)) {
				$this->db->trans_rollback();
				return error($result->msg, EXIT_ERROR);
			}
		}

		$this->db->trans_complete();

		// Check if everything went ok during the transaction
		if ($this->db->trans_status() === false || isError($result))
		{
			$this->db->trans_rollback();
			return error($result->msg, EXIT_ERROR);
		}
		else
		{
			$this->db->trans_commit();
			return success('Anwesenheiten successfully updated.');
		}

	}
	
	public function updateAnwesenheitenByDatesStudent($von, $bis, $person_id, $status)
	{
		$query = 'UPDATE extension.tbl_anwesenheit_user SET status = ?
					WHERE anwesenheit_id IN (
						SELECT extension.tbl_anwesenheit_user.anwesenheit_id
						FROM extension.tbl_anwesenheit_user
						JOIN extension.tbl_anwesenheit ON tbl_anwesenheit_user.anwesenheit_id = tbl_anwesenheit.anwesenheit_id
						WHERE von >= ?
							AND bis <= ?
							AND prestudent_id IN (
								SELECT prestudent_id
								FROM tbl_prestudent
								WHERE person_id = ?
							)
					)
					AND status != ?';
		
		return $this->execQuery($query, [$status, $von, $bis, $person_id, 'anwesend']);
	}

	public function createNewAnwesenheitenEntries($le_id, $von, $bis) {
		$this->db->trans_start(false);

		// get all students for LE not already having an anwesenheiten entry for that LE
		// on that date
		$query ="
			SELECT prestudent_id
			FROM campus.vw_student_lehrveranstaltung
					 JOIN public.tbl_student ON (uid = student_uid)
			WHERE lehreinheit_id = {$le_id} AND verband != 'I'
			AND NOT EXISTS(
				SELECT * FROM (SELECT prestudent_id
				FROM campus.vw_student_lehrveranstaltung
						 JOIN public.tbl_student ON (uid = student_uid)
				WHERE lehreinheit_id = {$le_id} AND verband != 'I') students
				JOIN extension.tbl_anwesenheit ON (
					lehreinheit_id = extension.tbl_anwesenheit.lehreinheit_id
					AND students.prestudent_id = extension.tbl_anwesenheit.prestudent_id
					)
				WHERE DATE(extension.tbl_anwesenheit.datum) = DATE(NOW())
			);";
		$result = $this->execQuery($query);

		// and insert them as abwesend
		if(hasData($result)) {

			forEach ($result->retval as $entry) {

				$result = $this->insert(array(
					'prestudent_id' => $entry->prestudent_id,
					'lehreinheit_id' => $le_id,
					'datum' => $this->escape('NOW()'),
					'status' => 'abw',
					'updateamum' => $this->escape('NOW()'),
					'updatevon' => getAuthUID(),
					'von' => $von,
					'bis' => $bis
				));

				if (!isSuccess($result)) {
					break;
				}
			}

		}

		$this->db->trans_complete();

		// Check if everything went ok during the transaction
		if ($this->db->trans_status() === false || isError($result))
		{
			$this->db->trans_rollback();
			return error($result->msg, EXIT_ERROR);
		}
		else
		{
			$this->db->trans_commit();
			return success('Anwesenheiten successfully inserted.');
		}
	}
}