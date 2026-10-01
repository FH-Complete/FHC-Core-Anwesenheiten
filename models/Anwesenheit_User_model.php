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
			    fehlminuten,
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
			$entry->fehlminuten,
			$entry->version,
			$entry->insertamum,
			$entry->insertvon,
			$entry->updateamum,
			$entry->updatevon]);
	}

	/**
	 * fehlminuten count for status $verspaetetStatus only. An entry with that status sets them,
	 * a change to another status clears them. An unchanged status keeps them (e.g. a notiz edit).
	 */
	public function updateAnwesenheiten($changedAnwesenheiten, $manualUpdate = false, $verspaetetStatus = null)
	{
		if (!is_array($changedAnwesenheiten) || !count($changedAnwesenheiten))
			return success([]);

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

			$fields = array(
				'version' => $existing->version + 1,
				'status' => $entry->status,
				'updatevon' => getAuthUID(),
				'updateamum' => date('Y-m-d H:i:s')
			);
			if(property_exists($entry, 'notiz')) $fields['notiz'] = $entry->notiz;

			if($verspaetetStatus !== null) {
				if($entry->status === $verspaetetStatus) {
					if(property_exists($entry, 'fehlminuten')) $fields['fehlminuten'] = (int) $entry->fehlminuten;
				} elseif($entry->status !== $existing->status) {
					$fields['fehlminuten'] = 0;
				}
			}

			$result = $this->update($entry->anwesenheit_user_id, $fields);

			if (isError($result)) {
				$this->db->trans_rollback();
				return error($result->msg, EXIT_ERROR);
			}

			if(hasData($result)) {
				$updateResults[] = getData($result);
			}
		}

		// trans_complete already commits or rolls back. no explicit trans_commit/trans_rollback
		// after it: inside a caller transaction that would end the outer transaction early
		$this->db->trans_complete();

		// Check if everything went ok during the transaction
		if ($this->db->trans_status() === false) {
			return error('error during updateAnwesenheiten transaction', EXIT_ERROR);
		}

		return success($updateResults);
	}

	/**
	 * counts how many of the given anwesenheit_user entries do NOT belong to the given lehreinheit
	 * (used to reject updates on foreign entries)
	 */
	public function countEntriesNotInLehreinheit($anwesenheit_user_ids, $le_id)
	{
		$query = "SELECT COUNT(*) AS cnt
			FROM extension.tbl_anwesenheit_user
				JOIN extension.tbl_anwesenheit USING (anwesenheit_id)
			WHERE anwesenheit_user_id IN ? AND lehreinheit_id <> ?";

		return $this->execReadOnlyQuery($query, [$anwesenheit_user_ids, $le_id]);
	}

	/**
	 * loads the duration of the kontrolle of each given entry in minutes, as the quote counts it
	 * (used to check the fehlminuten of an entry)
	 */
	public function getKontrollDauerForIds($anwesenheit_user_ids)
	{
		$query = "SELECT anwesenheit_user_id,
				CAST(extension.get_epoch_from_anw_times(von, bis) / 60 AS INTEGER) AS dauer
			FROM extension.tbl_anwesenheit_user
				JOIN extension.tbl_anwesenheit USING (anwesenheit_id)
			WHERE anwesenheit_user_id IN ?";

		return $this->execReadOnlyQuery($query, [$anwesenheit_user_ids]);
	}

	/**
	 * loads the entry of the kontrolle with the most fehlminuten that do not fit its counted duration
	 * and the name of its student (used to keep the kontrolle longer than these minutes when its times change)
	 */
	public function getFehlminutenLongerThanKontrolle($anwesenheit_id, $verspaetetStatus)
	{
		$query = "SELECT u.fehlminuten, p.vorname, p.nachname
			FROM extension.tbl_anwesenheit_user u
				JOIN extension.tbl_anwesenheit k USING (anwesenheit_id)
				JOIN public.tbl_prestudent USING (prestudent_id)
				JOIN public.tbl_person p USING (person_id)
			WHERE u.anwesenheit_id = ? AND u.status = ?
				AND u.fehlminuten >= CAST(extension.get_epoch_from_anw_times(k.von, k.bis) / 60 AS INTEGER)
			ORDER BY u.fehlminuten DESC
			LIMIT 1";

		return $this->execReadOnlyQuery($query, [$anwesenheit_id, $verspaetetStatus]);
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

		// KontrolleApi calls this inside its own transaction. There a nested trans_rollback only
		// lowers the depth counter, so the caller has to roll back when this returns false
		if (isError($result))
		{
			$this->db->trans_rollback();
			return false;
		}

		// trans_complete already commits or rolls back. no explicit trans_commit/trans_rollback
		// after it: at depth 1 that would commit the transaction of the caller early
		$this->db->trans_complete();

		// Check if everything went ok during the transaction
		return $this->db->trans_status() !== false;
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
				extension.tbl_anwesenheit_user.fehlminuten,
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
			extension.tbl_anwesenheit_user.fehlminuten,
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
				von, bis, status, fehlminuten, statussetvon, statussetamum, notiz, version, studiensemester_kurzbz, tbl_lehreinheit.lehrform_kurzbz,
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

		return $this->execReadOnlyQuery($query, [$anwesenheit_id]);
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

		return $this->execReadOnlyQuery($query, [$lv_id, $sem_kurzbz, $prestudent_Ids]);
	}

	public function deleteAllByAnwesenheitId($anwesenheit_id)
	{
		$query = "DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_id = ?";

		return $this->execQuery($query, [$anwesenheit_id]);
	}

	/**
	 * loads for every given entry with status $entschuldigtStatus the state before the entschuldigung:
	 * status and fehlminuten of the latest history row that is not entschuldigt (null without such a row)
	 * and the counted duration of its kontrolle. Entries with another status are not in the result.
	 *
	 * 1.) student scans code -> anwesend, or the lektor sets a status
	 * 2.) entschuldigung accepted -> entschuldigt, the history keeps the status before
	 * 3.) entschuldigung declined or the kontrolle moved out of it -> back to the status of 1.)
	 *
	 * A qr scan during the entschuldigt status writes an anwesend row (ProfilApi::checkInAnwesenheit),
	 * a notiz edit writes an entschuldigt row that the filter skips. The order uses the version and not
	 * updateamum: an entry that nobody updated has no updateamum. The scan row has the current version
	 * of the entry, so it wins over the rows from before the entschuldigung.
	 */
	public function getFallbackForEntschuldigt($anwesenheit_user_ids, $entschuldigtStatus)
	{
		$query = "SELECT u.anwesenheit_user_id, prior.status, prior.fehlminuten,
				CAST(extension.get_epoch_from_anw_times(k.von, k.bis) / 60 AS INTEGER) AS dauer
			FROM extension.tbl_anwesenheit_user u
				JOIN extension.tbl_anwesenheit k USING (anwesenheit_id)
				LEFT JOIN LATERAL (
					SELECT h.status, h.fehlminuten
					FROM extension.tbl_anwesenheit_user_history h
					WHERE h.anwesenheit_user_id = u.anwesenheit_user_id AND h.status <> ?
					ORDER BY h.version DESC NULLS LAST, h.anwesenheit_user_history_id DESC
					LIMIT 1
				) prior ON TRUE
			WHERE u.anwesenheit_user_id IN ? AND u.status = ?";

		return $this->execReadOnlyQuery($query, [$entschuldigtStatus, $anwesenheit_user_ids, $entschuldigtStatus]);
	}

	/**
	 * sets the entries with status $entschuldigtStatus back to their state before the entschuldigung,
	 * status and fehlminuten from the same history row (getFallbackForEntschuldigt), abwesend without one.
	 * Fehlminuten that do not fit the kontrolle anymore (a shorter kontrolle) cover all of it: abwesend.
	 * The other entries stay, a status set by hand wins over the entschuldigung
	 */
	public function revertEntschuldigt($anwesenheit_user_ids, $entschuldigtStatus, $verspaetetStatus, $abwesendStatus)
	{
		if (!count($anwesenheit_user_ids)) return success(array());

		$result = $this->getFallbackForEntschuldigt($anwesenheit_user_ids, $entschuldigtStatus);
		if (isError($result)) return $result;

		$reverted = array();
		foreach ((getData($result) ?: array()) as $row) {
			$entry = (object) array(
				'anwesenheit_user_id' => $row->anwesenheit_user_id,
				'status' => $row->status ?: $abwesendStatus
			);

			if ($entry->status === $verspaetetStatus) {
				if ($row->fehlminuten < $row->dauer) $entry->fehlminuten = $row->fehlminuten;
				else $entry->status = $abwesendStatus;
			}

			$reverted[] = $entry;
		}

		return $this->updateAnwesenheiten($reverted, true, $verspaetetStatus);
	}
}