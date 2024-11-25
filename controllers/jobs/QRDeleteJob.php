<?php

if (!defined('BASEPATH')) exit('No direct script access allowed');

class QRDeleteJob extends JOB_Controller
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
	}



	public function deleteOldCodes()
	{
		$this->logInfo('Start job queue scheduler FHC-Core-Anwesenheiten->deleteOldCodes');

		$milliseconds = $this->_ci->config->item('QR_EXPIRATION_TIMER');

		$result = $this->QRModel->deleteOlderThanMilliseconds($milliseconds);

		$rows_affected = $this->QRModel->db->affected_rows();

		if (isError($result))
		{
			$this->logError(getError($result), $milliseconds);
		} else {
			$this->logInfo($rows_affected." QR Codes deleted.");
		}

		$this->logInfo('End job queue scheduler FHC-Core-Anwesenheiten->deleteOldCodes');
	}
}