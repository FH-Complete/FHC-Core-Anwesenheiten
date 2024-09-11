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
				'getStudentInfo' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLehreinheitenForLehrveranstaltungAndMaUid' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getStudiengaenge' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getLektorsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw'),
				'getStudentsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw'),
				'getLvViewDataInfo' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'populateDBWithAnwEntries' => array('extension/anwesenheit_admin:rw'),
				'populateDBWithAnwEntriesFromExistingKontrollen' => array('extension/anwesenheit_admin:rw'),
				'populateDBWithEntschuldigungen' => array ('extension/anwesenheit_admin:rw')
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
		else $this->terminateWithSuccess(getData($result));

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

	public function populateDBWithAnwEntriesFromExistingKontrollen() {

		$res = $this->AnwesenheitModel->loadLEForSemester('WS2024');
		$leBatch = $res->retval;

//		foreach($leBatch as $le_id) {
//			$res = $this->AnwesenheitModel->loadWhere(array('lehreinheit_id' => $le_id));
			$res = $this->AnwesenheitModel->loadEmptyAnwesenheitenForLE($leBatch);

//			$this->terminateWithSuccess($res);
			$data = $res->retval;



			foreach($data as $anw) {
				$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries(
					$anw->lehreinheit_id,
					$anw->anwesenheit_id,
					$anw->von,
					$anw->bis,
					'abwesend',
					'entschuldigt');
			}
//		}

	}

	public function populateDBWithAnwEntries() {
		// insert tbl.extension_anwesenheit_user entries for every LE of every LVA of every Studiengang to test limits

		// tbl.studiengang WHERE aktiv = true AND studienplaetze > 0 AND typ = 'b' OR typ = 'm'
//		$studiengaenge = [227, 254, 779, 257, 330, 327, 256, 476, 333, 255, 335, 258, 301, 228, 934, 302, 578, 329, 915,
//			336, 303, 854, 334, 331, 300, 332, 328, 692, 804, 585, 297, 298, 299];
//		$studiengaenge = [227];
		$studiengaenge = [779, 257, 330];
//		$sg = 227;

		$response = [];
		$sgIndex = 0;
		foreach($studiengaenge as $sg) {

			// load all lva with le
			$resLVA = $this->_ci->AnwesenheitModel->getAllLvaWithLEForSgAndSem($sg, 'WS2024');
			$data = $resLVA->retval;

			$response[$sgIndex] = array(
				'sg' => $sg,
				'lva' => array()
			);

			$lvaIndex = 0;
			foreach($data as $lvaRow) {
				$response[$sgIndex]['lva'][$lvaRow->lehrveranstaltung_id] = [];

				$leIndex = 0;

				$response[$sgIndex]['lva'][$lvaRow->lehrveranstaltung_id][$lvaRow->lehreinheit_id] = [];

				// find termine for LE
				$resTermine = $this->_ci->AnwesenheitModel->getLETermine($lvaRow->lehreinheit_id);
				$dataTermine = $resTermine->retval;

				// kontrolle and anwesenheiten on each termin
				$terminIndex = 0;

				foreach($dataTermine as $terminRow) {

					$response[$sgIndex]['lva'][$lvaRow->lehrveranstaltung_id][$lvaRow->lehreinheit_id][$terminIndex] = $terminRow;

					$vonString = $terminRow->datum.' '.$terminRow->beginn;
					$endeString = $terminRow->datum.' '.$terminRow->ende;

					$insert = $this->_ci->AnwesenheitModel->insert(array(
						'lehreinheit_id' => $lvaRow->lehreinheit_id,
						'insertamum' => date('Y-m-d H:i:s'),
						'von' => $vonString,
						'bis' => $endeString
					));

					$anwesenheit_id = $insert->retval;
					$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries(
						$lvaRow->lehreinheit_id,
						$anwesenheit_id,
						$vonString,
						$endeString,
						'abwesend',
						'entschuldigt');

					$terminIndex++;
				}


			}

			$sgIndex++;
		}

		$this->terminateWithSuccess($response);
	}

	public function populateDBWithEntschuldigungen() {

		$res = $this->_ci->AnwesenheitModel->getRandomStudentPersonIDs();
		$data = $res->retval;

//		$this->terminateWithSuccess($data);

		$start = new DateTime('2024-05-01 00:00:01');
		$end = new DateTime('2024-12-30 23:59:59');

		foreach ($data as $datarow) {
			// generate random $von & $bis timestrings
			$randomTimestamp1 = mt_rand($start->getTimestamp(), $end->getTimestamp());
			$von = date('Y-m-d H:i:s', $randomTimestamp1);
			$vonDateTime = new DateTime($von);

			$randomTimestamp2 = mt_rand($start->getTimestamp(), $end->getTimestamp());
			$bis = date('Y-m-d H:i:s', $randomTimestamp2);
			$bisDateTime = new DateTime($bis);

			if($bisDateTime < $vonDateTime) {
				$tmp = $bis;
				$bis = $von;
				$von = $tmp;
			}


			$this->_ci->EntschuldigungModel->insert(
				array(
					'person_id' => $datarow->person_id,
					'von' => $von,
					'bis' => $bis,
					'dms_id' => 314240,
					'insertvon' => $this->_uid,
					'version' => 1
				)
			);
		}

	}

}