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
		SELECT prestudent_id, vorname, nachname, lehreinheit_id, extension.tbl_anwesenheit.status, DATE(extension.tbl_anwesenheit.datum), sum FROM
			(SELECT DISTINCT vorname, nachname, prestudent_id,
			  students.lehrveranstaltung_id, students.lehreinheit_id,
			  students.semester, students.verband, extension.calculate_anwesenheiten_sum(students.lehrveranstaltung_id, prestudent_id, '{$sem_kurzbz}') AS sum
			FROM (
				SELECT person_id, student_uid, prestudent_id, matrikelnr, uid,
						 lehrveranstaltung_id, lehreinheit_id, studiensemester_kurzbz,
				   campus.vw_student_lehrveranstaltung.studiengang_kz, campus.vw_student_lehrveranstaltung.semester,
				   verband, gruppe, vorname, nachname
					FROM campus.vw_student_lehrveranstaltung
						JOIN public.tbl_student ON (uid = student_uid)
						JOIN public.tbl_benutzer USING (uid)
						JOIN tbl_person USING (person_id)
					WHERE studiensemester_kurzbz = '{$sem_kurzbz}' AND lehrveranstaltung_id = {$lv_id}
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
		JOIN extension.tbl_anwesenheit USING (prestudent_id, lehreinheit_id)
		ORDER BY nachname;
";

		return $this->execQuery($query);
	}

	public function getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz)
	{
		$query="
			SELECT extension.tbl_anwesenheit.anwesenheit_id, Date(extension.tbl_anwesenheit.datum) as datum, extension.tbl_anwesenheit.status
			FROM extension.tbl_anwesenheit
			JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
			JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
			WHERE studiensemester_kurzbz = '{$sem_kurzbz}' AND prestudent_id = {$prestudent_id} AND lehrveranstaltung_id = '{$lv_id}'
			ORDER BY datum ASC;
";

		return $this->execQuery($query);
	}

//    /**
//     * Creates new Anwesenheit.
//     * Saves new Anwesenheit and sets Anrechnungstatus for the new Anrechnung.
//     *
//     * @param $prestudent_id
//     * @param $lehreinheit_id
//     * @param $status
//     * @return array
//     */
//    public function createAnrechnungsantrag(
//        $prestudent_id, $lehreinheit_id, $status
//    )
//    {
//        // Start DB transaction
//        $this->db->trans_start(false);
//
//        // Save Anwesenheit
//        $result = $this->AnwesenheitModel->insert(array(
//            'prestudent_id' => $prestudent_id,
//            'lehreinheit_id' => $lehreinheit_id,
//            'status' => $status,
//            'insertvon' => $this->_uid
//        ));
//
//        // Store just inserted Anwesenheit ID
//        $lastInsert_anwesenheit_id = $result->retval;
//
//        // Save Anwesenheitstatus
//        $this->AnwesenheitModel->saveAnwesenheit($lastInsert_anwesenheit_id, $lehreinheit_id, $status);
//
//        // Transaction complete
//        $this->db->trans_complete();
//
//        if ($this->db->trans_status() === false)
//        {
//            $this->db->trans_rollback();
//            return error('Failed inserting Anwesenheit', EXIT_ERROR);
//        }
//
//        return success($lastInsert_anwesenheit_id);
//    }
//
//    public function saveAnwesenheit($lastInsert_anwesenheit_id, $lehreinheit_id, $status)
//    {
//        $qry = '
//			INSERT INTO extension.tbl_anwesenheit (
//			    lastInsert_anwesenheit_id, lehreinheit_id, status, insertvon
//			) VALUES ( ?, ?, ?, ?);
//		';
//
//        return $this->execQuery($qry, array($lastInsert_anwesenheit_id, $lehreinheit_id, $status, getAuthUID()));
//    }
//
//    /**
//     * Delete Anwesenheitstatus.
//     *
//     * @param $anwesenheitstatus_id
//     */
//    public function deleteAnwesenheitstatus($status_kurzbz){
//
//        $qry = '
//			DELETE FROM extension.tbl_anwesenheit_status
//			WHERE status_kurzbz = ?
//		';
//
//        return $this->execQuery($qry, array($status_kurzbz));
//    }

	public function getAllByStudent($student, $studiensemester)
	{
		$query = '
			SELECT tbl_lehrveranstaltung.bezeichnung,
					tbl_anwesenheit_status.bezeichnung as status,
					DATE(tbl_anwesenheit.datum) as datum,
					CONCAT(get_anwesenheiten(tbl_anwesenheit.prestudent_id, tbl_lehrveranstaltung.lehrveranstaltung_id, tbl_lehreinheit.studiensemester_kurzbz), \'%\') as anwesenheit
			FROM extension.tbl_anwesenheit
				JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
				JOIN public.tbl_prestudent ON tbl_anwesenheit.prestudent_id = tbl_prestudent.prestudent_id
				JOIN public.tbl_person ON tbl_prestudent.person_id = tbl_person.person_id
				JOIN public.tbl_benutzer ON tbl_person.person_id = tbl_benutzer.person_id
				JOIN extension.tbl_anwesenheit_status ON tbl_anwesenheit.status = tbl_anwesenheit_status.status_kurzbz
			WHERE tbl_benutzer.uid = ? AND tbl_lehreinheit.studiensemester_kurzbz = ?
			ORDER BY tbl_lehrveranstaltung.bezeichnung, datum;
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

			if (!isSuccess($result)) {
				break;
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

}