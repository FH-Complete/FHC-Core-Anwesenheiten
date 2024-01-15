<?php

class Anwesenheit_model extends \DB_Model
{

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->dbTable = 'extension.tbl_anwesenheit';
        $this->pk = 'anwesenheit_id';
    }

    /**
     * Creates new Anwesenheit.
     * Saves new Anwesenheit and sets Anrechnungstatus for the new Anrechnung.
     *
     * @param $prestudent_id
     * @param $lehreinheit_id
     * @param $status
     * @return array
     */
    public function createAnrechnungsantrag(
        $prestudent_id, $lehreinheit_id, $status
    )
    {
        // Start DB transaction
        $this->db->trans_start(false);

        // Save Anwesenheit
        $result = $this->AnwesenheitModel->insert(array(
            'prestudent_id' => $prestudent_id,
            'lehreinheit_id' => $lehreinheit_id,
            'status' => $status,
            'insertvon' => $this->_uid
        ));

        // Store just inserted Anwesenheit ID
        $lastInsert_anwesenheit_id = $result->retval;

        // Save Anwesenheitstatus
        $this->AnwesenheitModel->saveAnwesenheit($lastInsert_anwesenheit_id, $lehreinheit_id, $status);

        // Transaction complete
        $this->db->trans_complete();

        if ($this->db->trans_status() === false)
        {
            $this->db->trans_rollback();
            return error('Failed inserting Anwesenheit', EXIT_ERROR);
        }

        return success($lastInsert_anwesenheit_id);
    }

    public function saveAnwesenheit($lastInsert_anwesenheit_id, $lehreinheit_id, $status)
    {
        $qry = '
			INSERT INTO extension.tbl_anwesenheit (
			    lastInsert_anwesenheit_id, lehreinheit_id, status, insertvon
			) VALUES ( ?, ?, ?, ?);
		';

        return $this->execQuery($qry, array($lastInsert_anwesenheit_id, $lehreinheit_id, $status, getAuthUID()));
    }

    /**
     * Delete Anwesenheitstatus.
     *
     * @param $anwesenheitstatus_id
     */
    public function deleteAnwesenheitstatus($status_kurzbz){

        $qry = '
			DELETE FROM extension.tbl_anwesenheit_status
			WHERE status_kurzbz = ?
		';

        return $this->execQuery($qry, array($status_kurzbz));
    }

}