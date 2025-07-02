<?php

class QR_model extends \DB_Model
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		$this->dbTable = 'extension.tbl_anwesenheit_check';
		$this->pk = array();
		$this->hasSequence = false;
	}

	public function getActiveCodeForLE($le_id, $uid)
	{
		$query = "
			SELECT anwesenheit_id, zugangscode
			FROM extension.tbl_anwesenheit JOIN extension.tbl_anwesenheit_check USING(anwesenheit_id)
			WHERE lehreinheit_id = ? AND extension.tbl_anwesenheit.insertvon = ?
		";

		return $this->execQuery($query, [$le_id, $uid]);
	}

	public function deleteOlderThanMilliseconds($milliseconds)
	{
		$query = "
			DELETE FROM extension.tbl_anwesenheit_check
			WHERE tbl_anwesenheit_check.insertamum < NOW() - INTERVAL (?+' milliseconds');";

		return $this->execQuery($query[$milliseconds]);
	}
}