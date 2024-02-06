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

	public function getAllAnwesenheitenByLektor($ma_uid, $lv_id, $sem_kurzbz) {
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
	JOIN extension.tbl_anwesenheit USING (prestudent_id, lehreinheit_id);
";

//		, extension.calculate_anwesenheiten_sum(lehrveranstaltung_id, prestudent_id)

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

}