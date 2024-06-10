<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');


class AdministrationApi extends FHCAPI_Controller
{
	public function __construct()
	{
		parent::__construct(array(
				'getEntschuldigungen' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw'),
				'updateEntschuldigung' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('ressource/Mitarbeiter_model', 'MitarbeiterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

		$qrsetting_filename = APPPATH.'config/extensions/FHC-Core-Anwesenheiten/qrsettings.php';
		require_once($qrsetting_filename);

		$this->loadPhrases(
			array(
				'global',
				'ui'
			)
		);

		$this->_setAuthUID(); // sets property uid

		$this->load->helper('hlp_sancho_helper');
	}

	// ASSISTENZ API

	public function getEntschuldigungen()
	{
		$result = $this->getPostJSON();
		$stg_kz_arr = $result->stg_kz_arr;
		$admin = $this->permissionlib->isBerechtigt('extension/anwesenheit_admin');

		if($admin === true) {
			$this->terminateWithSuccess($this->_ci->EntschuldigungModel->getAllEntschuldigungen());
		}

		if(!$stg_kz_arr || count($stg_kz_arr) < 1) $this->terminateWithError($this->p->t('global', 'errorNoSTGassigned'), 'general');

		$this->terminateWithSuccess( $this->_ci->EntschuldigungModel->getEntschuldigungenForStudiengaenge($stg_kz_arr));
	}

	public function assistenzGetAllEntschuldigungen()
	{
		$this->terminateWithSuccess($this->_ci->EntschuldigungModel->getAllEntschuldigungen());
	}

	public function updateEntschuldigung()
	{
		$data = json_decode($this->input->raw_input_stream, true);

		$entschuldigung_id = $data['entschuldigung_id'];
		$status = $data['status'];

		if (isEmptyString($entschuldigung_id) || !in_array($status, [true, false]))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = $this->_ci->EntschuldigungModel->load($entschuldigung_id);

		if (isError($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		if (!hasData($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = getData($entschuldigung)[0];
		if ($entschuldigung->akzeptiert !== $status)
		{
			$updateStatus = $status ? 'entschuldigt' : 'abwesend';

			$updateAnwesenheit = $this->_ci->AnwesenheitModel->updateAnwesenheitenByDatesStudent($entschuldigung->von, $entschuldigung->bis, $entschuldigung->person_id, $updateStatus);
			if (isError($updateAnwesenheit))
				$this->terminateWithError($updateAnwesenheit);

			$update = $this->_ci->EntschuldigungModel->update(
				$entschuldigung->entschuldigung_id,
				array(
					'updatevon' => $this->_uid,
					'updateamum' => date('Y-m-d H:i:s'),
					'statussetvon' => $this->_uid,
					'statussetamum' => date('Y-m-d H:i:s'),
					'akzeptiert' => $status
				)
			);

			if (isError($update))
				$this->terminateWithError($this->p->t('global', 'errorUpdateEntschuldigung'), 'general');
		}

		$this->terminateWithSuccess($this->p->t('global', 'successUpdateEntschuldigung'));
	}

}