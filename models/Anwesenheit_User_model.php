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

	public function getAnwesenheitEntryByPrestudentIdDateLehreinheitId($prestudent_id, $le_id, $date)
	{
		$query = "
			SELECT *
			FROM extension.tbl_anwesenheit_user JOIN extension.tbl_anwesenheit USING (anwesenheit_id)
			WHERE prestudent_id = ? AND lehreinheit_id = ? AND extension.tbl_anwesenheit.von = ?
			ORDER BY von ASC;
		";

		return $this->execQuery($query, [$prestudent_id, $le_id, $date]);
	}

	public function addHistoryEntry($entry)
	{
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

		$updateResults = [];

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
					'notiz' => $entry->notiz,
					'updatevon' => getAuthUID(),
					'updateamum' => date('Y-m-d H:i:s')
				));

				if(isSuccess($result) && hasData($result)) {
					$updateResults[] = getData($result);
				}
			} else {
				$result = $this->update($entry->anwesenheit_user_id, array(
					'version' => $existing->version + 1,
					'status' => $entry->status,
					'updatevon' => getAuthUID(),
					'updateamum' => date('Y-m-d H:i:s')
				));

				if(isSuccess($result) && hasData($result)) {
					$updateResults[] = getData($result);
				}
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
			return success($updateResults);
		}

	}

	public function getEntschuldigungsstatusForPersonIds($personIds)
	{

		$query ='SELECT person_id, von, bis, akzeptiert
			FROM extension.tbl_anwesenheit_entschuldigung
			WHERE person_id IN ?
			ORDER BY von DESC';

		return $this->execReadOnlyQuery($query, array($personIds));

	}

	public function createNewUserAnwesenheitenEntries($le_id, $anwesenheit_id, $von, $bis, $insert_status, $entschuldigt_status)
	{
		$this->db->trans_start(false);

		// find every student not already having an anwesenheit for the check with given anwesenheit_id
		// and find if they have any accepted entschuldigungen in this timespan
		$query = "
			SELECT prestudent_id,
			    (SELECT entschuldigung.akzeptiert
					FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
					WHERE entschuldigung.person_id = public.tbl_prestudent.person_id
					AND ? >= entschuldigung.von AND ? <= entschuldigung.bis
					ORDER BY akzeptiert DESC NULLS LAST
					LIMIT 1
				) as statusAkzeptiert
			FROM campus.vw_student_lehrveranstaltung
				 JOIN public.tbl_student ON (uid = student_uid)
				 JOIN public.tbl_prestudent USING(prestudent_id)
				 JOIN public.tbl_benutzer USING(uid)
			WHERE lehreinheit_id = ? AND public.tbl_benutzer.aktiv = true;";

		$result = $this->execQuery($query, [$von, $bis, $le_id]);

		// and insert them with their respecting status
		if(hasData($result)) {
			$authid = getAuthUID();
			$now = $this->escape('NOW()');

			foreach ($result->retval as $entry) {
				$status = $entry->statusakzeptiert ? $entschuldigt_status : $insert_status;
				$result = $this->insert(array(
					'anwesenheit_id' => $anwesenheit_id,
					'prestudent_id' => $entry->prestudent_id,
					'status' => $status,
					'version' => 1,
					'statussetvon' => $authid,
					'statussetamum' => $now,
					'insertamum' => $now,
					'insertvon' => $authid
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
			return false;
		}
		else
		{
			$this->db->trans_commit();
			return true;
		}

	}

	public function getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz)
	{
		$query = "
			SELECT
				DISTINCT extension.tbl_anwesenheit_user.anwesenheit_user_id,
				Date(extension.tbl_anwesenheit.von) as datum,
				extension.tbl_anwesenheit_user.status,
				lehre.tbl_lehreinheit.lehreinheit_id,
				extension.tbl_anwesenheit.insertvon as kinsertvon,
				extension.tbl_anwesenheit.updatevon as kupdatevon,
				extension.tbl_anwesenheit_user.insertvon as ainsertvon,
				extension.tbl_anwesenheit_user.updateamum as aupdatevon,
				extension.tbl_anwesenheit.von, extension.tbl_anwesenheit.bis,
				extension.tbl_anwesenheit_user.notiz,
				CAST(extension.get_epoch_from_anw_times(extension.tbl_anwesenheit.von, extension.tbl_anwesenheit.bis) / 60 AS INTEGER ) AS dauer
			FROM extension.tbl_anwesenheit
					 JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
					 JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
					 JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
			WHERE studiensemester_kurzbz = ?
			  AND prestudent_id = ?
			  AND lehre.tbl_lehreinheit.lehrveranstaltung_id = ?
			ORDER BY datum DESC";

		return $this->execQuery($query, [$sem_kurzbz, $prestudent_id, $lv_id]);
	}

	// similar to "getAllAnwesenheitenByStudentByLva" but with less data fetched
	public function getAllAnwesenheitenByStudentByLvaForStudent($prestudent_id, $lv_id, $sem_kurzbz)
	{
		$query = "
			SELECT DISTINCT
			extension.tbl_anwesenheit_user.anwesenheit_user_id,
			Date(extension.tbl_anwesenheit.von) as datum,
			extension.tbl_anwesenheit_user.status,
			lehre.tbl_lehreinheit.lehreinheit_id,
			campus.vw_stundenplan.lehrform,
			campus.vw_stundenplan.lehrfach_bez,
			extension.tbl_anwesenheit.insertvon as kinsertvon,
			extension.tbl_anwesenheit.updatevon as kupdatevon,
			extension.tbl_anwesenheit.von, extension.tbl_anwesenheit.bis,
			extension.tbl_anwesenheit_user.notiz,
			extension.tbl_anwesenheit_user.insertvon as ainsertvon,
			extension.tbl_anwesenheit_user.updatevon as aupdatevon,
			CAST(extension.get_epoch_from_anw_times(extension.tbl_anwesenheit.von, extension.tbl_anwesenheit.bis) / 60 AS INTEGER ) AS dauer
		FROM extension.tbl_anwesenheit
				 JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
				 JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
				 JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
				 JOIN campus.vw_stundenplan USING (lehreinheit_id)
		WHERE studiensemester_kurzbz = ?
		  AND prestudent_id = ?
		  AND lehre.tbl_lehreinheit.lehrveranstaltung_id = ?
		ORDER BY datum DESC;";

		return $this->execReadOnlyQuery($query, [$sem_kurzbz, $prestudent_id, $lv_id]);
	}
	
	public function getAllAnwesenheitenByPersonId($person_id) {
		$query = "
			SELECT 
				lehrveranstaltung_id, lehreinheit_id, anwesenheit_id, anwesenheit_user_id, prestudent_id,
				von, bis, status, statussetvon, statussetamum, notiz, version, studiensemester_kurzbz, tbl_lehreinheit.lehrform_kurzbz,
				bezeichnung as le_bezeichnung,
			extension.tbl_anwesenheit_user.insertamum as anwinsam, extension.tbl_anwesenheit_user.insertvon as anwinsvon,
			extension.tbl_anwesenheit_user.updateamum as anwupdam, extension.tbl_anwesenheit_user.updatevon as anwupdvon,
			
			extension.tbl_anwesenheit_user.insertamum as koninsam, extension.tbl_anwesenheit_user.insertvon as koninsvon,
			extension.tbl_anwesenheit_user.updateamum as konupdam, extension.tbl_anwesenheit_user.updatevon as konupdvon
			
			FROM extension.tbl_anwesenheit
				JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
				JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
			WHERE prestudent_id IN (
				SELECT tbl_prestudent.prestudent_id
				FROM tbl_prestudent JOIN tbl_student USING (prestudent_id)
				WHERE tbl_prestudent.prestudent_id = tbl_student.prestudent_id
			AND person_id = ? )
			ORDER BY von ASC";

		return $this->execReadOnlyQuery($query, [$person_id]);
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
		$query = "SELECT extension.get_anwesenheiten_by_time(?, ?, ?) as sum";

		return $this->execQuery($query, [$prestudent_id, $lv_id, $sem_kurzbz]);
	}

	public function getAnwQuoteForPrestudentIds($prestudent_Ids, $lv_id, $sem_kurzbz)
	{
		$query = "
			SELECT prestudent_id, extension.get_anwesenheiten_by_time(prestudent_id, ?, ?) as sum
			FROM public.tbl_student
			WHERE prestudent_id IN ?";

		return $this->execQuery($query, [$lv_id, $sem_kurzbz, $prestudent_Ids]);
	}
	public function deleteUserAnwesenheitById($anwesenheit_user_id)
	{
		$query = "DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_user_id = ?";

		return $this->execQuery($query, [$anwesenheit_user_id]);
	}

	public function deleteUserAnwesenheitByIds($ids)
	{
		$query = "DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_user_id IN ?";

		return $this->execQuery($query, [$ids]);
	}

	public function deleteAllByAnwesenheitId($anwesenheit_id)
	{
		$query = "DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_id = ?";

		return $this->execQuery($query, [$anwesenheit_id]);
	}

	
	public function findLastDifferentStatus($prestudentIDs, $anwesenheit_id) {
		$query = "SELECT DISTINCT ON (prestudent_id)
						alias.prestudent_id as prestudent_id, alias.diff_status as status, alias.anwesenheit_user_id as anwesenheit_user_id, alias.notiz as notiz
					FROM (
							 SELECT
								 hist.prestudent_id,
								 hist.status AS diff_status,
								 curr.anwesenheit_user_id,
								 curr.notiz
							 FROM extension.tbl_anwesenheit_user_history hist
									  JOIN extension.tbl_anwesenheit_user curr ON hist.prestudent_id = curr.prestudent_id
							 WHERE hist.status IS DISTINCT FROM curr.status AND hist.prestudent_id IN ? AND hist.anwesenheit_id = ? AND curr.anwesenheit_id = ?
							 ORDER BY hist.version DESC
						 ) as alias";

		return $this->execReadOnlyQuery($query, [$prestudentIDs, $anwesenheit_id, $anwesenheit_id]);

	}
}