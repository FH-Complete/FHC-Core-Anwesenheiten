<?php

if (!defined('BASEPATH')) exit('No direct script access allowed');

class InfoApi extends FHCAPI_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'getStudiensemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getAktStudiensemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLehreinheitAndLektorInfo' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getStudentInfo' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLehreinheitenForLehrveranstaltungAndMaUid' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLehreinheitenForLehrveranstaltung' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getStudiengaenge' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLektorsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw'),
				'getStudentsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw'),
				'getStundenPlanEntriesForLEandLektorOnDate' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw'),
				'getLvViewDataInfo' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLETermine' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');
		$this->_ci->load->model('ressource/mitarbeiter_model', 'MitarbeiterModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

		$this->loadPhrases(
			array(
				'global',
				'ui'
			)
		);

		$this->_setAuthUID(); // sets property uid
	}

	// INFO API

	public function getStudiensemester()
	{
		$this->_ci->StudiensemesterModel->addOrder("start", "DESC");
		$result = $this->_ci->StudiensemesterModel->load();

		$studiensemester = getData($result);
		$result = $this->_ci->StudiensemesterModel->getAkt();
		$aktuell = getData($result);

		$this->terminateWithSuccess(array($studiensemester, $aktuell));
	}

	public function getAktStudiensemester()
	{
		$this->terminateWithSuccess(getData($this->_ci->StudiensemesterModel->getAkt()));
	}

	public function getLehreinheitAndLektorInfo()
	{
		$result = $this->getPostJSON();
		$le_id = $result->le_id;
		$ma_uid = $result->ma_uid;
		$currentDate = $result->date;

		$lektorLehreinheitData = $this->_ci->AnwesenheitModel->getLehreinheitAndLektorInfo($le_id, $ma_uid, $currentDate);
		$leTermine = $this->_ci->AnwesenheitModel->getLETermine($le_id);

		$this->terminateWithSuccess(array(getData($lektorLehreinheitData), getData($leTermine)));
	}

	public function getStudentInfo()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lva_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$studentLvaData = $this->_ci->AnwesenheitModel->getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz, APP_ROOT);

		$this->terminateWithSuccess(getData($studentLvaData));
	}

	public function getLehreinheitenForLehrveranstaltungAndMaUid()
	{
		$lva_id = $this->input->get('lva_id');
		$ma_uid = $this->input->get('ma_uid');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		if($lva_id === 'null' || $ma_uid === 'null' || $sem_kurzbz === 'null') {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		if(isEmptyString($lva_id) ||
			isEmptyString($ma_uid)  ||
			isEmptyString($sem_kurzbz) ) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$result = $this->_ci->AnwesenheitModel->getAllLehreinheitenForLvaAndMaUid($lva_id, $ma_uid, $sem_kurzbz);

		if(!isSuccess($result)) $this->terminateWithError(getError($result));
		else $this->terminateWithSuccess(getData($result));

	}

	public function getLehreinheitenForLehrveranstaltung()
	{
		$lva_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		if(isEmptyString($lva_id) || $lva_id === 'null' ||
			isEmptyString($sem_kurzbz) || $sem_kurzbz === 'null') {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$result = $this->_ci->AnwesenheitModel->getAllLehreinheitenForLva($lva_id, $sem_kurzbz);
		if(!isSuccess($result)) $this->terminateWithError(getError($result));
		$this->terminateWithSuccess(getData($result));

	}

	public function getStudiengaenge()
	{
		$result = $this->getPostJSON();
		$allowed_stg = $result->allowed_stg;

		$admin = $this->permissionlib->isBerechtigt('extension/anwesenheit_admin');

		if($admin) {
			$result = $this->_ci->AnwesenheitModel->getStudiengaenge();

			if(!isSuccess($result)) $this->terminateWithError($result);
			$this->terminateWithSuccess($result);
		} else {
			$result = $this->_ci->AnwesenheitModel->getStudiengaengeFiltered($allowed_stg);

			if(!isSuccess($result)) $this->terminateWithError($result);
			$this->terminateWithSuccess($result);
		}

	}

	public function getLektorsForLvaInSemester() {
		$lva_id = $this->input->get('lva_id');
		$sem = $this->input->get('sem');

		if($lva_id === 'null'  || $sem === 'null') {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		if(isEmptyString($lva_id) || isEmptyString($sem)) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$result = $this->_ci->AnwesenheitModel->getLektorenForLvaInSemester($lva_id, $sem);

		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	public function getStudentsForLvaInSemester() {
		$lv_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem');

		if($lv_id === 'null'  || $sem_kurzbz === 'null') {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		if(isEmptyString($lv_id) || isEmptyString($sem_kurzbz)) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$result = $this->_ci->AnwesenheitModel->getStudentsForLvaInSemester($lv_id, $sem_kurzbz);
		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	public function getStundenPlanEntriesForLEandLektorOnDate() {
		$result = $this->getPostJSON();
		$le_id = $result->le_id;
		$ma_uid = $result->ma_uid;
		$date = $result->date;

		if(isEmptyString($le_id) || $le_id === 'null' || isEmptyString($ma_uid) || $ma_uid === 'null'
			|| isEmptyString($date) || $date === 'null' ) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$result = $this->_ci->AnwesenheitModel->getStundenPlanEntriesForLEandLektorOnDate($le_id, $ma_uid, $date);
		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	public function getLvViewDataInfo() {
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;

		$result = $this->_ci->AnwesenheitModel->getLvViewDataInfo($lv_id);
		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	public function getLETermine() {
		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		$result = $this->_ci->AnwesenheitModel->getLETermine($le_id);
		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}