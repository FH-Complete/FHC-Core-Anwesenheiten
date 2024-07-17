<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');


class AdministrationApi extends FHCAPI_Controller
{
	public function __construct()
	{
		parent::__construct(array(
				'getEntschuldigungen' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw'),
				'updateEntschuldigung' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_History_model', 'AnwesenheitUserHistoryModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_History_model', 'EntschuldigungHistoryModel');
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
		$notiz = $data['notiz'];

		if (isEmptyString($entschuldigung_id) || !in_array($status, [true, false]))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = $this->_ci->EntschuldigungModel->load($entschuldigung_id);

		if (isError($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		if (!hasData($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = getData($entschuldigung)[0];

		$updateStatus = $status ? ENTSCHULDIGT_STATUS : ABWESEND_STATUS;

		$result = $this->_ci->EntschuldigungModel->getAllUncoveredAnwesenheitenInTimespan($entschuldigung_id, $entschuldigung->person_id, $entschuldigung->von, $entschuldigung->bis);
		if (isError($result))
			$this->terminateWithError($result);
		$anwesenheit_user_idsArr = getData($result);

		if($anwesenheit_user_idsArr) {
			$funcAUID = function($value) {
				return $value->anwesenheit_user_id;
			};

			$anwesenheit_user_ids = array_map($funcAUID, $anwesenheit_user_idsArr);

			$updateAnwesenheit = $this->_ci->AnwesenheitModel->updateAnwesenheiten($anwesenheit_user_ids, $updateStatus);

			if (isError($updateAnwesenheit))
				$this->terminateWithError($updateAnwesenheit);
		}

		// check notiz size and trim to char varying 255 if it is too big
		$notiz = substr($notiz, 0, 255);
		$version = $entschuldigung->version + 1;

		// add old version to history table
		$insert = $this->_ci->EntschuldigungHistoryModel->insert(
			array(
				'entschuldigung_id' => $entschuldigung->entschuldigung_id,
				'person_id' => $entschuldigung->person_id,
				'von' => $entschuldigung->von,
				'bis' => $entschuldigung->bis,
				'dms_id' => $entschuldigung->dms_id,
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

		$update = $this->_ci->EntschuldigungModel->update(
			$entschuldigung->entschuldigung_id,
			array(
				'updatevon' => $this->_uid,
				'updateamum' => date('Y-m-d H:i:s'),
				'statussetvon' => $this->_uid,
				'statussetamum' => date('Y-m-d H:i:s'),
				'akzeptiert' => $status,
				'notiz' => $notiz,
				'version' => $version
			)
		);

		if (isError($update))
			$this->terminateWithError($this->p->t('global', 'errorUpdateEntschuldigung'), 'general');


		$this->terminateWithSuccess($this->p->t('global', 'successUpdateEntschuldigung'));
	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}