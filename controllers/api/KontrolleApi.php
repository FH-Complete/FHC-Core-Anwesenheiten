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

				// tableData fetch lektor-student page
				'getAllAnwesenheitenByStudentByLva' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),
				
				// changing status or note of anwesenheit user entry
				'updateAnwesenheiten' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),

				// requests new code when timer reaches its limit during kontrolle
				'regenerateQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),
				
				// deletes old code from db when refreshed is received
				'degenerateQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),
				
				// start of a new kontrolle, inserts anw_user entries
				'getNewQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),

				// start & end of kontrolle without the qr part for lessons where scanning is not intended
				'insertAnwWithoutQR' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:rw'),
				
				// requests qr code for existing kontrolle
				'restartKontrolle' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),

				// update von/bis times for existing kontrolle
				'updateKontrolle' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),

				// in case kontrolle was not stopped intentionally jump right back in on startup
				'getExistingQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),

				// method called at end of kontrolle to clean up qr code
				'deleteQRCode' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),
				
				// delete kontrolle and all corresponding anw_user entries
				'deleteAnwesenheitskontrolle' => array('extension/anw_r_lektor:rw', 'extension/anw_r_full_assistenz:r'),

				// gets checkin & entschuldigt count for ongoing kontrolle
				'pollAnwesenheiten' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),

				// reloads just the sum% when anwesenheiten have been updated to avoid full reload
				'getAnwQuoteForPrestudentIds' => array('extension/anw_r_lektor:r', 'extension/anw_r_full_assistenz:r'),
			
				// loads le dropdown options
				'getLehreinheitenForLehrveranstaltungAndMaUid' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_lektor:r'),

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
		// Loads LogLib with different debug trace levels to get data of the job that extends this class
		// It also specify parameters to set database fields
		$this->_ci->load->library('LogLib', array(
			'classIndex' => 5,
			'functionIndex' => 5,
			'lineIndex' => 4,
			'dbLogType' => 'API', // required
			'dbExecuteUser' => 'RESTful API',
			'requestId' => 'API',
			'requestDataFormatter' => function ($data) {
				return json_encode($data);
			}
		), 'logLib');


		$this->loadPhrases(
			array(
				'global',
				'ui'
			)
		);

		require_once(FHCPATH.'include/lehreinheit.class.php');
		require_once(FHCPATH.'include/lehrveranstaltung.class.php');

		$this->_setAuthUID(); // sets property uid
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
		$this->load->helper('hlp_sancho_helper');
	}

	/**
	 * POST METHOD
	 * expects parameters 'le_id', 'lv_id', 'sem_kurzbz', 'ma_uid', 'date'
	 *
	 * main setup & state management Method of LektorComponent and fulfills several functions
	 * in order to keep state management simple in the prototype phase. High potential for optimization.
	 *
	 * returns (
	 *    1. list of students attending le in semester on date for lektor
	 * 	  2. anwesenheiten_user entries of students
	 *    3. object of current studiensemester (used to calculate zusätze like outgoing, incoming, etc of students)
	 *    4. a list of every accepted entschuldigungsrange for students in this lesson
	 *    5. existing anwesenheitskontrollen to delete later on
	 *    6. some lektor and lehreinheit viewData for 'LektorComponent'
	 *    7. termine for lehreinheit in stundenplan
	 * )
	 */
	public function fetchAllAnwesenheitenByLvaAssigned()
	{

		$result = $this->getPostJSON();

		if(!property_exists($result, 'le_id') || !property_exists($result, 'lv_id')
			|| !property_exists($result, 'sem_kurzbz') || !property_exists($result, 'ma_uid')
			|| !property_exists($result, 'date')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;
		$le_id = $result->le_id;
		$ma_uid = $result->ma_uid;
		$date = $result->date;

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		$result = $this->_ci->AnwesenheitModel->getStudentsForLVAandLEandSemester($lv_id, $le_id, $sem_kurzbz, APP_ROOT);

		if(isError($result)) $this->terminateWithError($this->p->t('global', 'errorFindingStudentsForLVA'), 'general');
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
		

		$result = $this->_ci->AnwesenheitModel->getLehreinheitAndLektorInfo($le_id, $ma_uid, $date);
		$lektorLehreinheitData = getData($result);

		$result = $this->_ci->ErhalterModel->load();
		$erhalter = getData($result)[0];

		$a_o_kz = '9' . sprintf("%03s", $erhalter->erhalter_kz);

		$this->terminateWithSuccess(array($students, $anwesenheiten, $studiensemester, $entschuldigungsstatus, $kontrollen, $lektorLehreinheitData, null, $a_o_kz));

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
		$le_id = $result->le_id;

		// check if user is lektor for that le or admin/assistenz
		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		$changedAnwesenheiten = $result->changedAnwesenheiten;


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

		if(!property_exists($result, 'le_id')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$le_id = $result->le_id;
		
		// check for active codes of LE from anw-kontrollen $uid has created
		// -> avoid jumping in anwesenheitskontrolle of another lektor 
		$resultQR = $this->_ci->QRModel->getActiveCodeForLE($le_id, getAuthUID());

		if(!hasData($resultQR)) $this->terminateWithSuccess($this->p->t('global', 'noExistingKontrolleFound'));
		
		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

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
		$anwesenheit_id = $result->anwesenheit_id;

		// create new qr, insert for anwesenheit and send back. Delete old one after regeneration in seperate call
		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		do {
			$token = generateToken();
			$hash = hash('md5', $token); // even md5 is way too secure when trimming hashcode anyways
			$shortHash = substr($hash, 0, 8);// trim hashcode for people entering manually

			$url = $this->getQRURLLink($shortHash);

			$check = $this->_ci->QRModel->loadWhere(array('zugangscode' => $shortHash));
		} while(hasData($check));

		$insert = $this->_ci->QRModel->insert(array(
			'zugangscode' => $shortHash,
			'anwesenheit_id' => $anwesenheit_id,
			'insertamum' => date('Y-m-d H:i:s'),
			'insertvon' => $this->_uid
		));

		if (isError($insert))
			$this->terminateWithError('Fehler beim Speichern', 'general');

		$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));
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
		$anwesenheit_id = $result->anwesenheit_id;
		$zugangscode = $result->zugangscode;

		$deleteresp = $this->_ci->QRModel->delete(array(
			'zugangscode' => $zugangscode,
			'anwesenheit_id' => $anwesenheit_id
		));

		if(!$deleteresp) $this->terminateWithError($this->p->t('global', 'errorDegeneratingQRCode'), 'general');

		return $deleteresp;
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

		if(!property_exists($result, 'le_id') || !property_exists($result, 'datum')
			|| !property_exists($result, 'beginn') || !property_exists($result, 'ende')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$le_id = $result->le_id;
		$date = $result->datum;

		$berechtigt = $this->isAdminOrTeachesLe($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		$beginn = $result->beginn;
		$von = date('Y-m-d H:i:s', mktime($beginn->hours, $beginn->minutes, $beginn->seconds, $date->month, $date->day, $date->year));

		$ende = $result->ende;
		$bis = date('Y-m-d H:i:s', mktime($ende->hours, $ende->minutes, $ende->seconds, $date->month, $date->day, $date->year));

		if(isEmptyString($le_id) || $le_id === 'null'
			|| $date === 'null' || $von === 'null' || $bis === 'null') {
			$this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');
		}

		$dateString = sprintf('%04d-%02d-%02d', $date->year, $date->month, $date->day);
		$dateTime = strtotime($dateString);
		$reach = $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH');
		$dateLimit = strtotime("-$reach day");

		$le = new lehreinheit();
		$le->load($le_id);
		
		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
		if ($dateTime < $dateLimit && !$isAdmin) { 
			// lektor chooses to run kontrolle on old termin outside of usual reach -> check if that termin exists
			$result = $this->_ci->AnwesenheitModel->getLETermine($le_id);
			if(isError($result) || !hasData($result)) $this->terminateWithError("Provided date is older than allowed date.");
			
			$isAllowed = false;
			foreach($result->retval AS $key => $value) {
				if($value->datum == $dateString) $isAllowed = true;
			}

			if(!$isAllowed) {
				$this->terminateWithError("Provided date is older than allowed date.");
			}
			
		}
		
		if(!$this->checkTimesAgainstOtherKontrollen($von, $bis, $dateString, $le_id)) {
			$this->terminateWithError("Times collide with other Kontrolle on the same date.");
		}
		
		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		// create new Kontrolle
		$insert = $this->_ci->AnwesenheitModel->insert(array(
			'lehreinheit_id' => $le_id,
			'insertamum' => date('Y-m-d H:i:s'),
			'insertvon' => getAuthUID(),
			'von' => $von,
			'bis' => $bis
		));

		$anwesenheit_id = $insert->retval;

//		$this->addMeta('$anwesenheit_id', $anwesenheit_id);
//		$this->addMeta('$le_id', $le_id);
//		$this->addMeta('$von', $von);
//		$this->addMeta('$bis', $bis);
		$this->_handleResultQRNew($qrcode, $anwesenheit_id, $le_id, $von, $bis);
	}
	
	public function insertAnwWithoutQR() {
		
		$result = $this->getPostJSON();

		if(!property_exists($result, 'le_id') || !property_exists($result, 'datum')
			|| !property_exists($result, 'beginn') || !property_exists($result, 'ende')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$le_id = $result->le_id;
		$date = $result->datum;

		$berechtigt = $this->isAdminOrTeachesLe($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		$beginn = $result->beginn;
		$von = date('Y-m-d H:i:s', mktime($beginn->hours, $beginn->minutes, $beginn->seconds, $date->month, $date->day, $date->year));

		$ende = $result->ende;
		$bis = date('Y-m-d H:i:s', mktime($ende->hours, $ende->minutes, $ende->seconds, $date->month, $date->day, $date->year));

		if(isEmptyString($le_id) || $le_id === 'null'
			|| $date === 'null' || $von === 'null' || $bis === 'null') {
			$this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');
		}

		$dateString = sprintf('%04d-%02d-%02d', $date->year, $date->month, $date->day);
		$dateTime = strtotime($dateString);
		$reach = $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH');
		$dateLimit = strtotime("-$reach day");

		$le = new lehreinheit();
		$le->load($le_id);
		
		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
		if ($dateTime < $dateLimit && !$isAdmin) {
			// lektor chooses to run kontrolle on old termin outside of usual reach -> check if that termin exists
			$result = $this->_ci->AnwesenheitModel->getLETermine($le_id);
			if(isError($result) || !hasData($result)) $this->terminateWithError("Provided date is older than allowed date.");

			$isAllowed = false;
			foreach($result->retval AS $key => $value) {
				if($value->datum == $dateString) $isAllowed = true;
			}

			if(!$isAllowed) {
				$this->terminateWithError("Provided date is older than allowed date.");
			}

		}

		if(!$this->checkTimesAgainstOtherKontrollen($von, $bis, $dateString, $le_id)) {
			$this->terminateWithError("Times collide with other Kontrolle on the same date.");
		}

		// create new Kontrolle
		$insert = $this->_ci->AnwesenheitModel->insert(array(
			'lehreinheit_id' => $le_id,
			'insertamum' => date('Y-m-d H:i:s'),
			'insertvon' => getAuthUID(),
			'von' => $von,
			'bis' => $bis
		));

		$anwesenheit_id = $insert->retval;

		// insert Anwesenheiten entries of every Student as Abwesend
		$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries(
			$le_id,
			$anwesenheit_id,
			$von, $bis,
			$this->_ci->config->item('ANWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

		$kontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);
		
		$this->terminateWithSuccess($kontrolle);
	}

	private function checkTimesAgainstOtherKontrollen($von, $bis, $datum, $le_id, $anwesenheit_id = null) {

		// kontrollen laden by le & date
		$result = $this->_ci->AnwesenheitModel->getKontrollenForLeIdAndDate($le_id, $datum);
		$this->addMeta('getKontrollenForLeIdAndDate$result', $result);
		
		if(isError($result)) $this->terminateWithError("error checking for kontrollen on same date");
		else if (!hasData($result)) return true; // no other kontrollen -> no collision
		
		$kontrollen = getData($result);
		$this->addMeta('kontrollen', $kontrollen);
		
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

			// actually only string compares but lexically comparing times works here
			// also blocks same start as end but 
			if ($von < $kBis && $bis > $kVon) {
				return false;
			}
		}
		
		// return a bool
		return true;
	}
	
	private function _handleResultQRNew($qrcode, $anwesenheit_id, $le_id, $von, $bis)
	{
		do {
			$token = generateToken();
			$hash = hash('md5', $token); // even md5 is way too secure when trimming hashcode anyways
			$shortHash = substr($hash, 0, 8);// trim hashcode for people entering manually

			$url = $this->getQRURLLink($shortHash);

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

		// insert Anwesenheiten entries of every Student as Abwesend
		$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries(
			$le_id,
			$anwesenheit_id,
			$von, $bis,
			$this->_ci->config->item('ABWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

		// count entschuldigt entries
		$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountsForAnwesenheitId($anwesenheit_id,
			$this->_ci->config->item('ANWESEND_STATUS'),
			$this->_ci->config->item('ABWESEND_STATUS'),
			$this->_ci->config->item('ENTSCHULDIGT_STATUS'));

		$kontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);

		$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0], 'kontrolle' => getData($kontrolle)[0]));
		
	}

	private function _handleResultQRExisting($resultQR, $qrcode, $anwesenheit_id, $le_id, $von, $bis)
	{
		// maybe qr exists still in edge cases so try and resend
		// should never be the case but fringe cases might appear
		if(hasData($resultQR)) { // resend existing qr

			$shortHash = $resultQR->retval[0]->zugangscode;

			$url = $this->getQRURLLink($shortHash);
			
		} else { // create new qr since old one must have been cleaned

			do {
				$token = generateToken();
				$hash = hash('md5', $token); // even md5 is way too secure when trimming hashcode anyways
				$shortHash = substr($hash, 0, 8);// trim hashcode for people entering manually

				$url = $this->getQRURLLink($shortHash);

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
			
		}

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
		$anwesenheit_id = $result->anwesenheit_id;
		$lv_id = $result->lv_id;

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

		$deleteresp = $this->_ci->QRModel->delete(array(
			'anwesenheit_id' => $anwesenheit_id
		));
		if($deleteresp) {
			$this->terminateWithSuccess($deleteresp);
		} else {
			$this->terminateWithError($this->p->t('global', 'errorDeletingAnwKontrolle'), 'general');
		}
	}

	/**
	 * @param $le_id
	 * @return bool
	 *
	 * checks Berechtigungen for Admin or Lektor and is Teaching lehreinheit
	 */
	private function isAdminOrTeachesLE($le_id)
	{
		$le = new lehreinheit();
		$le->load($le_id);

		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
		if($isAdmin) return true;
		
		$isLektor = $this->_ci->permissionlib->isBerechtigt('extension/anw_r_lektor');
		
		if($isLektor) {
			$lektorIsTeaching = $this->AnwesenheitModel->getLektorIsTeachingLE($le_id, $this->_uid);
			if(isError($lektorIsTeaching) || !hasData($lektorIsTeaching)) return false;

			return $lektorIsTeaching;
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
			if(isError($lektorIsTeaching) || !hasData($lektorIsTeaching)) return false;

			return $lektorIsTeaching;
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
		$le_id = $result->le_id;
		$date = $result->date;
		$anwesenheit_id = $result->anwesenheit_id;

		// check if user is lektor for that le or admin/assistenz
		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');
		
		$dateString = sprintf('%04d-%02d-%02d', $date->year, $date->month, $date->day);
		$dateTime = strtotime($dateString);
		$reach = $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH');
		$dateLimit = strtotime("-$reach day");

		$le = new lehreinheit();
		$le->load($le_id);
		
		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
		if ($dateTime < $dateLimit && !$isAdmin) {
			$this->terminateWithError($this->p->t('global', 'providedDateTooOld'), 'general');
		}

		// find anwesenheitkontrolle by le_id and date
//		$resultKontrolle = $this->_ci->AnwesenheitModel->getKontrolleForLEOnDate($le_id, $dateString);
		$resultKontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);
		
		//$this->p->t('global', 'errorDeletingAnwKontrolle')
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

		// delete history of user entries and write into log file
		$this->_ci->logLib->logInfoDB(array($kontrolle, $anwesenheiten));
		$this->_ci->AnwesenheitUserHistoryModel->deleteAllByAnwesenheitId($anwesenheit_id);

		// delete user anwesenheiten by anwesenheit_id of kontrolle
		$resultDelete = $this->_ci->AnwesenheitUserModel->deleteAllByAnwesenheitId($anwesenheit_id);

		if(!hasData($resultDelete)) {
			$this->terminateWithError($this->p->t('global', 'errorDeleteUserAnwEntriesAnDatum', [
				'le_id' => $le_id,
				'day' => $date->day,
				'month' => $date->month,
				'year' => $date->year
			]), 'general');
		}

		// delete kontrolle itself
		$result = $this->_ci->AnwesenheitModel->delete(array('anwesenheit_id'=>$anwesenheit_id));

		// delete kontrolle
		if(!hasData($result)) {
			$this->terminateWithError($this->p->t('global', 'errorDeleteKontrolleEntryAnDatum', [
				'le_id' => $le_id,
				'day' => $date->day,
				'month' => $date->month,
				'year' => $date->year
			]), 'general');
		}

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
		$anwesenheit_id = $result->anwesenheit_id;
		$lv_id = $result->lv_id;

		$berechtigt = $this->isAdminOrTeachesLva($lv_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLva'), 'general');

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

		if(!property_exists($result, 'le_id') || !property_exists($result, 'datum')
			|| !property_exists($result, 'anwesenheit_id')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}
		
		$anwesenheit_id = $result->anwesenheit_id;
		$le_id = $result->le_id;
		$date = $result->datum;

		if(isEmptyString($le_id) || $le_id === 'null' || $date === 'null') {
			$this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');
		}
		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');
		
		$dateString = sprintf('%04d-%02d-%02d', $date->year, $date->month, $date->day);
		$dateTime = strtotime($dateString);
		$reach = $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH');
		$dateLimit = strtotime("-$reach day");

		$le = new lehreinheit();
		$le->load($le_id);
		
		// remove date check when restarting since adding anew is allowed for all termine right now anyways
//		$isAdmin = $this->isAdmin($le->lehrveranstaltung_id);
//		if ($dateTime < $dateLimit && !$isAdmin) {
//			$this->terminateWithError("Provided date is older than allowed date");
//		}

		$resultKontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);
		$existsKontrolle = hasData($resultKontrolle);
		
		if(!$existsKontrolle) $this->terminateWithError("Kontrolle does not exist.");
		
		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		 // reuse existing one
		$anwesenheit_id = $resultKontrolle->retval[0]->anwesenheit_id;

		// TODO: write updatefields here? technically nothing changed with anwesenheit here
//		$update = $this->_ci->AnwesenheitModel->update($anwesenheit_id, array(
//			'lehreinheit_id' => $le_id,
//			'updateamum' => date('Y-m-d H:i:s'),
//			'updatevon' => getAuthUID()
//		));
//
//		if(isError($update)) {
//			$this->terminateWithError('Error Updating Anwesenheitskontrolle', 'general');
//		}

		$resultQR = $this->_ci->QRModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));

		$this->_handleResultQRExisting($resultQR, $qrcode, $anwesenheit_id, $le_id, $resultKontrolle->retval[0]->von, $resultKontrolle->retval[0]->bis, $existsKontrolle);
		
	}
	
	public function updateKontrolle() {
		$result = $this->getPostJSON();

		if(!property_exists($result, 'le_id') || 
			!property_exists($result, 'von') || !property_exists($result, 'bis')
			|| !property_exists($result, 'anwesenheit_id')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$anwesenheit_id = $result->anwesenheit_id;
		$le_id = $result->le_id;
		$von = $result->von;
		$bis = $result->bis;

		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'notAuthorizedForLe'), 'general');

		$resultKontrolle = $this->_ci->AnwesenheitModel->load($anwesenheit_id);
		$existsKontrolle = hasData($resultKontrolle);
		if(!$existsKontrolle) $this->terminateWithError("Kontrolle does not exist.");
		
		$vonDate = new DateTime($resultKontrolle->retval[0]->von);
		$vonDate->setTime($von->hours, $von->minutes, $von->seconds);
		$bisDate = new DateTime($resultKontrolle->retval[0]->bis);
		$bisDate->setTime($bis->hours, $bis->minutes, $bis->seconds);

		$date = new DateTime($resultKontrolle->retval[0]->von);
		$dateString = $date->format('Y-m-d');
		
		if(!$this->checkTimesAgainstOtherKontrollen($von, $bis, $dateString, $le_id, $anwesenheit_id)) {
			$this->terminateWithError("Times collide with other Kontrolle on the same date.");
		}

		$update = $this->_ci->AnwesenheitModel->update($anwesenheit_id, array(
			'von' => $vonDate->format('Y-m-d H:i:s'),
			'bis' => $bisDate->format('Y-m-d H:i:s'),
			'updateamum' => date('Y-m-d H:i:s'),
			'updatevon' => getAuthUID()
		));

		if(isError($update)) {
			$this->terminateWithError('Error Updating Anwesenheitskontrolle', 'general');
		}
		
		// finally recalculate valid entschuldigung stati since they depend on kontrolle von & bis
		
		// find students of le whose entschuldigt status is not anymore valid when times change
		$resultCompare = $this->_ci->EntschuldigungModel->compareStatusZeitenForLE($vonDate->format('Y-m-d H:i:s'), $bisDate->format('Y-m-d H:i:s'), $resultKontrolle->retval[0]->von, $resultKontrolle->retval[0]->bis, $le_id);
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

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}