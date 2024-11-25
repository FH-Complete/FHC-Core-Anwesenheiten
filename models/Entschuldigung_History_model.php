<?php

class Entschuldigung_History_model extends \DB_Model
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		$this->dbTable = 'extension.tbl_anwesenheit_entschuldigung_history';
		$this->pk = 'entschuldigung_history_id';
	}

}