<?php

class Anwesenheit_User_History_model extends \DB_Model
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		$this->dbTable = 'extension.tbl_anwesenheit_history_user';
		$this->pk = 'anwesenheit_user_history_id';
	}

	public function deleteAllByAnwesenheitId($anwesenheit_id) {

		$query = "DELETE FROM extension.tbl_anwesenheit_user_history WHERE anwesenheit_id = ?";

		return $this->execQuery($query, [$anwesenheit_id]);
	}
	
	// looks up the status prior to being entschuldigt, in case a once accepted entschuldigung is 
	// retroactively deemed abgelehnt and the student has been anwesend in the actual kontrolle
	// 1.) student scans code -> anwesend
	// 2.) student get entschuldigung for relevant timespan accepted
	// 3.) anw status -> entschuldigt
	// 4.) entschuldigung is actually not okay, revert back to last status
	// 5.) use this method
	//
	// the same for a scan during the entschuldigt status:
	// 1.) student gets entschuldigung accepted -> entschuldigt
	// 2.) student attends anyway and scans code -> status stays entschuldigt, addScanEntry writes anwesend
	// 3.) entschuldigung is actually not okay -> this method returns anwesend
	//
	// The result is the latest history row that is not entschuldigt. A notiz edit writes an entschuldigt row,
	// the filter skips it. The order uses the version and not updateamum: an entry that nobody updated
	// has no updateamum. The scan row has the current version of the entry. So the query returns the
	// scan row and not the status before the entschuldigung.
	public function getStatusPriorToEntschuldigtForId($anwesenheit_user_id, $entschuldigtStatus) {
		$query = "SELECT status
				FROM extension.tbl_anwesenheit_user_history
				WHERE anwesenheit_user_id = ? AND status <> ?
				ORDER BY version DESC NULLS LAST, anwesenheit_user_history_id DESC
				LIMIT 1";

		return $this->execReadOnlyQuery($query, [$anwesenheit_user_id, $entschuldigtStatus]);
	}

	// writes the entry into the history as a qr scan would change it: status $anwesendStatus, set by $uid now.
	// The entry itself keeps its status. The scan of an entschuldigt entry uses this, see
	// ProfilApi::checkInAnwesenheit
	public function addScanEntry($anwesenheit_user_id, $anwesendStatus, $uid) {
		$now = date('Y-m-d H:i:s');

		$query = "INSERT INTO extension.tbl_anwesenheit_user_history (
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
			) SELECT
				anwesenheit_user_id,
				anwesenheit_id,
				prestudent_id,
				?,
				?,
				?,
				notiz,
				fehlminuten,
				version,
				insertamum,
				insertvon,
				?,
				?
			FROM extension.tbl_anwesenheit_user
			WHERE anwesenheit_user_id = ?";

		return $this->execQuery($query, [$anwesendStatus, $uid, $now, $now, $uid, $anwesenheit_user_id]);
	}
}