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
				'getStunden' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getStudentInfo' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLehreinheitenForLehrveranstaltungAndMaUid' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_lektor:rw'),
				'getStudiengaenge' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLektorsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw'),
				'getStudentsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw'),
				'getLvViewDataInfo' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getAktuellesSemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getViewDataStudent' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');
		$this->_ci->load->model('ressource/mitarbeiter_model', 'MitarbeiterModel');
		$this->_ci->load->model('ressource/stunde_model', 'StundeModel');
		$this->_ci->load->model('education/Lehrveranstaltung_model', 'LehrveranstaltungModel');

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

	/**
	 * GET METHOD
	 * returns List of all studiensemester as well as current one
	 */
	public function getAktuellesSemester()
	{
		$this->_ci->StudiensemesterModel->addOrder("start", "DESC");

		$result = $this->_ci->StudiensemesterModel->getAkt();
		$aktuell = getData($result);

		$this->terminateWithSuccess($aktuell);
	}

	/**
	 * GET METHOD
	 * returns students own uid and person_id -> used in cis4 anwesenheiten widget
	 */
	public function getViewDataStudent() {
		$this->terminateWithSuccess(array('uid' => getAuthUID(), 'person_id' => getAuthPersonId()));
	}
	
	/**
	 * GET METHOD
	 * returns List of all studiensemester as well as current one
	 */
	public function getStudiensemester()
	{
		$this->_ci->StudiensemesterModel->addOrder("start", "DESC");
		$result = $this->_ci->StudiensemesterModel->load();

		$studiensemester = getData($result);
		$result = $this->_ci->StudiensemesterModel->getAkt();
		$aktuell = getData($result);

		$this->terminateWithSuccess(array($studiensemester, $aktuell));
	}

	public function getStunden()
	{
		$this->_ci->StudiensemesterModel->addOrder("stunde", "ASC");
		$result = $this->_ci->StundeModel->load();
		$data = getData($result);

		$this->terminateWithSuccess($data);
	}

	/**
	 * GET METHOD
	 * expects parameter 'prestudent_id', 'lva_id', 'sem_kurzbz'
	 * returns viewData relating to student in lva for semester for 'StudentByLvaComponent'
	 */
	public function getStudentInfo()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lva_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$studentLvaData = $this->_ci->AnwesenheitModel->getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz, APP_ROOT);

		$this->terminateWithSuccess(getData($studentLvaData));
	}

	/**
	 * GET METHOD
	 * expects parameter 'lva_id', 'ma_uid', 'sem_kurzbz'
	 * returns list of lehreinheiten which given lektor is teaching in given semester
	 */
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
		$leForLvaAndMA = getData($result);

		if(is_null($leForLvaAndMA)) 
		{
			$this->terminateWithSuccess(array([], []));
		}
		// filter for unique le_id keys
		$distinctLeId = array_values(array_reduce($leForLvaAndMA, function ($carry, $leRow) {
			// use the name as a key to ensure uniqueness
			$carry[$leRow->lehreinheit_id] = $leRow;
			return $carry;
		}, []));
		
		$allLeTermine = [];
		
		forEach($distinctLeId as $leRow) 
		{
			$result = $this->_ci->AnwesenheitModel->getLETermine($leRow->lehreinheit_id);
			if(!isSuccess($result)) $this->terminateWithError(getError($result));
			$leTermine = getData($result);
		
			$allLeTermine[$leRow->lehreinheit_id] = $leTermine;
		}


		$this->terminateWithSuccess(array($leForLvaAndMA, $allLeTermine));

	}

	/**
	 * POST METHOD
	 * expects parameter 'allowed_stg'
	 */
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

	/**
	 * GET METHOD
	 * expects 'lva_id', 'sem'
	 * returns lst of lektors teaching lva in semester
	 */
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

	/**
	 * GET METHOD
	 * expects 'lva_id', 'sem'
	 * returns lst of students attending lva in semester
	 */
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

	/**
	 * POST METHOD
	 * expects parameter 'lv_id'
	 * returns viewData relating to LVA in 'LektorComponent'
	 */
	public function getLvViewDataInfo() {
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;

		$result = $this->_ci->AnwesenheitModel->getLvViewDataInfo($lv_id);
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