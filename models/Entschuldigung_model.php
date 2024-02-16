<?php

class Entschuldigung_model extends \DB_Model
{

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->dbTable = 'extension.tbl_anwesenheit_entschuldigung';
        $this->pk = 'entschuldigung_id';
    }
	
	public function getEntschuldigungen($person_id)
	{
		$query = 'SELECT dms_id, bezeichnung, von, bis
					FROM extension.tbl_anwesenheit_entschuldigung
					JOIN extension.tbl_anwesenheit_status ON tbl_anwesenheit_entschuldigung.status = tbl_anwesenheit_status.status_kurzbz
					WHERE person_id = ?';

		return $this->execReadOnlyQuery($query, array($person_id));
	}
	
	public function checkZuordnung($dms_id, $person_id = null)
	{
		$query = 'SELECT 1
					FROM extension.tbl_anwesenheit_entschuldigung
					WHERE dms_id = ?';

		$params = array($dms_id);
		
		if ($person_id !== null)
		{
			$query .= " AND person_id = ?";
			$params[] = $person_id;
		}

		return $this->execReadOnlyQuery($query, $params);
	}
}