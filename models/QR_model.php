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

	public function getQRCode($qrinfo) {


	}
}