<?php

class Anwesenheit_User_model extends \DB_Model
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		$this->dbTable = 'extension.tbl_anwesenheit_user';
		$this->pk = 'anwesenheit_user_id';
	}

	public function createNewUserAnwesenheitenEntries($le_id, $anwesenheit_id) {
		$this->db->trans_start(false);

		// find every student not already having an anwesenheit for the check with given anwesenheit_id
		$query = "
			SELECT prestudent_id
			FROM campus.vw_student_lehrveranstaltung
				 JOIN public.tbl_student ON (uid = student_uid)
			WHERE lehreinheit_id = $le_id AND verband != 'I'
			
			AND prestudent_id NOT IN(
				SELECT students.prestudent_id as prestudent_id FROM
					extension.tbl_anwesenheit JOIN extension.tbl_anwesenheit_user USING (anwesenheit_id)
											  JOIN
			
				(SELECT prestudent_id
				 FROM campus.vw_student_lehrveranstaltung
						  JOIN public.tbl_student ON (uid = student_uid)
				 WHERE lehreinheit_id = {$le_id} AND
					   verband != 'I') students USING(prestudent_id)
			WHERE anwesenheit_id = $anwesenheit_id);
		";

		$result = $this->execQuery($query);

		// and insert them as abwesend
		if(hasData($result)) {

			forEach ($result->retval as $entry) {

				$result = $this->insert(array(
					'anwesenheit_id' => $anwesenheit_id,
					'prestudent_id' => $entry->prestudent_id,
					'status' => 'abwesend',
					'insertamum' => $this->escape('NOW()'),
					'insertvon' => getAuthUID()
				));

				if (!isSuccess($result)) {
					break;
				}
			}

		}

		$this->db->trans_complete();

		// Check if everything went ok during the transaction
		if ($this->db->trans_status() === false || isError($result))
		{
			$this->db->trans_rollback();
			return error($result->msg, EXIT_ERROR);
		}
		else
		{
			$this->db->trans_commit();
			return success('Anwesenheiten successfully inserted.');
		}
	}

	public function getAnwesenheitenCheckViewData($prestudent_id, $lehreinheit_id)
	{
		$query = "
			SELECT vorname, nachname, bezeichnung, kurzbz, verband, foto
			FROM campus.vw_student_lehrveranstaltung
					 JOIN public.tbl_student ON (uid = student_uid)
					 JOIN public.tbl_benutzer USING (uid)
					 JOIN tbl_person USING (person_id)
			WHERE
			  lehreinheit_id = {$lehreinheit_id}
			  AND prestudent_id = {$prestudent_id};
		";

		return $this->execQuery($query);
	}

}