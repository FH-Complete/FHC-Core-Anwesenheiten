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

		$query = "DELETE FROM extension.tbl_anwesenheit_user_history WHERE anwesenheit_id = {$anwesenheit_id}";

		return $this->execQuery($query);
	}

}