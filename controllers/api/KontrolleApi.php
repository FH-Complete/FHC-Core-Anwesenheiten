<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

use \chillerlan\QRCode\QROptions;
use \chillerlan\QRCode\QRCode;

class KontrolleApi extends FHCAPI_Controller
{

	private $_ci;
	private $_uid;
	public function __construct()
	{
		parent::__construct(array(
				// tableData fetch lektor main page
				'fetchAllAnwesenheitenByLvaAssigned' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),

				// alternative tableData fetch lektor main page
				'fetchAllAnwesenheitenByLva' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),

				// tableData fetch lektor-student page
				'getAllAnwesenheitenByStudentByLva' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),

				// changing status or note of anwesenheit user entry
				'updateAnwesenheiten' => array('extension/anw_r_lektor:rw',  'extension/anw_r_full_assistenz:rw'),

				// requests new code when timer reaches its limit during kontrolle
				'regenerateQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// deletes old code from db when refreshed is received
				'degenerateQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// start of a new kontrolle, inserts anw_user entries
				'getNewQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// start & end of kontrolle without the qr part for lessons where scanning is not intended
				'insertAnwWithoutQR' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// requests qr code for existing kontrolle
				'restartKontrolle' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// update von/bis times for existing kontrolle
				'updateKontrolle' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// in case kontrolle was not stopped intentionally jump right back in on startup
				'getExistingQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// method called at end of kontrolle to clean up qr code
				'deleteQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// delete kontrolle and all corresponding anw_user entries
				'deleteAnwesenheitskontrolle' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),

				// gets checkin & entschuldigt count for ongoing kontrolle
				'pollAnwesenheiten' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),

				// reloads just the sum% when anwesenheiten have been updated to avoid full reload
				'getAnwQuoteForPrestudentIds' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),
			
				// loads le dropdown options
				'getLehreinheitenForLehrveranstaltungAndMaUid' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_lektor:r'),

				// loads le multiselect options
				'getLehreinheitenForLehrveranstaltung' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_lektor:r'),
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_History_model', 'AnwesenheitUserHistoryModel');

		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('ressource/Mitarbeiter_model', 'MitarbeiterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');
		$this->_ci->load->model('organisation/Erhalter_model', 'ErhalterModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');
		$this->_ci->load->model('system/Webservicelog_model', 'WebservicelogModel');


		$this->loadPhrases(
			array(
				'global',
				'ui'
			)
		);
		
		require_once(FHCPATH.'include/lehrveranstaltung.class.php');

		$this->_setAuthUID(); // sets property uid
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
		$this->load->helper('hlp_sancho_helper');
	}

	/**
	 * POST METHOD
	 * expects parameters 'le_id', 'lv_id', 'sem_kurzbz', 'ma_uid'
	 *
	 * main setup & state management Method of LektorComponent and fulfills several functions
	 * in order to keep state management simple in the prototype phase. High potential for optimization.
	 *
	 * returns (
	 *    students - list of students attending le in semester on date for lektor
	 *    anwEntries - anwesenheiten_user entries of students
	 *    stsem - object of current studiensemester (used to calculate zusätze like outgoing, incoming, etc of students)
	 *    entschuldigtStati - a list of every accepted entschuldigungsrange for students in this lesson
	 *    kontrollen - existing anwesenheitskontrollen to delete later on
	 *    a_o_kz - ausserordentlich kennzeichen prefix for student zusatz
	 * )
	 */
	public function fetchAllAnwesenheitenByLvaAssigned()
	{

		$result = $this->getPostJSON();

		$this->_requireProps($result, array('le_id', 'lv_id', 'sem_kurzbz', 'ma_uid'));

		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;
		$le_id = $result->le_id;
		$ma_uid = $result->ma_uid;

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		$result = $this->_ci->AnwesenheitModel->getStudentsForLVAandLEandSemester($lv_id, $le_id, $sem_kurzbz, APP_ROOT);

		// use this preliminary error message in a hardcoded way since this should only ever occur when installing the extension on a
		// custom fhcomplete installation and even if it was a phrase, it would be dead weight in the namespace
//		if(isError($result)) $this->terminateWithError($this->p->t('global', 'errorFindingStudentsForLVA'), 'general');
		if(isError($result)) $this->terminateWithError("Datenbankfehler beim Laden der Studentenliste aus AnweseheitModel->getStudentsForLVAandLEandSemester. Bitte überprüfen sie die Verfügbarkeit und Korrektheit der dort referenzierten Tabellen.");
		
		// this usually happens when there are no students assigned to the lehreinheit yet, usually occurs when opening
		// digi anw tool for future semesters
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'noStudentsFoundV2', [$ma_uid, $le_id]), 'general');
		$students = getData($result);

		$func = function ($value) {
			return $value->prestudent_id;
		};

		$prestudentIds = array_map($func, $students);
		$result = $this->_ci->AnwesenheitModel->getAnwesenheitenEntriesForStudents($prestudentIds, $le_id);
		$anwesenheiten = getData($result);

		$funcPID = function ($value) {
			return $value->person_id;
		};

		$personIds = array_map($funcPID, $students);
		$entschuldigungsstatus = [];
		if($this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$result = $this->_ci->AnwesenheitUserModel->getEntschuldigungsstatusForPersonIds($personIds);
			$entschuldigungsstatus = getData($result);
		}

		$result = $this->_ci->StudiensemesterModel->load($sem_kurzbz);
		$studiensemester = getData($result);

		// fetch all kontrollen -> times can be fetched from all kontrollen -> all entries can be shown
		// block delete (date too old) in UI & deleteAnwesenheitskontrolle API endpoint
		$result = $this->_ci->AnwesenheitModel->getKontrollenForLeId($le_id);
		$kontrollen = getData($result);
		

		$result = $this->_ci->ErhalterModel->load();
		$erhalter = getData($result)[0];

		$a_o_kz = '9' . sprintf("%03s", $erhalter->erhalter_kz);

		$this->terminateWithSuccess(array(
			'students' => $students,
			'anwEntries' => $anwesenheiten,
			'stsem' => $studiensemester,
			'entschuldigtStati' => $entschuldigungsstatus,
			'kontrollen' => $kontrollen,
			'a_o_kz' => $a_o_kz
		));

	}

	/**
	 * POST METHOD
	 * expects parameters 'le_ids', 'lv_id', 'sem_kurzbz'
	 *
	 * alternative tableData fetch, combines students, anwEntries and kontrollen
	 * over one or more lehreinheiten of a lehrveranstaltung. Response shape matches
	 * fetchAllAnwesenheitenByLvaAssigned so the LektorComponent state setup can be reused.
	 */
	public function fetchAllAnwesenheitenByLva() {
		$result = $this->getPostJSON();

		$this->_requireProps($result, array('le_ids', 'lv_id', 'sem_kurzbz'));

		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;
		$le_ids = $result->le_ids;

		if(!is_array($le_ids) || !count($le_ids))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		// every requested lehreinheit has to belong to the authorized lehrveranstaltung
		$leCheck = $this->_ci->AnwesenheitModel->countLehreinheitenInLva($le_ids, $lv_id);
		if(isError($leCheck) || !hasData($leCheck)
			|| ((int) getData($leCheck)[0]->cnt) !== count(array_unique($le_ids))) {
			$this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');
		}

		$result = $this->_ci->AnwesenheitModel->getStudentsForLVAandMultipleLEandSemester($lv_id, $le_ids, $sem_kurzbz, APP_ROOT);

		if(isError($result)) $this->terminateWithError("Datenbankfehler beim Laden der Studentenliste aus AnwesenheitModel->getStudentsForLVAandMultipleLEandSemester. Bitte überprüfen sie die Verfügbarkeit und Korrektheit der dort referenzierten Tabellen.");
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'noStudentsFoundV2', [$this->_uid, implode(', ', $le_ids)]), 'general');
		$students = getData($result);

		$prestudentIds = array_map(function ($value) {
			return $value->prestudent_id;
		}, $students);
		$result = $this->_ci->AnwesenheitModel->getAnwesenheitenEntriesForStudentsInLehreinheiten($prestudentIds, $le_ids);
		$anwesenheiten = getData($result);

		$personIds = array_map(function ($value) {
			return $value->person_id;
		}, $students);
		$entschuldigungsstatus = [];
		if($this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$result = $this->_ci->AnwesenheitUserModel->getEntschuldigungsstatusForPersonIds($personIds);
			$entschuldigungsstatus = getData($result);
		}

		$result = $this->_ci->StudiensemesterModel->load($sem_kurzbz);
		$studiensemester = getData($result);

		$result = $this->_ci->AnwesenheitModel->getKontrollenForLeIds($le_ids);
		$kontrollen = getData($result);

		$result = $this->_ci->ErhalterModel->load();
		$erhalter = getData($result)[0];

		$a_o_kz = '9' . sprintf("%03s", $erhalter->erhalter_kz);

		$this->terminateWithSuccess(array(
			'students' => $students,
			'anwEntries' => $anwesenheiten,
			'stsem' => $studiensemester,
			'entschuldigtStati' => $entschuldigungsstatus,
			'kontrollen' => $kontrollen,
			'a_o_kz' => $a_o_kz
		));
	}
	
	/**
	 * GET METHOD
	 * expects parameters 'prestudent_id', 'lv_id', 'sem_kurzbz'
	 * returns list of anwesenheiten_user entries of student for lva in semester
	 */
	public function getAllAnwesenheitenByStudentByLva()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		$res = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!isSuccess($res)) $this->terminateWithError($res);
		$this->terminateWithSuccess($res);
	}

	/**
	 * POST METHOD
	 * expects parameters 'le_id'
	 * returns list of ids of updated anwesenheit_user rows
	 *
	 */
	public function updateAnwesenheiten()
	{
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('le_id', 'changedAnwesenheiten'));
		$le_id = $result->le_id;

		// check if user is lektor for that le or admin/assistenz
		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		$changedAnwesenheiten = $result->changedAnwesenheiten;

		if(!is_array($changedAnwesenheiten) || !count($changedAnwesenheiten))
			$this->terminateWithSuccess(array());

		// make sure all submitted entries actually belong to the authorized lehreinheit
		$anwesenheitUserIds = array();
		foreach ($changedAnwesenheiten as $entry) {
			if(!property_exists($entry, 'anwesenheit_user_id') || $entry->anwesenheit_user_id === null)
				$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
			$anwesenheitUserIds[] = $entry->anwesenheit_user_id;
		}

		$foreignCheck = $this->_ci->AnwesenheitUserModel->countEntriesNotInLehreinheit($anwesenheitUserIds, $le_id);
		if(isError($foreignCheck) || !hasData($foreignCheck)
			|| ((int) getData($foreignCheck)[0]->cnt) > 0) {
			$this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');
		}

		$result = $this->_ci->AnwesenheitUserModel->updateAnwesenheiten($changedAnwesenheiten, true);

		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess(getData($result));
	}

	/**
	 * POST METHOD
	 * expects parameters 'le_id'
	 *
	 * looks for currently active anwesenheitskontrolle for given lehreinheit
	 *
	 * returns (
	 *  	1. qr code svg image to render in frontend client
	 *  	2. url which is baked into qr code for debugging puposes
	 *  	3. zugangscode to display on its own
	 *  	4. id of anwesenheitskontrolle which has to exist for the found qr code to be valid with
	 *  	5. count of already checked in students (anwesend or entschuldigt)
	 * ) OR 'NO QR FOUND' message
	 */
	public function getExistingQRCode()
	{
		$result = $this->getPostJSON();

		$this->_requireProps($result, array('le_id'));

		$le_id = $result->le_id;
		
		// check for active codes of LE from anw-kontrollen $uid has created
		// -> avoid jumping in anwesenheitskontrolle of another lektor 
		$resultQR = $this->_ci->QRModel->getActiveCodeForLE($le_id, getAuthUID());

		if(!hasData($resultQR)) $this->terminateWithSuccess($this->p->t('global', 'noExistingKontrolleFound'));

		$qrcode = $this->_buildQRCode();

		$anwesenheit_id = $resultQR->retval[0]->anwesenheit_id;
		$shortHash = $resultQR->retval[0]->zugangscode;
		if($shortHash) { // resend existing qr
			$url = $this->getQRURLLink($shortHash);
			$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountsForAnwesenheitId($anwesenheit_id,
				$this->_ci->config->item('ANWESEND_STATUS'),
				$this->_ci->config->item('ABWESEND_STATUS'),
				$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

			$kontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);

			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0], 'kontrolle' => getData($kontrolle)[0]));
		}

		// check row exists but has no zugangscode -> nothing to resume
		$this->terminateWithSuccess($this->p->t('global', 'noExistingKontrolleFound'));
	}

	/**
	 * POST METHOD
	 * expects parameters 'anwesenheit_id'
	 *
	 * generates a new hashCode and QR code image for existing anwesenheitskontrolle
	 *
	 * returns (
	 *    1. qr code svg image to render in frontend client
	 *    2. url which is baked into qr code for debugging puposes
	 *    3. zugangscode to display on its own
	 *    4. id of anwesenheitskontrolle which has to exist for the found qr code to be valid with
	 *  )
	 */
	public function regenerateQRCode()
	{
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('anwesenheit_id'));
		$anwesenheit_id = $result->anwesenheit_id;

		$this->_loadKontrolleAuthorized($anwesenheit_id);

		// create new qr, insert for anwesenheit and send back. Delete old one after regeneration in seperate call
		$qrcode = $this->_buildQRCode();

		$shortHash = $this->_createUniqueZugangscode($anwesenheit_id);
		$url = $this->getQRURLLink($shortHash);

		$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));
	}
	
	/**
	 * terminates with 'missingParameters' error if any of the given properties is missing on the POST payload
	 */
	private function _requireProps($obj, array $props)
	{
		foreach ($props as $prop) {
			if (!property_exists($obj, $prop))
				$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}
	}

	private function _buildQRCode()
	{
		return new QRCode(new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => $this->_ci->config->item('QR_SCALE')
		]));
	}

	/**
	 * generates a unique zugangscode, inserts it for the given kontrolle and returns it
	 */
	private function _createUniqueZugangscode($anwesenheit_id)
	{
		do {
			// even md5 is way too secure when trimming hashcode anyways
			// trim hashcode for people entering manually
			$shortHash = substr(hash('md5', generateToken()), 0, 8);
			$check = $this->_ci->QRModel->loadWhere(array('zugangscode' => $shortHash));
		} while(hasData($check));

		$insert = $this->_ci->QRModel->insert(array(
			'zugangscode' => $shortHash,
			'anwesenheit_id' => $anwesenheit_id,
			'insertamum' => date('Y-m-d H:i:s'),
			'insertvon' => $this->_uid
		));

		if (isError($insert))
			$this->terminateWithError($this->p->t('global', 'errorSavingNewQRCode'), 'general');

		return $shortHash;
	}

	/**
	 * loads the kontrolle for given anwesenheit_id and checks that the caller
	 * is admin or teaches its lehreinheit; terminates otherwise
	 */
	private function _loadKontrolleAuthorized($anwesenheit_id)
	{
		$resultKontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);
		if(!hasData($resultKontrolle))
			$this->terminateWithError($this->p->t('global', 'errorKontrolleDoesNotExist'), 'general');

		$kontrolle = getData($resultKontrolle)[0];

		if(!$this->isAdminOrTeachesLE($kontrolle->lehreinheit_id))
			$this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		return $kontrolle;
	}

	private function getQRURLLink($shortHash) {
		if(defined('CIS4') && CIS4) {
			$ci3BootstrapFilePath = "cis.php";
		} else {
			$ci3BootstrapFilePath = "index.ci.php";
		}
		return APP_ROOT.$ci3BootstrapFilePath."/extensions/FHC-Core-Anwesenheiten/Profil/Scan/$shortHash";
	}

	/**
	 * POST METHOD
	 * expects parameters 'anwesenheit_id', 'zugangscode'
	 *
	 * usually called a short time after regenerateQR, used to delete old Code from DB so Students could potentially
	 * still check in with their soon to be invalid QR
	 */
	public function degenerateQRCode()
	{
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('anwesenheit_id', 'zugangscode'));
		$anwesenheit_id = $result->anwesenheit_id;
		$zugangscode = $result->zugangscode;

		$this->_loadKontrolleAuthorized($anwesenheit_id);

		$deleteresp = $this->_ci->QRModel->delete(array(
			'zugangscode' => $zugangscode,
			'anwesenheit_id' => $anwesenheit_id
		));

		if(isError($deleteresp)) $this->terminateWithError($this->p->t('global', 'errorDegeneratingQRCode'), 'general');

		$this->terminateWithSuccess(getData($deleteresp));
	}

	/**
	 * POST METHOD
	 * expects parameters 'le_id', 'datum', 'beginn', 'ende'
	 *
	 * Method used to create new anwesenheitskontrolle
	 * Either finds existing Kontrolle or creates new one, then handles lookup/creation of corresponding QR Code
	 * returns (
	 *  	1. qr code svg image to render in frontend client
	 *  	2. url which is baked into qr code for debugging puposes
	 *  	3. zugangscode to display on its own
	 *  	4. id of anwesenheitskontrolle which has to exist for the found qr code to be valid with
	 *  	5. count of already checked in students (anwesend or entschuldigt)
	 * ) OR AN ERROR MESSAGE
	 */
	public function getNewQRCode()
	{
		$result = $this->getPostJSON();

		list($le_id, $von, $bis) = $this->_validateAndPrepareKontrolle($result);

		$qrcode = $this->_buildQRCode();

		// kontrolle, qr code and user entries have to be created together
		$this->_ci->db->trans_start();

		$anwesenheit_id = $this->_insertKontrolle($le_id, $von, $bis);

		$shortHash = $this->_createUniqueZugangscode($anwesenheit_id);
		$url = $this->getQRURLLink($shortHash);

		// insert Anwesenheiten entries of every Student as Abwesend
		$transactionResult = $this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries(
			$le_id,
			$anwesenheit_id,
			$von, $bis,
			$this->_ci->config->item('ABWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

		$this->_ci->db->trans_complete();

		if($transactionResult == false || $this->_ci->db->trans_status() === false) {
			$this->terminateWithError($this->p->t('global', 'errorInsertUserAnwEntries'), 'general');
		}

		// count entschuldigt entries
		$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountsForAnwesenheitId($anwesenheit_id,
			$this->_ci->config->item('ANWESEND_STATUS'),
			$this->_ci->config->item('ABWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

		$kontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);

		$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0], 'kontrolle' => getData($kontrolle)[0]));
	}

	public function insertAnwWithoutQR() {

		$result = $this->getPostJSON();

		list($le_id, $von, $bis) = $this->_validateAndPrepareKontrolle($result);

		// kontrolle and user entries have to be created together
		$this->_ci->db->trans_start();

		$anwesenheit_id = $this->_insertKontrolle($le_id, $von, $bis);

		// no qr scan happening -> insert every Student as Anwesend
		$transactionResult = $this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries(
			$le_id,
			$anwesenheit_id,
			$von, $bis,
			$this->_ci->config->item('ANWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

		$this->_ci->db->trans_complete();

		if($transactionResult == false || $this->_ci->db->trans_status() === false) {
			$this->terminateWithError($this->p->t('global', 'errorInsertUserAnwEntries'), 'general');
		}

		$kontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);

		$this->terminateWithSuccess($kontrolle);
	}

	/**
	 * shared validation/preparation for creating a new kontrolle:
	 * checks params, authorization, reach/termin rules and time collisions
	 * returns array($le_id, $von, $bis, $dateString)
	 */
	private function _validateAndPrepareKontrolle($result)
	{
		$this->_requireProps($result, array('le_id', 'datum', 'beginn', 'ende'));

		$le_id = $result->le_id;
		$date = $result->datum;

		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		if(isEmptyString($le_id) || $le_id === 'null' || $date === 'null') {
			$this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');
		}

		$beginn = $result->beginn;
		$von = date('Y-m-d H:i:s', mktime($beginn->hours, $beginn->minutes, $beginn->seconds, $date->month, $date->day, $date->year));

		$ende = $result->ende;
		$bis = date('Y-m-d H:i:s', mktime($ende->hours, $ende->minutes, $ende->seconds, $date->month, $date->day, $date->year));

		$dateString = sprintf('%04d-%02d-%02d', $date->year, $date->month, $date->day);
		$dateTime = strtotime($dateString);
		$reach = $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH');
		$dateLimit = strtotime("-$reach day");

		$leResult = $this->_ci->LehreinheitModel->load($le_id);
		if(!hasData($leResult)) $this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');
		$le = getData($leResult)[0];

		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
		if ($dateTime < $dateLimit && !$isAdmin) {
			// lektor chooses to run kontrolle on old termin outside of usual reach -> check if that termin exists
			$termineResult = $this->_ci->AnwesenheitModel->getLETermine($le_id);
			if(isError($termineResult) || !hasData($termineResult)) $this->terminateWithError($this->p->t('global', 'providedDateTooOld'), 'general');

			$isAllowed = false;
			foreach(getData($termineResult) AS $value) {
				if($value->datum == $dateString) $isAllowed = true;
			}

			if(!$isAllowed) {
				$this->terminateWithError($this->p->t('global', 'providedDateTooOld'), 'general');
			}
		}

		if(!$this->checkTimesAgainstOtherKontrollen($von, $bis, $dateString, $le_id)) {
			$this->terminateWithError($this->p->t('global', 'errorKontrolleTimesCollide'), 'general');
		}

		return array($le_id, $von, $bis, $dateString);
	}

	private function _insertKontrolle($le_id, $von, $bis)
	{
		$insert = $this->_ci->AnwesenheitModel->insert(array(
			'lehreinheit_id' => $le_id,
			'insertamum' => date('Y-m-d H:i:s'),
			'insertvon' => getAuthUID(),
			'von' => $von,
			'bis' => $bis
		));

		if (isError($insert))
			$this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');

		return getData($insert);
	}

	private function checkTimesAgainstOtherKontrollen($von, $bis, $datum, $le_id, $anwesenheit_id = null) {

		// normalize to time-of-day strings regardless of input shape (full datetime or time string)
		$vonTime = date('H:i:s', strtotime($von));
		$bisTime = date('H:i:s', strtotime($bis));

		// kontrollen laden by le & date
		$result = $this->_ci->AnwesenheitModel->getKontrollenForLeIdAndDate($le_id, $datum);

		if(isError($result)) $this->terminateWithError($this->p->t('global', 'errorCheckingKontrollenOnDate'), 'general');
		else if (!hasData($result)) return true; // no other kontrollen -> no collision

		$kontrollen = getData($result);

		// check against other von/bis

		// when editing dont compare with overlap with its own timespan
		$kontrollenToCheck = null;
		if($anwesenheit_id !== null) {
			$kontrollenToCheck =  array_filter($kontrollen, function($item) use ($anwesenheit_id) {
				return isset($item->anwesenheit_id) && $item->anwesenheit_id !== null && $item->anwesenheit_id !== $anwesenheit_id;
			});
		} else {
			$kontrollenToCheck = $kontrollen;
		}

		foreach ($kontrollenToCheck as $k) {
			$kVon = $k->von; // e.g., "08:30:00"
			$kBis = $k->bis; // e.g., "10:00:00"

			// lexical comparison works for zero-padded H:i:s time strings
			// also blocks same start as end
			if ($vonTime < $kBis && $bisTime > $kVon) {
				return false;
			}
		}

		// return a bool
		return true;
	}
	
	private function _handleResultQRExisting($resultQR, $qrcode, $anwesenheit_id)
	{
		// maybe qr exists still in edge cases so try and resend
		// should never be the case but fringe cases might appear
		if(hasData($resultQR)) { // resend existing qr
			$shortHash = $resultQR->retval[0]->zugangscode;
		} else { // create new qr since old one must have been cleaned
			$shortHash = $this->_createUniqueZugangscode($anwesenheit_id);
		}

		$url = $this->getQRURLLink($shortHash);

		// either way gather statuses and send back result
		$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountsForAnwesenheitId($anwesenheit_id,
			$this->_ci->config->item('ANWESEND_STATUS'),
			$this->_ci->config->item('ABWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

		$kontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);

		$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0], 'kontrolle' => getData($kontrolle)[0]));
	}

	/**
	 * POST METHOD
	 * expects 'anwesenheit_id', 'lv_id'
	 * deletes extisting QR Code
	 * returns deleted id or error message
	 */
	public function deleteQRCode()
	{
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('anwesenheit_id', 'lv_id'));
		$anwesenheit_id = $result->anwesenheit_id;
		$lv_id = $result->lv_id;

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		// make sure the kontrolle whose codes get deleted actually belongs to a le the caller teaches
		$this->_loadKontrolleAuthorized($anwesenheit_id);

		$deleteresp = $this->_ci->QRModel->delete(array(
			'anwesenheit_id' => $anwesenheit_id
		));
		if(isError($deleteresp)) {
			$this->terminateWithError($this->p->t('global', 'errorDeletingAnwKontrolle'), 'general');
		}

		$this->terminateWithSuccess(getData($deleteresp));
	}

	/**
	 * @param $le_id
	 * @return bool
	 *
	 * checks Berechtigungen for Admin or Lektor and is Teaching lehreinheit
	 */
	private function isAdminOrTeachesLE($le_id)
	{
		$leResult = $this->_ci->LehreinheitModel->load($le_id);
		if(!hasData($leResult)) return false;
		$le = getData($leResult)[0];

		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
		if($isAdmin) return true;

		$isLektor = $this->_ci->permissionlib->isBerechtigt('extension/anw_r_lektor');

		if($isLektor) {
			$lektorIsTeaching = $this->AnwesenheitModel->getLektorIsTeachingLE($le_id, $this->_uid);
			if(!isError($lektorIsTeaching) && hasData($lektorIsTeaching)
				&& ((int) getData($lektorIsTeaching)[0]->teaches) > 0) return true;
		}

		return false;
	}

	/**
	 * @param $lva_id
	 * @return bool
	 *
	 * checks Berechtigungen for Admin or Lektor and is Teaching lehrveranstaltung
	 */
	private function isAdminOrTeachesLva($lva_id)
	{

		$isAdmin = $this->isAdmin($lva_id);
		if($isAdmin) return true;

		$isLektor = $this->_ci->permissionlib->isBerechtigt('extension/anw_r_lektor');

		if($isLektor) {
			$lektorIsTeaching = $this->AnwesenheitModel->getLektorIsTeachingLva($lva_id, $this->_uid);
			if(!isError($lektorIsTeaching) && hasData($lektorIsTeaching)
				&& ((int) getData($lektorIsTeaching)[0]->teaches) > 0) return true;
		}

		return false;
	}

	private function isAdmin($lva_id) {
		$lva = new lehrveranstaltung();
		$lva->load($lva_id);
		$oes = $lva->getAllOe();
		$oes[]=$lva->oe_kurzbz;

		return $this->_ci->permissionlib->isBerechtigtMultipleOe('extension/anw_r_full_assistenz', $oes);
	}

	/**
	 * POST METHOD
	 * expects parameters 'le_id', 'date'
	 *
	 * deletes anwesenheitskontrollen and their corresponding user entries from db
	 * also deletes entries from history table and writes latest state into db logs
	 */
	public function deleteAnwesenheitskontrolle()
	{
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('le_id', 'date', 'anwesenheit_id'));
		$le_id = $result->le_id;
		$date = $result->date;
		$anwesenheit_id = $result->anwesenheit_id;

		// check if user is lektor for that le or admin/assistenz
		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		$reach = $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH');
		$dateLimit = strtotime("-$reach day");

		$resultKontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);

		if(!hasData($resultKontrolle)) {
			$this->terminateWithError($this->p->t('global', 'errorDeleteKontrolleKeineLEAnDatum', [
				'le_id' => $le_id,
				'day' => $date->day,
				'month' => $date->month,
				'year' => $date->year
			]), 'general');
		}
		$kontrolle = getData($resultKontrolle)[0];
		$anwesenheit_id = $kontrolle->anwesenheit_id;

		// authorize against the lehreinheit the kontrolle actually belongs to
		if(!$this->isAdminOrTeachesLE($kontrolle->lehreinheit_id))
			$this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		$leResult = $this->_ci->LehreinheitModel->load($kontrolle->lehreinheit_id);
		$le = getData($leResult)[0];

		// check against kontrolle insert date since nominal von/bis date does not tell about the
		// actuality of the check
		$insertamum = $kontrolle->insertamum;
		$dateInsert = new DateTime($insertamum);
		$insertFormatted = $dateInsert->format('Y-m-d');
		$insertDateTime = strtotime($insertFormatted);

		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
		if ($insertDateTime < $dateLimit && !$isAdmin) {
			$this->terminateWithError($this->p->t('global', 'providedDateTooOld'), 'general');
		}


		$result = $this->_ci->AnwesenheitUserModel->getAllForKontrolle($anwesenheit_id);
		if(isError($result)) {
			$this->terminateWithError($this->p->t('global', 'errorDeleteKontrolleEntryAnDatum', [
				'le_id' => $le_id,
				'day' => $date->day,
				'month' => $date->month,
				'year' => $date->year
			]), 'general');
		}
		$anwesenheiten = getData($result);


		// write log entry about changed kontrollzeiten
		$this->_ci->WebservicelogModel->insert(array(
			'webservicetyp_kurzbz' => 'content',
			'beschreibung' => 'AnwKontrolle Delete',
			'request_data' => json_encode(array($kontrolle, $anwesenheiten)),
			'execute_user' => getAuthUID(),
			'execute_time' => 'NOW()'
		));

		// history, user entries, qr codes and kontrolle have to go together - all or nothing
		$this->_ci->db->trans_begin();

		$resultDeleteHistory = $this->_ci->AnwesenheitUserHistoryModel->deleteAllByAnwesenheitId($anwesenheit_id);

		// delete user anwesenheiten by anwesenheit_id of kontrolle
		$resultDeleteUser = $this->_ci->AnwesenheitUserModel->deleteAllByAnwesenheitId($anwesenheit_id);

		// delete leftover qr codes (fk on tbl_anwesenheit_check is ON DELETE RESTRICT,
		// leftover codes would block the kontrolle delete)
		$resultDeleteQR = $this->_ci->QRModel->delete(array('anwesenheit_id' => $anwesenheit_id));

		// delete kontrolle itself
		$resultDeleteKontrolle = $this->_ci->AnwesenheitModel->delete(array('anwesenheit_id' => $anwesenheit_id));

		if($this->_ci->db->trans_status() === false
			|| isError($resultDeleteHistory) || isError($resultDeleteUser)
			|| isError($resultDeleteQR) || isError($resultDeleteKontrolle)) {

			$this->_ci->db->trans_rollback();

			$this->terminateWithError($this->p->t('global', 'errorDeleteKontrolleEntryAnDatum', [
				'le_id' => $le_id,
				'day' => $date->day,
				'month' => $date->month,
				'year' => $date->year
			]), 'general');
		}

		$this->_ci->db->trans_commit();

		$this->terminateWithSuccess($this->p->t('global', 'successDeleteKontrolleEntryAnDatum', [
			'le_id' => $le_id,
			'day' => $date->day,
			'month' => $date->month,
			'year' => $date->year
		]));
	}

	/**
	 * POST METHOD
	 * expects parameter 'anwesenheit_id', 'lv_id'
	 *
	 * returns checkIn count for anwesenheitskontrolle
	 */
	public function pollAnwesenheiten() {
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('anwesenheit_id', 'lv_id'));
		$anwesenheit_id = $result->anwesenheit_id;
		$lv_id = $result->lv_id;

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		// make sure the polled kontrolle actually belongs to the authorized lva
		$belongsCheck = $this->_ci->AnwesenheitModel->kontrolleBelongsToLva($anwesenheit_id, $lv_id);
		if(isError($belongsCheck) || !hasData($belongsCheck)
			|| ((int) getData($belongsCheck)[0]->cnt) === 0) {
			$this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');
		}

		$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountsForAnwesenheitId($anwesenheit_id,
			$this->_ci->config->item('ANWESEND_STATUS'),
			$this->_ci->config->item('ABWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));
		$this->terminateWithSuccess(getData($countPoll)[0]);
	}

	/**
	 * POST METHOD
	 * expects parameters 'ids', 'lv_id', 'sem_kurzbz'
	 *
	 * returns list of prestudent_ids and their corresponding anwesneheits quota for given lva in semester
	 */
	public function getAnwQuoteForPrestudentIds() {
		$result = $this->getPostJSON();
		$this->_requireProps($result, array('ids', 'lv_id', 'sem_kurzbz'));
		$ids = $result->ids;
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		$result = $this->_ci->AnwesenheitUserModel->getAnwQuoteForPrestudentIds($ids, $lv_id,  $sem_kurzbz);

		if(!isSuccess($result)) $this->terminateWithError($result);

		$this->terminateWithSuccess($result);
	}
	
	public function restartKontrolle() {
		$result = $this->getPostJSON();

		$this->_requireProps($result, array('le_id', 'datum', 'anwesenheit_id'));

		$anwesenheit_id = $result->anwesenheit_id;
		$le_id = $result->le_id;
		$date = $result->datum;

		if(isEmptyString($le_id) || $le_id === 'null' || $date === 'null') {
			$this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');
		}

		// authorizes against the lehreinheit the kontrolle actually belongs to
		$this->_loadKontrolleAuthorized($anwesenheit_id);

		$qrcode = $this->_buildQRCode();

		$resultQR = $this->_ci->QRModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));

		$this->_handleResultQRExisting($resultQR, $qrcode, $anwesenheit_id);
	}
	
	public function updateKontrolle() {
		$result = $this->getPostJSON();

		$this->_requireProps($result, array('le_id', 'von', 'bis', 'anwesenheit_id'));

		$anwesenheit_id = $result->anwesenheit_id;
		$le_id = $result->le_id;
		$von = $result->von;
		$bis = $result->bis;

		// authorizes against the lehreinheit the kontrolle actually belongs to
		$kontrolle = $this->_loadKontrolleAuthorized($anwesenheit_id);

		// for the logs
		$oldVon = $kontrolle->von;
		$oldBis = $kontrolle->bis;

		$vonDate = new DateTime($kontrolle->von);
		$vonDate->setTime($von->hours, $von->minutes, $von->seconds);
		$bisDate = new DateTime($kontrolle->bis);
		$bisDate->setTime($bis->hours, $bis->minutes, $bis->seconds);

		$date = new DateTime($kontrolle->von);
		$dateString = $date->format('Y-m-d');
		
		if(!$this->checkTimesAgainstOtherKontrollen($vonDate->format('H:i:s'), $bisDate->format('H:i:s'), $dateString, $kontrolle->lehreinheit_id, $anwesenheit_id)) {
			$this->terminateWithError($this->p->t('global', 'errorKontrolleTimesCollide'), 'general');
		}

		$update = $this->_ci->AnwesenheitModel->update($anwesenheit_id, array(
			'von' => $vonDate->format('Y-m-d H:i:s'),
			'bis' => $bisDate->format('Y-m-d H:i:s'),
			'updateamum' => date('Y-m-d H:i:s'),
			'updatevon' => getAuthUID()
		));
		
		if(isError($update)) {
			$this->terminateWithError($this->p->t('global', 'errorUpdateAnwKontrolle'), 'general');
		}
		
		// write log entry about changed kontrollzeiten
		$this->_ci->WebservicelogModel->insert(array(
			'webservicetyp_kurzbz' => 'content',
			'beschreibung' => 'AnwKontrolle Update',
			'request_data' => json_encode(array(
				'anwesenheit_id' => $anwesenheit_id,
				'newVon' => $vonDate->format('Y-m-d H:i:s'),
				'newBis' => $bisDate->format('Y-m-d H:i:s'),
				'oldVon' => $oldVon,
				'oldBis' => $oldBis,
				'updateamum' => date('Y-m-d H:i:s'),
				'updatevon' => getAuthUID()
			)),
			'execute_user' => getAuthUID(),
			'execute_time' => 'NOW()'
		));
		
		// finally recalculate valid entschuldigung stati since they depend on kontrolle von & bis
		
		// find students of le whose entschuldigt status is not anymore valid when times change
		$resultCompare = $this->_ci->EntschuldigungModel->compareStatusZeitenForLE($vonDate->format('Y-m-d H:i:s'), $bisDate->format('Y-m-d H:i:s'), $oldVon, $oldBis, $kontrolle->lehreinheit_id);
//		$this->addMeta('$resultCompare', $resultCompare);
		if(hasData($resultCompare)) {
			$changed = getData($resultCompare);
//			$this->addMeta('changedEntStati', $changed);

			$changedPrestudentIDFunc = function ($value) {
				return $value->prestudent_id;
			};

			$changedPrestudentIDarray = array_map($changedPrestudentIDFunc, $changed);
//			$this->addMeta('$changedPrestudentIDarray', $changedPrestudentIDarray);
			
			// find the last status from history table by version number that does not carry entschuldigt status 
			$changedAnwesenheiten = $this->AnwesenheitUserModel->findLastDifferentStatus($changedPrestudentIDarray, $anwesenheit_id);
//			$this->addMeta('$changedAnwesenheiten', $changedAnwesenheiten);
			if(hasData($changedAnwesenheiten)) {
				$updateAnwesenheit = $this->AnwesenheitUserModel->updateAnwesenheiten(getData($changedAnwesenheiten), true);
//				$this->addMeta('$updateAnwesenheit', $updateAnwesenheit);
				if (isError($updateAnwesenheit))
					$this->terminateWithError($updateAnwesenheit);

			}
		}
		$this->terminateWithSuccess($update);
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
			isEmptyString($ma_uid) ||
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
//			$this->addMeta($leRow->lehreinheit_id, $result);
			if(!isSuccess($result)) $this->terminateWithError(getError($result));
			$leTermine = getData($result);
			
			// if someone knows how to this one in the previous sql query, feel free to change it and tell me - johann
			$leTermineGrouped = [];
			// group le termine only with consecutive hours, detect the odd case of same lesson
			// on the same day in two distinct time blocks eg hour 3-4 + later on hour 11-14 
			if($leTermine !== null) {
				forEach($leTermine as $distinctLesson) {
					if(!count($leTermineGrouped)) { // arr empty, insert first stunde row of day and le
						$leTermineGrouped[] = $distinctLesson;
					} else if($leTermineGrouped[count($leTermineGrouped) - 1]->stunde == ($distinctLesson->stunde - 1) 
						&& $leTermineGrouped[count($leTermineGrouped) - 1]->datum == $distinctLesson->datum) {
						$leTermineGrouped[count($leTermineGrouped) - 1]->ende = $distinctLesson->ende;
						$leTermineGrouped[count($leTermineGrouped) - 1]->stunde = $distinctLesson->stunde;
					} else { // new block detected
						$leTermineGrouped[] = $distinctLesson;
					}
				}
			}
			

			$allLeTermine[$leRow->lehreinheit_id] = $leTermineGrouped;
		}


		$this->terminateWithSuccess(array($leForLvaAndMA, $allLeTermine));

	}

	public function getLehreinheitenForLehrveranstaltung() {
		$lva_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		if($lva_id === 'null' ||  $sem_kurzbz === 'null') {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		if(isEmptyString($lva_id) ||
			isEmptyString($sem_kurzbz) ) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$berechtigt = $this->isAdminOrTeachesLva($lva_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		$result = $this->_ci->AnwesenheitModel->getAllLehreinheitenForLva($lva_id, $sem_kurzbz);
		
		if(!isSuccess($result)) $this->terminateWithError(getError($result));
		$leForLva = getData($result);

		if(is_null($leForLva))
		{
			$this->terminateWithSuccess(array([], []));
		}
		// filter for unique le_id keys
		$distinctLeId = array_values(array_reduce($leForLva, function ($carry, $leRow) {
			// use the name as a key to ensure uniqueness
			$carry[$leRow->lehreinheit_id] = $leRow;
			return $carry;
		}, []));

		$allLeTermine = [];

		forEach($distinctLeId as $leRow)
		{
			$result = $this->_ci->AnwesenheitModel->getLETermine($leRow->lehreinheit_id);
//			$this->addMeta($leRow->lehreinheit_id, $result);
			if(!isSuccess($result)) $this->terminateWithError(getError($result));
			$leTermine = getData($result);
			
			$leTermineGrouped = [];
			// group le termine only with consecutive hours, detect the odd case of same lesson
			// on the same day in two distinct time blocks eg hour 3-4 + later on hour 11-14 
			if($leTermine !== null) {
				forEach($leTermine as $distinctLesson) {
					if(!count($leTermineGrouped)) { // arr empty, insert first stunde row of day and le
						$leTermineGrouped[] = $distinctLesson;
					} else if($leTermineGrouped[count($leTermineGrouped) - 1]->stunde == ($distinctLesson->stunde - 1)
						&& $leTermineGrouped[count($leTermineGrouped) - 1]->datum == $distinctLesson->datum) {
						$leTermineGrouped[count($leTermineGrouped) - 1]->ende = $distinctLesson->ende;
						$leTermineGrouped[count($leTermineGrouped) - 1]->stunde = $distinctLesson->stunde;
					} else { // new block detected
						$leTermineGrouped[] = $distinctLesson;
					}
				}
			}


			$allLeTermine[$leRow->lehreinheit_id] = $leTermineGrouped;
		}


		$this->terminateWithSuccess(array($leForLva, $allLeTermine));
	}
	
	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}