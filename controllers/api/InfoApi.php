<?php

if (!defined('BASEPATH')) exit('No direct script access allowed');

class InfoApi extends FHCAPI_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'getStudiensemester' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r', 'extension/anw_r_lektor:r', 'extension/anw_r_student:r'),
				'getStudentInfo' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r', 'extension/anw_r_lektor:r', 'extension/anw_r_student:r'),
				'getStudiengaenge' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r', 'extension/anw_r_lektor:r', 'extension/anw_r_student:r'),
				'getLektorsForLvaInSemester' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r'),
				'getStudentsForLvaInSemester' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r'),
				'getLvViewDataInfo' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r', 'extension/anw_r_lektor:r', 'extension/anw_r_student:r'),
				'getViewDataStudent' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r', 'extension/anw_r_lektor:r', 'extension/anw_r_student:r'),
				'getLektorLessons' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r', 'extension/anw_r_lektor:r'),
				'getViewPermissions' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_ent_assistenz:r', 'extension/anw_r_lektor:r', 'extension/anw_r_student:r')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('extensions/FHC-Core-Anwesenheiten/AnwesenheitenLib');

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
	 * returns students own uid and person_id -> used in cis4 anwesenheiten widget
	 */
	public function getViewDataStudent() {
		$this->terminateWithSuccess(array('uid' => getAuthUID(), 'person_id' => getAuthPersonId()));
	}

	/**
	 * GET METHOD
	 * returns the permissions and config items the Anwesenheiten view gets, plus the date of the server.
	 * The Cypress suite in tests/cypress reads its rule values from here
	 */
	public function getViewPermissions()
	{
		$permissions = $this->_ci->anwesenheitenlib->getViewPermissions();
		$permissions['today'] = date('Y-m-d');

		$this->terminateWithSuccess($permissions);
	}
	
	/**
	 * GET METHOD
	 * optional parameters 'von', 'bis' (date 'Y-m-d'); default to today.
	 * returns the lessons the logged in Lektor teaches within the range, grouped per Lehreinheit/day.
	 * -> used by the cis4 "Anwesenheiten (Lehrende)" dashboard widget to build deep links
	 */
	public function getLektorLessons()
	{
		$von = $this->input->get('von');
		$bis = $this->input->get('bis');

		// fall back to today for missing/invalid dates, also for a date that does not exist like 2026-13-45
		if (!$this->_ci->anwesenheitenlib->isDate($von)) $von = date('Y-m-d');
		if (!$this->_ci->anwesenheitenlib->isDate($bis)) $bis = $von;

		$result = $this->_ci->AnwesenheitModel->getLektorLessonsInRange($this->_uid, $von, $bis);

		if (!isSuccess($result)) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		$this->terminateWithSuccess(getData($result));
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

		if (!is_numeric($prestudent_id) || !is_numeric($lva_id) || isEmptyString((string) $sem_kurzbz))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		if (!$this->_mayReadStudentInfo($prestudent_id, $lva_id))
			$this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');

		$studentLvaData = $this->_ci->AnwesenheitModel->getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz, APP_ROOT);
		if (isError($studentLvaData)) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$this->terminateWithSuccess(getData($studentLvaData));
	}

	/**
	 * the student detail of the kontrolle view: the rule of the kontrolle view (the admin of the lva or a lektor
	 * of it), like ProfilApi::getAnwesenheitSumByLva. A student reads only itself
	 */
	private function _mayReadStudentInfo($prestudent_id, $lva_id)
	{
		return $this->_ci->anwesenheitenlib->isAdminOrLektorOfLva($lva_id)
			|| $this->_ci->anwesenheitenlib->isOwnPrestudent($prestudent_id);
	}

	/**
	 * POST METHOD
	 * expects parameter 'allowed_stg'
	 */
	public function getStudiengaenge()
	{
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('allowed_stg'));
		$allowed_stg = $result->allowed_stg;

		$admin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');

		// the query needs a list of numbers, anything else is a database error
		if(!$admin && !$this->_ci->anwesenheitenlib->isIdList($allowed_stg))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$result = $admin
			? $this->_ci->AnwesenheitModel->getStudiengaenge()
			: $this->_ci->AnwesenheitModel->getStudiengaengeFiltered($allowed_stg);

		if(!isSuccess($result)) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		$this->terminateWithSuccess($result);

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

		if(!is_numeric($lva_id) || isEmptyString($sem)) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		// the list fills the lektor select of the kontrolle view: the rule of that view
		if(!$this->_ci->anwesenheitenlib->isAdminOrLektorOfLva($lva_id))
			$this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');

		$result = $this->_ci->AnwesenheitModel->getLektorenForLvaInSemester($lva_id, $sem);

		if(!isSuccess($result)) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
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

		if(!is_numeric($lv_id) || isEmptyString($sem_kurzbz)) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$result = $this->_ci->AnwesenheitModel->getStudentsForLvaInSemester($lv_id, $sem_kurzbz);
		if(!isSuccess($result)) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		// the list fills the student dropdown of the student view: only the studiengaenge of the caller, like its reads
		$students = getData($result) ?: array();
		$entitled = $this->_ci->anwesenheitenlib->filterEntitledStudiengaenge(
			array_unique(array_column($students, 'studiengang_kz'))
		);
		$students = array_values(array_filter($students, function ($student) use ($entitled) {
			return in_array($student->studiengang_kz, $entitled);
		}));

		$this->terminateWithSuccess(success($students));
	}

	/**
	 * POST METHOD
	 * expects parameter 'lv_id'
	 * returns viewData relating to LVA in 'LektorComponent'
	 */
	public function getLvViewDataInfo() {
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('lv_id'));
		$lv_id = $result->lv_id;

		if(!is_numeric($lv_id)) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$result = $this->_ci->AnwesenheitModel->getLvViewDataInfo($lv_id);
		if(!isSuccess($result)) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		$this->terminateWithSuccess($result);
	}

	/**
	 * terminates with 'missingParameters' if the POST payload is no JSON object or lacks one of the given properties.
	 * A property with the value null counts as present
	 */
	private function _requireProps($obj, array $props)
	{
		foreach ($props as $prop) {
			if (!is_object($obj) || !property_exists($obj, $prop))
				$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}
	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}