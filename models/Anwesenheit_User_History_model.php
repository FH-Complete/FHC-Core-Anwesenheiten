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

	// writes the entry into the history as a qr scan would change it: status $anwesendStatus without fehlminuten,
	// set by $uid now. The entry itself keeps its status. The scan of an entschuldigt entry uses this, see
	// ProfilApi::checkInAnwesenheit and Anwesenheit_User_model::getFallbackForEntschuldigt
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
				0,
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