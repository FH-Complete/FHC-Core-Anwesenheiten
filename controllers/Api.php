<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

use \chillerlan\QRCode\QROptions;
use \chillerlan\QRCode\QRCode;

class Api extends FHCAPI_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'infoGetStudiensemester' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetAktStudiensemester' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetLehreinheitAndLektorInfo' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetStudentInfo' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetLehreinheitenForLehrveranstaltungAndMaUid' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetLehreinheitenForLehrveranstaltung' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetPicturesForPrestudentIds' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetStudiengaenge' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetLektorsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw'),
				'infoGetStudentsForLvaInSemester' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw'),

				'lektorStudentByLva' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetAllAnwesenheitenByLvaAssigned' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetAllAnwesenheitenByLvaAssignedV2' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetAllAnwesenheitenByStudentByLva' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorUpdateAnwesenheiten' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorRegenerateQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorDegenerateQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetNewQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetExistingQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorDeleteQRCode' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorDeleteAnwesenheitskontrolle' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorPollAnwesenheiten' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetAllAnwesenheitenByStudiengang' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetAllAnwesenheitenByLva' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),

				'studentGetAll' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'studentAddEntschuldigung' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentDeleteEntschuldigung' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentGetEntschuldigungenByPerson' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentCheckInAnwesenheit' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentGetAnwesenheitSumByLva' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'studentDeleteUserAnwesenheitById' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'studentDeleteUserAnwesenheitByIds' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),

				'assistenzGetEntschuldigungen' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw'),
				'assistenzUpdateEntschuldigung' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw')
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

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

	// INFO API

	public function infoGetStudiensemester()
	{
		$this->_ci->StudiensemesterModel->addOrder("start", "DESC");
		$studiensemester = $this->_ci->StudiensemesterModel->load();
		$this->terminateWithSuccess(getData($studiensemester));
	}

	public function infoGetAktStudiensemester()
	{
		$this->terminateWithSuccess(getData($this->_ci->StudiensemesterModel->getAkt()));
	}

	public function infoGetLehreinheitAndLektorInfo()
	{
		$result = $this->getPostJSON();
		$le_ids = $result->le_ids;
		$ma_uid = $result->ma_uid;
		$currentDate = $result->date;

		// workaround for merged le's
		$le_id = $le_ids[0];

		$lektorLehreinheitData = $this->AnwesenheitModel->getLehreinheitAndLektorInfo($le_id, $ma_uid, $currentDate);

		$this->terminateWithSuccess(getData($lektorLehreinheitData));
	}

	public function infoGetStudentInfo()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lva_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$studentLvaData = $this->AnwesenheitModel->getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz, APP_ROOT);

		$this->terminateWithSuccess(getData($studentLvaData));
	}

	public function infoGetLehreinheitenForLehrveranstaltungAndMaUid()
	{
		$lva_id = $this->input->get('lva_id');
		$ma_uid = $this->input->get('ma_uid');
		$sem_kurzbz = $this->input->get('sem_kurzbz');
		$result = $this->AnwesenheitModel->getAllLehreinheitenForLvaAndMaUid($lva_id, $ma_uid, $sem_kurzbz);
		if(!isSuccess($result)) $this->terminateWithError(getError($result));
		else $this->terminateWithSuccess(getData($result));

	}

	public function infoGetLehreinheitenForLehrveranstaltung()
	{
		$lva_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$result = $this->AnwesenheitModel->getAllLehreinheitenForLva($lva_id, $sem_kurzbz);
		if(!isSuccess($result)) $this->terminateWithError(getError($result));
		$this->terminateWithSuccess(getData($result));

	}

	public function infoGetPicturesForPrestudentIds()
	{
		$result = $this->getPostJSON();
		$prestudent_ids = $result->prestudent_ids;

		$result = $this->_ci->AnwesenheitUserModel->getPicturesForPrestudentIds($prestudent_ids);

		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	public function infoGetStudiengaenge()
	{
		$result = $this->_ci->AnwesenheitModel->getStudiengaenge();

		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	public function infoGetLektorsForLvaInSemester() {
		$lva_id = $this->input->get('lva_id');
		$sem = $this->input->get('sem');
		$result = $this->_ci->AnwesenheitModel->getLektorenForLvaInSemester($lva_id, $sem);

		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	public function infoGetStudentsForLvaInSemester() {
		$lv_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem');

		$result = $this->_ci->AnwesenheitModel->getStudentsForLvaInSemester($lv_id, $sem_kurzbz);
		if(!isSuccess($result)) $this->terminateWithError($result);
		$this->terminateWithSuccess($result);
	}

	// LEKTOR API

	public function lektorGetAllAnwesenheitenByLvaAssigned()
	{
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;
		$le_ids = $result->le_ids ;

		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLektor($lv_id, $le_ids, $sem_kurzbz);

		if(!isSuccess($result)) $this->terminateWithError($result);

		$studiensemester = $this->_ci->StudiensemesterModel->load($sem_kurzbz);

		$this->terminateWithSuccess(array($result, $studiensemester));
	}

	public function lektorGetAllAnwesenheitenByLvaAssignedV2()
	{
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;
		$le_ids = $result->le_ids ;

		$result = $this->_ci->AnwesenheitModel->getStudentsForLVAandLEandSemester($lv_id, $le_ids, $sem_kurzbz, APP_ROOT);

		if(!hasData($result)) $this->terminateWithError('no students found');
		$students = getData($result);

		$func = function($value) {
			return $value->prestudent_id;
		};

		$prestudentIds = array_map($func, $students);
		$result = $this->_ci->AnwesenheitModel->getAnwesenheitenEntriesForStudents($prestudentIds);
		$anwesenheiten = getData($result);

		$result = $this->_ci->StudiensemesterModel->load($sem_kurzbz);
		$studiensemester = getData($result);

		$this->terminateWithSuccess(array($students, $anwesenheiten, $studiensemester));
	}

	public function lektorGetAllAnwesenheitenByStudentByLva()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!isSuccess($res)) $this->terminateWithError($res);
		$this->terminateWithSuccess($res);
	}

	public function lektorUpdateAnwesenheiten()
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

	public function lektorGetExistingQRCode(){
		$resultPost= $this->getPostJSON();
		$le_ids = $resultPost->le_ids;

		// we assume that every LE provided when starting a new check was supposed to point to the same qr code
		// anyways, just per different anwesenheit_ids
		$le_id = $le_ids[0];

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

	public function lektorRegenerateQRCode()
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

	public function lektorDegenerateQRCode()
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

	public function lektorGetNewQRCode()
	{
		$result = $this->getPostJSON();
		$le_ids = $result->le_ids;

		$le_id = $le_ids[0];
		$date = $result->datum;

		$beginn = $result->beginn;
		$von = date('Y-m-d H:i:s', mktime($beginn->hours, $beginn->minutes, $beginn->seconds, $date->month, $date->day, $date->year));

		$ende = $result->ende;
		$bis = date('Y-m-d H:i:s', mktime($ende->hours, $ende->minutes, $ende->seconds, $date->month, $date->day, $date->year));

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

			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";


			$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountForAnwesenheitId($anwesenheit_id);

			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0]->count));

		} else { // create a newqr

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
				$this->terminateWithError($this->p->t('global', 'errorSavingNewQRCode'), 'general');

			// insert Anwesenheiten entries of every Student as Abwesend
			$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries($le_id, $anwesenheit_id, $von, $bis);

			// count entschuldigt entries
			$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountForAnwesenheitId($anwesenheit_id);

			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id, 'count' => getData($countPoll)[0]->count));
		}
	}

	public function lektorDeleteQRCode()
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

	public function lektorDeleteAnwesenheitskontrolle() {
		$result = $this->getPostJSON();
		$le_ids = $result->le_ids;
		$le_id = $le_ids[0];
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

	public function lektorPollAnwesenheiten() {
		$result = $this->getPostJSON();
		$anwesenheit_id = $result->anwesenheit_id;

		$countPoll = $this->_ci->AnwesenheitModel->getCheckInCountForAnwesenheitId($anwesenheit_id);
		$this->terminateWithSuccess(getData($countPoll)[0]);
	}

	public function lektorGetAllAnwesenheitenByStudiengang() {
		$result = $this->getPostJSON();
		$stg_kz = $result->stg_kz;
		$sem_kurzbz = $result->sem_kurzbz;

		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByStudiengang($stg_kz, $sem_kurzbz);

		$this->terminateWithSuccess(getData($result));
	}

	public function lektorGetAllAnwesenheitenByLva() {
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;

		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLva($lv_id,  $sem_kurzbz);

		if(!isSuccess($result)) $this->terminateWithError($result);

		$this->terminateWithSuccess($result);
	}

	// STUDENT API

	public function studentGetAll()
	{
		$studiensemester = $this->_ci->input->get('studiensemester');

		if (!isEmptyString($studiensemester))
		{
			$studiensemester = $this->_ci->StudiensemesterModel->load($studiensemester);

			if (isError($studiensemester) || !hasData($studiensemester))
				$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

			$studiensemester = getData($studiensemester)[0]->studiensemester_kurzbz;
			
			$result = $this->_ci->AnwesenheitModel->getAllByStudent($this->_uid, $studiensemester);
			$this->terminateWithSuccess($result);
		}
	}

	public function studentCheckInAnwesenheit() {

		$result = $this->getPostJSON();
		$zugangscode = $result->zugangscode;

		$person_id = getAuthPersonId();

		// find relevant entry from tbl_anwesenheit_check via zugangscode
		$result = $this->_ci->QRModel->loadWhere(array('zugangscode' => $zugangscode));
		var_dump($result);
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorInvalidCode'), 'general');

		$codeDateString = $result->retval[0]->insertamum;
		$codeDateTime = new DateTime($codeDateString);

		$nowString = date("Y-m-d H:i:s");
		$nowDateTime = DateTime::createFromFormat('Y-m-d H:i:s', $nowString);

		$timeDiffInMilliseconds = ($codeDateTime.getTimestamp() - $nowDateTime.getTimeStamp()) * 1000;

		if($timeDiffInMilliseconds > (REGENERATE_QR_TIMER) * 2) $this->terminateWithError($this->p->t('global', 'errorCodeTooOld'), 'general');

		// find relevant entry from tbl_anwesenheit via anwesenheit_id
		$anwesenheit_id = $result->retval[0]->anwesenheit_id;
		$result = $this->_ci->AnwesenheitModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorCodeLinkedToInvalidKontrolle'), 'general');

		$von = $result->retval[0]->von;
		$bis = $result->retval[0]->bis;

		if(!($von <= $nowString && $nowString <= $bis)) {
			$this->terminateWithError($this->p->t('global', 'errorCodeSentInTimeOutsideKontrolle'), 'general');
		}


		$lehreinheit_id = $result->retval[0]->lehreinheit_id;

		// find relevant lehreinheit from relevant entry
		$result = $this->_ci->LehreinheitModel->loadWhere(array('lehreinheit_id' => $lehreinheit_id));
		$lehreinheit = $result->retval[0];

		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorCodeLinkedToInvalidLE'), 'general');

		$resultAnwKontrolle = $this->_ci->AnwesenheitModel->getAllPersonIdsForLE($lehreinheit_id);
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorLEhasNoStudentsAttending'), 'general');

		// check if the student/person sending the request is actually supposed to be in that lehreinheit
		$isLegit = false;
		$prestudent_id = null;
		forEach ($resultAnwKontrolle->retval as $entry) {
			$isLegitLoopVar = $entry->person_id == $person_id;
			if($isLegitLoopVar) {
				$isLegit = true;
				$prestudent_id = $entry->prestudent_id;
				break;
			}
		}

		// to avoid random people being anwesend in random lectures
		if(!$isLegit) $this->terminateWithError($this->p->t('global', 'errorNotParticipantOfLE'), 'general');

		// check if there is already an anwesenheit written to lehreinheit on date of check
		$date = date('Y-m-d');
		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLehreinheitByDate($lehreinheit_id, $date);

		// all entries need to be inserted on start
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorNoUserEntriesForAttendanceCheckFound'), 'general');

		$isLegit = false;
		$entryToUpdate = null;
		// find the entry in fetched and existing anwesenheiten of LE of today
		forEach ($result->retval as $entry) {
			$isLegit = $entry->prestudent_id == $prestudent_id;
			if($isLegit) $entryToUpdate = $entry;
		}

		// finally update the entry to anwesend
		if($entryToUpdate) {

			$result = $this->_ci->AnwesenheitUserModel->update($entryToUpdate->anwesenheit_user_id, array(
				'status' => 'anwesend',
			));

			if (isError($result)) {
				$this->terminateWithError($this->p->t('global', 'errorUpdateUserEntry'), 'general');
			} else {
				$viewData = $this->_ci->AnwesenheitUserModel->getAnwesenheitenCheckViewData($prestudent_id, $lehreinheit_id);

				// if inserted successfully return some information to display who has entered
				// his anwesenheitscheck for which date and lehreinheit
				$this->terminateWithSuccess(array(
					'message' => 'Anwesenheitskontrolle erfolgreich.',
					'anwesenheitEntry' => json_encode($entry),
					'viewData' => json_encode($viewData)
				));
			}

		} else {
			$this->terminateWithError($this->p->t('global', 'errorPersonStudentIDMismatch'), 'general');

		}
	}

	public function studentAddEntschuldigung()
	{
		if (isEmptyString($_POST['von']) || isEmptyString($_POST['bis']))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$vonTimestamp = strtotime($_POST['von']);
		$bisTimestamp = strtotime($_POST['bis']);

		if ($vonTimestamp === false || $bisTimestamp === false)
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$file = array(
			'kategorie_kurzbz' => 'fas',
			'version' => 0,
			'name' => $_FILES['files']['name'],
			'mimetype' => $_FILES['files']['type'],
			'insertamum' => date('Y-m-d H:i:s'),
			'insertvon' => $this->_uid
		);

		$dmsFile = $this->_ci->dmslib->upload($file, 'files', array('pdf', 'jpg', 'png'));
		$dmsFile = getData($dmsFile);

		$dmsId = $dmsFile['dms_id'];

		$von = date('Y-m-d H:i:s', $vonTimestamp);
		$bis = date('Y-m-d H:i:s', $bisTimestamp);
		$result = $this->_ci->EntschuldigungModel->insert(
			array(
				'person_id' => getAuthPersonId(),
				'von' => $von,
				'bis' => $bis,
				'dms_id' => $dmsId,
				'insertvon' => $this->_uid
			)
		);

		if (isError($result))
			$this->terminateWithError(getError($result));

		$this->sendEmailToAssistenz();

		$this->terminateWithSuccess(['dms_id' => $dmsId, 'von' => $von, 'bis' => $bis, 'entschuldigung_id' => getData($result), 'emailInfo' => $emailInfo]);
	}

	public function sendEmailToAssistenz () {

		// TODO: some error handling if non student manages to upload entschuldigung

		// Get STG mail address for the uploading student
		$result = $this->EntschuldigungModel->getMailInfoForStudent(getAuthPersonId());

		if (isError($result))
			$this->terminateWithError(getError($result));

		$data = getData($result)[0];

		//emailTo usually is 1 address, sometimes several seperated by ','
		$emails = explode(', ', $data->email);

		// Link to Entschuldigungsmanagement
		$url = APP_ROOT. 'index.ci.php/extensions/FHC-Core-Anwesenheiten/Assistenz';
		$studentname = $data->vorname.' '.$data->nachname;
		$student_uid = $data->student_uid;
		$stg = $data->kurzbzlang.' - '.$data->bezeichnung;
		$orgform = $data->orgform_kurzbz;
		$sem = $data->semester.'. Semester';


		foreach ($emails as $email)
		{
			// Prepare mail content
			$body_fields = array(
				'student' => $studentname,
				'UID' => $student_uid,
				'stg' => $stg,
				'Orgform' => $orgform,
				'sem' => $sem,
				'linkEntschuldigungen' => $url
			);

			// Send mail
			sendSanchoMail(
				'AnwesenheitSanchoEntschuldigung',
				$body_fields,
				$email,
				'Entschuldigung zur Befreiung der Anwesenheitspflicht: Neues Dokument wurde hochgeladen.'
			);
		}

	}

	public function studentDeleteEntschuldigung()
	{
		$data = json_decode($this->input->raw_input_stream, true);
		$entschuldigung_id = $data['entschuldigung_id'];

		if (isEmptyString($entschuldigung_id))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnung($entschuldigung_id, getAuthPersonId());

		if (hasData($zuordnung))
		{
			$entschuldigung = getData($zuordnung)[0];

			$deletedEntschuldigung = $this->_ci->EntschuldigungModel->delete($entschuldigung->entschuldigung_id);

			if (isError($deletedEntschuldigung))
				$this->terminateWithError(getError($deletedEntschuldigung));

			$deletedFile = $this->_ci->dmslib->delete($entschuldigung->person_id, $entschuldigung->dms_id);
			if (isError($deletedFile))
				$this->terminateWithError(getError($deletedFile));

			$this->terminateWithSuccess($this->p->t('global', 'successDeleteEnschuldigung'));
		}
	}

	public function studentGetEntschuldigungenByPerson()
	{
		$this->terminateWithSuccess($this->_ci->EntschuldigungModel->getEntschuldigungenByPerson(getAuthPersonId()));
	}

	public function studentGetAnwesenheitSumByLva() {
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kz;
		$prestudent_id = $result->id;

		$result = $this->_ci->AnwesenheitUserModel->getAnwesenheitSumByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorCalculatingAnwQuota'), 'general');
		$this->terminateWithSuccess(getData($result));
	}

	public function studentDeleteUserAnwesenheitById() {
		$result = $this->getPostJSON();
		$anwesenheit_user_id = $result->anwesenheit_user_id;

		$deleteresp = $this->_ci->AnwesenheitUserModel->delete(array(
			'anwesenheit_user_id' => $anwesenheit_user_id
		));

		if(!hasData($deleteresp)) $this->terminateWithError($this->p->t('global', 'errorDeleteSingleAnwUserEntry'), 'general');

		$this->terminateWithSuccess(getData($deleteresp));
	}

	public function studentDeleteUserAnwesenheitByIds() {
		$result = $this->getPostJSON();
		$ids = $result->ids;

		$deleteresp = $this->_ci->AnwesenheitUserModel->deleteUserAnwesenheitByIds($ids);

		if(!hasData($deleteresp)) $this->terminateWithError($this->p->t('global', 'errorDeleteMultipleAnwUserEntry'), 'general');

		$this->terminateWithSuccess(getData($deleteresp));
	}

	// ASSISTENZ API

	public function assistenzGetEntschuldigungen()
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

	public function assistenzUpdateEntschuldigung()
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

