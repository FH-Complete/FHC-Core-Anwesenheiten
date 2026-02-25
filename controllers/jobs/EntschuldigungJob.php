<?php

if (!defined('BASEPATH')) exit('No direct script access allowed');

class EntschuldigungJob extends JOB_Controller
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_History_model', 'EntschuldigungHistoryModel');
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
	}


	// job which finds entschuldigungen older than the defined interval which do not have a file attached yet
	// and would have been applied for a timespan in the past. Sets these old entschuldigungen to declined to prefilter
	// the entschuldigungen page for assistenzen a little better
	public function setOldApplicationsRejected()
	{
		$this->logInfo('Start job FHC-Core-Anwesenheiten->EntschuldigungJob->setOldApplicationsRejected');

		$interval = $this->_ci->config->item('ENTSCHULDIGUNG_AUTODECLINE_THRESHOLD');

		$result = $this->EntschuldigungModel->findOlderThanInterval($interval);
		$data = getData($result);
		
		$rows_history = 0;
		$rows_declined = 0;
		forEach($data as $ent) {
			$resultHistory = $this->setEntHistoryEntry($ent);
			if(isError($resultHistory)) {
				$this->logError($resultHistory, $interval);
			} else {
				$rows_history++;
			}
			
			$resultUpdate = $this->setEntDeclinedStatus($ent);
			if(isError($resultUpdate)) {
				$this->logError($resultUpdate, $interval);
			} else {
				$rows_declined++;
			}
		}

		$this->logInfo($rows_history." history entries created.");
		$this->logInfo($rows_declined." outdated Entschuldigungen declined.");

		$this->logInfo('End job FHC-Core-Anwesenheiten->EntschuldigungJob->setOldApplicationsRejected');
	}
	
	private function setEntHistoryEntry($ent) {
		return $this->_ci->EntschuldigungHistoryModel->insert(
			array(
				'entschuldigung_id' => $ent->entschuldigung_id,
				'person_id' => $ent->person_id,
				'von' => $ent->von,
				'bis' => $ent->bis,
				'dms_id' => $ent->dms_id,
				'insertvon' => $ent->insertvon,
				'insertamum' => $ent->insertamum,
				'updatevon' => $ent->updatevon,
				'updateamum' => $ent->updateamum,
				'statussetvon' => $ent->statussetvon,
				'statussetamum' => $ent->statussetamum,
				'akzeptiert' => $ent->akzeptiert,
				'notiz' => $ent->notiz,
				'version' => $ent->version
			)
		);
	}
	
	private function setEntDeclinedStatus($ent) {
		$version = $ent->version + 1;

		// statussetvon cant be set since statussetvon has fkey constraint on tbl_benutzer
		$updateEntries = array(
			'updatevon' => 'ent_decline_job',
			'updateamum' => date('Y-m-d H:i:s'),
			'akzeptiert' => false,
			'notiz' => $ent->notiz,
			'version' => $version,
			'von' => $ent->von,
			'bis' => $ent->bis
		);

		return $this->_ci->EntschuldigungModel->update(
			$ent->entschuldigung_id,
			$updateEntries
		);
	}
}