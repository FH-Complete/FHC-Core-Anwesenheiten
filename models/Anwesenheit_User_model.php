<?php

class Anwesenheit_User_model extends \DB_Model
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		$this->dbTable = 'extension.tbl_anwesenheit_user';
		$this->pk = 'anwesenheit_user_id';
	}

	public function getAnwesenheitEntryByPrestudentIdDateLehreinheitId($prestudent_id, $le_id, $date) {
		$query = "
			SELECT *
			FROM extension.tbl_anwesenheit_user JOIN extension.tbl_anwesenheit USING (anwesenheit_id)
			WHERE prestudent_id = ? AND lehreinheit_id = ? AND DATE(extension.tbl_anwesenheit.von) = ?
			ORDER BY von ASC;
		";

		return $this->execQuery($query, [$prestudent_id, $le_id, $date]);
	}

	public function addHistoryEntry($entry){
		$query = "
			INSERT INTO extension.tbl_anwesenheit_user_history (
			    anwesenheit_user_id,
			    anwesenheit_id, 
			    prestudent_id, 
			    status,
			    statussetvon,
			    statussetamum,
			    notiz,
			    version,
			    insertamum,
			    insertvon,
			    updateamum,
			    updatevon
			) VALUES (
			    ?,
			    ?,
			    ?,
			    ?,
			    ?,
			    ?,
			    ?,
			    ?,
			    ?,
			    ?,
			    ?,
			    ?
			)
		";

		$this->execQuery($query,[
			$entry->anwesenheit_user_id,
			$entry->anwesenheit_id,
			$entry->prestudent_id,
			$entry->status,
			$entry->statussetvon,
			$entry->statussetamum,
			$entry->notiz,
			$entry->version,
			$entry->insertamum,
			$entry->insertvon,
			$entry->updateamum,
			$entry->updatevon]);
	}

	public function updateAnwesenheiten($changedAnwesenheiten, $manualUpdate = false)
	{
		$this->db->trans_start(false);

		foreach ($changedAnwesenheiten as $entry) {
			$existingResult = $this->load($entry->anwesenheit_user_id);
			if(isError($existingResult)) {
				$this->db->trans_rollback();
				return error($existingResult->msg, EXIT_ERROR);
			}

			$existing = getData($existingResult)[0];

			if($manualUpdate === true){
				$this->addHistoryEntry($existing);
			}

			if(property_exists($entry, 'notiz')) {

				$result = $this->update($entry->anwesenheit_user_id, array(
					'version' => $existing->version + 1,
					'status' => $entry->status,
					'notiz' => $entry->notiz
				));
			} else {
				$result = $this->update($entry->anwesenheit_user_id, array(
					'version' => $existing->version + 1,
					'status' => $entry->status
				));
			}


			if (isError($result)) {
				$this->db->trans_rollback();
				return error($result->msg, EXIT_ERROR);
			}
		}

		$this->db->trans_complete();

		// Check if everything went ok during the transaction
		if ($this->db->trans_status() === false || isError($result)) {
			$this->db->trans_rollback();
			return error($result->msg, EXIT_ERROR);
		} else {
			$this->db->trans_commit();
			return success('Anwesenheiten successfully updated.');
		}

	}

	public function getEntschuldigungsstatusForPersonIdsOnDate($personIds) {


		$query ='SELECT person_id, von, bis
			FROM extension.tbl_anwesenheit_entschuldigung
			WHERE person_id IN ? AND akzeptiert = true;';

		return $this->execReadOnlyQuery($query, array($personIds));

	}

	public function createNewUserAnwesenheitenEntries($le_id, $anwesenheit_id, $von, $bis, $abwesend_status, $entschuldigt_status)
	{
		$this->db->trans_start(false);

		// find every student not already having an anwesenheit for the check with given anwesenheit_id
		// and find if they have any accepted entschuldigungen in this timespan
		$query = "
			SELECT prestudent_id, (
				SELECT entschuldigung.akzeptiert
					FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
					WHERE entschuldigung.person_id = (
						SELECT tbl_prestudent.person_id
						FROM tbl_prestudent
						WHERE tbl_prestudent.prestudent_id = tbl_student.prestudent_id
							AND ? >= entschuldigung.von AND ? <= entschuldigung.bis
					)
					ORDER BY akzeptiert DESC NULLS LAST
					LIMIT 1
				) as statusAkzeptiert,
				(
				   SELECT 1
				   FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
				   WHERE entschuldigung.person_id = (
					   SELECT tbl_prestudent.person_id
					   FROM tbl_prestudent
					   WHERE tbl_prestudent.prestudent_id = tbl_student.prestudent_id
						 AND ? >= entschuldigung.von AND ? <= entschuldigung.bis
				   )
				   LIMIT 1
				) as exists_entschuldigung
			FROM campus.vw_student_lehrveranstaltung
				 JOIN public.tbl_student ON (uid = student_uid)
			WHERE lehreinheit_id = ?
			
			AND prestudent_id NOT IN(
				SELECT students.prestudent_id as prestudent_id FROM
					extension.tbl_anwesenheit JOIN extension.tbl_anwesenheit_user USING (anwesenheit_id)
											  JOIN
			
				(SELECT prestudent_id
				 FROM campus.vw_student_lehrveranstaltung
						  JOIN public.tbl_student ON (uid = student_uid)
				 WHERE lehreinheit_id = ?) students USING(prestudent_id)
			WHERE anwesenheit_id = ?);
		";

		$result = $this->execQuery($query, [$von, $bis, $von, $bis, $le_id, $le_id, $anwesenheit_id]);

		// and insert them with their respecting status
		if(hasData($result)) {

			forEach ($result->retval as $entry) {
				$status = $entry->exists_entschuldigung && $entry->statusakzeptiert ? $entschuldigt_status : $abwesend_status;
				$result = $this->insert(array(
					'anwesenheit_id' => $anwesenheit_id,
					'prestudent_id' => $entry->prestudent_id,
					'status' => $status,
					'version' => 1,
					'statussetvon' => getAuthUID(),
					'statussetamum' => $this->escape('NOW()'),
					'insertamum' => $this->escape('NOW()'),
					'insertvon' => getAuthUID()
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

	public function getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz)
	{
		$query = "
			SELECT extension.tbl_anwesenheit_user.anwesenheit_user_id, Date(extension.tbl_anwesenheit.von) as datum, extension.tbl_anwesenheit_user.status,
			       extension.tbl_anwesenheit.von, extension.tbl_anwesenheit.bis, extension.tbl_anwesenheit_user.notiz
			FROM extension.tbl_anwesenheit
				JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
				JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
			WHERE studiensemester_kurzbz = ? AND prestudent_id = ? AND lehrveranstaltung_id = ?
			ORDER BY datum DESC;
		";

		return $this->execQuery($query, [$sem_kurzbz, $prestudent_id, $lv_id]);
	}

	public function getAllForKontrolle($anwesenheit_id)
	{
		$query = "
			SELECT *
			FROM extension.tbl_anwesenheit_user
			WHERE anwesenheit_id = ?
		";

		return $this->execQuery($query, [$anwesenheit_id]);
	}

	public function getAnwesenheitenCheckViewData($prestudent_id, $lehreinheit_id)
	{
		$query = "
			SELECT vorname, nachname, bezeichnung, kurzbz, verband
			FROM campus.vw_student_lehrveranstaltung
					 JOIN public.tbl_student ON (uid = student_uid)
					 JOIN public.tbl_benutzer USING (uid)
					 JOIN tbl_person USING (person_id)
			WHERE
			  lehreinheit_id = ?
			  AND prestudent_id = ?;
		";

		return $this->execQuery($query, [$lehreinheit_id, $prestudent_id]);
	}

	public function getAnwesenheitSumByLva($prestudent_id, $lv_id, $sem_kurzbz)
	{
		$query = "SELECT get_anwesenheiten_by_time(?, ?, ?) as sum";

		return $this->execQuery($query, [$prestudent_id, $lv_id, $sem_kurzbz]);
	}

	public function getAnwQuoteForPrestudentIds($prestudent_Ids, $lv_id, $sem_kurzbz)
	{
		$query = "
			SELECT prestudent_id, get_anwesenheiten_by_time(prestudent_id, {$lv_id}, '{$sem_kurzbz}') as sum
			FROM public.tbl_student
			WHERE prestudent_id IN ?";

		return $this->execQuery($query, [$prestudent_Ids]);
	}
	public function deleteUserAnwesenheitById($anwesenheit_user_id)
	{
		$query = "DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_user_id = {$anwesenheit_user_id}";

		return $this->execQuery($query);
	}

	public function deleteUserAnwesenheitByIds($ids)
	{
		$query = "DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_user_id IN ?";

		return $this->execQuery($query, [$ids]);
	}

	public function deleteAllByAnwesenheitId($anwesenheit_id)
	{
		$query = "DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_id = {$anwesenheit_id}";

		return $this->execQuery($query);
	}

}