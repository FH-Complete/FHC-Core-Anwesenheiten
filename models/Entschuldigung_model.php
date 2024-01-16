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

//    /**
//     * Creates new Entschuldigung.
//     * Saves new Entschuldigung and sets Entschuldigungsstatus for the new Entschuldigung.
//     *
//     * @param $prestudent_id
//     * @param $status
//     * @param $dms_id
//     * @param $von_date
//     * @param $bis_date
//     * @return array
//     */
//    public function createEntschuldigung($prestudent_id, $status, $dms_id, $von_date, $bis_date)
//    {
//        // Start DB transaction
//        $this->db->trans_start(false);
//
//        // Save Entschuldigung
//        $result = $this->EntschuldigungModel->insert(array(
//            'prestudent_id' => $prestudent_id,
//            'von' => $von_date,
//            'bis' => $bis_date,
//            'status' => $status,
//            'dms_id' => $dms_id,
//            'insertvon' => $this->_uid
//        ));
//
//        // Store just inserted Entschuldigung ID
//        $lastInsert_entschuldigung_id = $result->retval;
//
//        // Save Entschuldigungstatus
//        $this->EntschuldigungModel->saveEntschuldigung($lastInsert_entschuldigung_id, $prestudent_id, $von_date, $bis_date, $status, $dms_id);
//
//        // Transaction complete
//        $this->db->trans_complete();
//
//        if ($this->db->trans_status() === false)
//        {
//            $this->db->trans_rollback();
//            return error('Failed inserting Entschuldigung', EXIT_ERROR);
//        }
//
//        return success($lastInsert_entschuldigung_id);
//    }
//
//    public function saveAnwesenheit($lastInsert_entschuldigung_id, $prestudent_id, $von_date, $bis_date, $status, $dms_id)
//    {
//        $qry = '
//			INSERT INTO extension.tbl_anwesenheit_entschuldigung (
//			    lastInsert_entschuldigung_id, prestudent_id, von_date, bis_date, status, dms_id
//			) VALUES ( ?, ?, ?, ?, ?, ?);
//		';
//
//        return $this->execQuery($qry, array($lastInsert_entschuldigung_id, $prestudent_id, $von_date, $bis_date, $status, $dms_id, getAuthUID()));
//    }

}