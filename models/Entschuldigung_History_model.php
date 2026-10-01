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

	/**
	 * writes the current version of an entschuldigung into the history table, before the entschuldigung
	 * gets updated or deleted. $dms_id is stored instead of the dms_id of the entschuldigung
	 */
	public function insertVersion($entschuldigung, $dms_id)
	{
		return $this->insert(
			array(
				'entschuldigung_id' => $entschuldigung->entschuldigung_id,
				'person_id' => $entschuldigung->person_id,
				'von' => $entschuldigung->von,
				'bis' => $entschuldigung->bis,
				'dms_id' => $dms_id,
				'insertvon' => $entschuldigung->insertvon,
				'insertamum' => $entschuldigung->insertamum,
				'updatevon' => $entschuldigung->updatevon,
				'updateamum' => $entschuldigung->updateamum,
				'statussetvon' => $entschuldigung->statussetvon,
				'statussetamum' => $entschuldigung->statussetamum,
				'akzeptiert' => $entschuldigung->akzeptiert,
				'notiz' => $entschuldigung->notiz,
				'version' => $entschuldigung->version
			)
		);
	}
}