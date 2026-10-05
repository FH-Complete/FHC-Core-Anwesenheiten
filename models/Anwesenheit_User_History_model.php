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
	// btw cant just use latest version of history, since history is written on every kind of update (e.g. notiz)
	public function getStatusPriorToEntschuldigtForId($anwesenheit_user_id) {
		$query = "WITH allEntries as(
					SELECT anwesenheit_user_id, status, updateamum, version
					FROM extension.tbl_anwesenheit_user_history
					WHERE anwesenheit_user_id = ?
					UNION
					(SELECT anwesenheit_user_id, status, updateamum, version
					 FROM extension.tbl_anwesenheit_user
					 WHERE anwesenheit_user_id = ?)
					ORDER BY version DESC
				)
				SELECT *
				FROM allEntries
				WHERE updateamum < (
					SELECT updateamum
					FROM allEntries
					WHERE status = 'entschuldigt' AND anwesenheit_user_id = ?
					ORDER BY updateamum DESC
					LIMIT 1
				)
				LIMIT 1";

		return $this->execReadOnlyQuery($query, [$anwesenheit_user_id, $anwesenheit_user_id, $anwesenheit_user_id]);
	}
}