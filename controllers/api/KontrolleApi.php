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
				'getAllAnwesenheitenByLvaAssigned' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'getAllAnwesenheitenByStudentByLva' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'updateAnwesenheiten' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'regenerateQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'degenerateQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'getNewQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'getExistingQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'deleteQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'deleteAnwesenheitskontrolle' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'pollAnwesenheiten' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'getAllAnwesenheitenByStudiengang' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'getAllAnwesenheitenByLva' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'getAnwQuoteForPrestudentIds' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw')
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


	// LEKTOR API

	public function getAllAnwesenheitenByLvaAssigned()
	{
		$result = $this->getPostJSON();

		if(!property_exists($result, 'le_id') || !property_exists($result, 'le_id')
			|| !property_exists($result, 'sem_kurzbz') || !property_exists($result, 'ma_uid')
			|| !property_exists($result, 'date')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;
		$le_id = $result->le_id;

		$ma_uid = $result->ma_uid;
		$date = $result->date;


		$result = $this->_ci->AnwesenheitModel->getStudentsForLVAandLEandSemester($lv_id, $le_id, $sem_kurzbz, APP_ROOT);

		if(isError($result)) $this->terminateWithError($this->p->t('global', 'errorFindingStudentsForLVA'), 'general');
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'noStudentsFound'), 'general');
		$students = getData($result);

		$func = function($value) {
			return $value->prestudent_id;
		};

		$prestudentIds = array_map($func, $students);
		$result = $this->_ci->AnwesenheitModel->getAnwesenheitenEntriesForStudents($prestudentIds, $le_id);
		$anwesenheiten = getData($result);

		$funcPID = function($value) {
			return $value->person_id;
		};

		$personIds = array_map($funcPID, $students);
		$result = $this->_ci->AnwesenheitUserModel->getEntschuldigungsstatusForPersonIdsOnDate($personIds);
		$entschuldigungsstatus = getData($result);

		$result = $this->_ci->StudiensemesterModel->load($sem_kurzbz);
		$studiensemester = getData($result);


		// get kontrollen for le_id and newer than age constant if permission is lektor

		$isLektor = $this->permissionlib->isBerechtigt('extension/anwesenheit_lektor');
		$kontrollen = null;
		if($isLektor) {
			$result = $this->_ci->AnwesenheitModel->getKontrollenForLeIdAndInterval($le_id, KONTROLLE_DELETE_MAX_REACH);
			$kontrollen = getData($result);
		} else {
			$result = $this->_ci->AnwesenheitModel->getKontrollenForLeId($le_id);
			$kontrollen = getData($result);
		}

		$result = $this->_ci->AnwesenheitModel->getLehreinheitAndLektorInfo($le_id, $ma_uid, $date);
		$lektorLehreinheitData = getData($result);

		$result = $this->_ci->AnwesenheitModel->getLETermine($le_id);
		$leTermine = getData($result);

		$this->terminateWithSuccess(array($students, $anwesenheiten, $studiensemester, $entschuldigungsstatus, $kontrollen, $lektorLehreinheitData, $leTermine));
	}

	public function getAllAnwesenheitenByStudentByLva()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!isSuccess($res)) $this->terminateWithError($res);
		$this->terminateWithSuccess($res);
	}

	public function updateAnwesenheiten()
	{
		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		// check if user is lektor for that le or admin/assistenz
		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'errorNoRightsToChangeData'), 'general');

		$changedAnwesenheiten = $result->changedAnwesenheiten;
		$result = $this->_ci->AnwesenheitUserModel->updateAnwesenheiten($changedAnwesenheiten);

		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess(getData($result));
	}

	public function getExistingQRCode(){
		$result = $this->getPostJSON();

		if(!property_exists($result, 'le_id')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$le_id = $result->le_id;

		$resultQR = $this->_ci->QRModel->getActiveCodeForLE($le_id);

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

			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";

			$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountForAnwesenheitId($anwesenheit_id);

			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0]->count));

		}

	}

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

			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";

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

	public function getNewQRCode()
	{
		$result = $this->getPostJSON();

		if(!property_exists($result, 'le_id') || !property_exists($result, 'datum')
			|| !property_exists($result, 'von') || !property_exists($result, 'bis')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		$le_id = $result->le_id;

		$date = $result->datum;

		$beginn = $result->beginn;
		$von = date('Y-m-d H:i:s', mktime($beginn->hours, $beginn->minutes, $beginn->seconds, $date->month, $date->day, $date->year));

		$ende = $result->ende;
		$bis = date('Y-m-d H:i:s', mktime($ende->hours, $ende->minutes, $ende->seconds, $date->month, $date->day, $date->year));

		if(isEmptyString($le_id) || $le_id === 'null'
			|| $date === 'null' || $bis === 'null' || $bis === 'null') {
			$this->terminateWithError($this->p->t('global', 'errorStartAnwKontrolle'), 'general');
		}

		$resultKontrolle = $this->_ci->AnwesenheitModel->getKontrolleForLEOnDate($le_id, $date);

		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		// create new Kontrolle
		if(!hasData($resultKontrolle)) {

			$insert = $this->_ci->AnwesenheitModel->insert(array(
				'lehreinheit_id' => $le_id,
				'insertamum' => date('Y-m-d H:i:s'),
				'von' => $von,
				'bis' => $bis
			));

			$anwesenheit_id = $insert->retval;
			$resultQR = $this->_ci->QRModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));

			$this->_handleResultQR($resultQR, $qrcode, $anwesenheit_id, $le_id, $von, $bis);

		} else { // reuse existing one
			$anwesenheit_id = $resultKontrolle->retval[0]->anwesenheit_id;

			// update time of kontrolle
			$update = $this->_ci->AnwesenheitModel->update($anwesenheit_id, array(
				'lehreinheit_id' => $le_id,
				'insertamum' => date('Y-m-d H:i:s'),
				'von' => $von,
				'bis' => $bis
			));

			if(isError($update)) {
				$this->terminateWithError('Error Updating Anwesenheitskontrolle', 'general');
			}

			$resultQR = $this->_ci->QRModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));

			$this->_handleResultQR($resultQR, $qrcode, $anwesenheit_id, $le_id, $von, $bis);
		}
	}

	private function _handleResultQR($resultQR, $qrcode, $anwesenheit_id, $le_id, $von, $bis){

		if(hasData($resultQR)) { // resend existing qr

			$shortHash = $resultQR->retval[0]->zugangscode;

			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Profil/Scan/$shortHash";


			$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountForAnwesenheitId($anwesenheit_id);

			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0]->count));

		} else { // create a newqr

			do {
				$token = generateToken();
				$hash = hash('md5', $token); // even md5 is way too secure when trimming hashcode anyways
				$shortHash = substr($hash, 0, 8);// trim hashcode for people entering manually

				$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Profil/Scan/$shortHash";

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
			$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries($le_id, $anwesenheit_id, $von, $bis);

			// count entschuldigt entries
			$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountForAnwesenheitId($anwesenheit_id);

			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0]->count));
		}
	}

	public function deleteQRCode()
	{
		$result = $this->getPostJSON();
		$anwesenheit_id = $result->anwesenheit_id;


		$deleteresp = $this->_ci->QRModel->delete(array(
			'anwesenheit_id' => $anwesenheit_id
		));
		if($deleteresp) {
			$this->terminateWithSuccess($deleteresp);
		} else {
			$this->terminateWithError($this->p->t('global', 'errorDeletingAnwKontrolle'), 'general');
		}
	}

	private function isAdminOrTeachesLE($le) {
		$isAdmin = $this->permissionlib->isBerechtigt('extension/anwesenheit_admin');
		if($isAdmin) return true;

		$isAssistenz = $this->permissionlib->isBerechtigt('extension/anwesenheit_assistenz');
		if($isAssistenz) return true;

		$isLektor = $this->permissionlib->isBerechtigt('extension/anwesenheit_lektor');
		if($isLektor) {
			$lektorIsTeaching = $this->AnwesenheitModel->getLektorIsTeachingLE($le, $this->_uid);
			if(isError($lektorIsTeaching) || !hasData($lektorIsTeaching)) return false;

			return $lektorIsTeaching;
		}

		return false;
	}

	public function deleteAnwesenheitskontrolle() {
		$result = $this->getPostJSON();
		$le_id = $result->le_id;
		$date = $result->date;

		// check if user is lektor for that le or admin/assistenz
		$berechtigt = $this->isAdminOrTeachesLE($le_id);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'errorNoRightsToChangeData'), 'general');

		// find anwesenheitkontrolle by le_id and date
		$resultKontrolle = $this->_ci->AnwesenheitModel->getKontrolleForLEOnDate($le_id, $date);

		//$this->p->t('global', 'errorDeletingAnwKontrolle')
		if(!hasData($resultKontrolle)) {
			$this->terminateWithError($this->p->t('global', 'errorDeleteKontrolleKeineLEAnDatum', [
				'le_id' => $le_id,
				'day' => $date->day,
				'month' => $date->month,
				'year' => $date->year
			]), 'general');
		}
		$anwesenheit_id = getData($resultKontrolle)[0]->anwesenheit_id;

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

	public function pollAnwesenheiten() {
		$result = $this->getPostJSON();
		$anwesenheit_id = $result->anwesenheit_id;

		$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountForAnwesenheitId($anwesenheit_id);
		$this->terminateWithSuccess(getData($countPoll)[0]);
	}

	public function getAllAnwesenheitenByStudiengang() {
		$result = $this->getPostJSON();
		$stg_kz = $result->stg_kz;
		$sem_kurzbz = $result->sem_kurzbz;

		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByStudiengang($stg_kz, $sem_kurzbz);

		$this->terminateWithSuccess(getData($result));
	}

	public function getAllAnwesenheitenByLva() {
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;

		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLva($lv_id,  $sem_kurzbz);

		if(!isSuccess($result)) $this->terminateWithError($result);

		$this->terminateWithSuccess($result);
	}

	public function getAnwQuoteForPrestudentIds() {
		$result = $this->getPostJSON();
		$ids = $result->ids;
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;

		$result = $this->_ci->AnwesenheitUserModel->getAnwQuoteForPrestudentIds($ids, $lv_id,  $sem_kurzbz);

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