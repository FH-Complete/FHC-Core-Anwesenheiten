<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

use \chillerlan\QRCode\QROptions;
use \chillerlan\QRCode\QRCode;

class ProfilApi extends FHCAPI_Controller
{

	private $_ci;
	private $_uid;
	public function __construct()
	{
		parent::__construct(array(
				'getAllAnw' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'getProfileViewData' => array ('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'getAllAnwByUID' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'addEntschuldigung' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'deleteEntschuldigung' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'getEntschuldigungenByPerson' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'getEntschuldigungenByPersonID' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'checkInAnwesenheit' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'getAnwesenheitSumByLva' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'deleteUserAnwesenheitById' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw'),
				'deleteUserAnwesenheitByIds' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw')
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


	// STUDENT API

	public function getAllAnw()
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

	public function getProfileViewData() {
		$result = $this->getPostJSON();
		$uid = $result->uid;

		if($uid === null) $uid = $this->_uid;

		$result = $this->_ci->AnwesenheitModel->getStudentViewData($uid);

		if(isError($result)) $this->terminateWithError($result);

		$this->terminateWithSuccess($result);
	}

	public function getAllAnwByUID()
	{
		$studiensemester = $this->_ci->input->get('studiensemester');
		$uid = $this->_ci->input->get('uid');

		if (!isEmptyString($studiensemester))
		{
			$studiensemester = $this->_ci->StudiensemesterModel->load($studiensemester);

			if (isError($studiensemester) || !hasData($studiensemester))
				$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

			$studiensemester = getData($studiensemester)[0]->studiensemester_kurzbz;

			$result = $this->_ci->AnwesenheitModel->getAllByStudent($uid, $studiensemester);
			$this->terminateWithSuccess($result);
		}
	}

	public function checkInAnwesenheit() {

		$result = $this->getPostJSON();
		$zugangscode = $result->zugangscode;

		$person_id = getAuthPersonId();

		// find relevant entry from tbl_anwesenheit_check via zugangscode
		$result = $this->_ci->QRModel->loadWhere(array('zugangscode' => $zugangscode));

		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorInvalidCode'), 'general');

		// calculate age of zugangscode, since it might be a data relic a student abuses
		$codeDateString = $result->retval[0]->insertamum;
		$codeDateTime = new DateTime($codeDateString);

		$nowString = date("Y-m-d H:i:s");
		$nowDateTime = DateTime::createFromFormat('Y-m-d H:i:s', $nowString);

		$interval = $nowDateTime->diff($codeDateTime);
		$timeDiffInMilliseconds = $interval->d * 24 * 60 * 60 * 1000 + $interval->h * 60 * 60 * 1000 + $interval->i * 60 * 1000 + $interval->s * 1000;

		if($timeDiffInMilliseconds > (REGENERATE_QR_TIMER) * 2) $this->terminateWithError($this->p->t('global', 'errorCodeTooOld'), 'general');


		// find relevant entry from tbl_anwesenheit via anwesenheit_id
		$anwesenheit_id = $result->retval[0]->anwesenheit_id;
		$result = $this->_ci->AnwesenheitModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorCodeLinkedToInvalidKontrolle'), 'general');

		$von = $result->retval[0]->von;
		$bis = $result->retval[0]->bis;

//		if(!($von <= $nowString && $nowString <= $bis)) {
//			$this->terminateWithError($this->p->t('global', 'errorCodeSentInTimeOutsideKontrolle'), 'general');
//		}


		$lehreinheit_id = $result->retval[0]->lehreinheit_id;

		// find relevant lehreinheit from relevant entry
		$result = $this->_ci->LehreinheitModel->loadWhere(array('lehreinheit_id' => $lehreinheit_id));
//		$lehreinheit = $result->retval[0];

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
		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLehreinheitByDate($lehreinheit_id, $von);

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
					'anwesenheitEntry' => json_encode($entry),
					'viewData' => json_encode($viewData),
					$nowDateTime, $codeDateTime, $interval
				));
			}

		} else {
			$this->terminateWithError($this->p->t('global', 'errorPersonStudentIDMismatch'), 'general');

		}
	}

	public function addEntschuldigung()
	{
		if (isEmptyString($_POST['von']) || isEmptyString($_POST['bis']) || isEmptyString($_POST['person_id']))
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
				'person_id' => $_POST['person_id'],
				'von' => $von,
				'bis' => $bis,
				'dms_id' => $dmsId,
				'insertvon' => $this->_uid
			)
		);

		if (isError($result))
			$this->terminateWithError(getError($result));

//		$this->sendEmailToAssistenz();

		$this->terminateWithSuccess(['dms_id' => $dmsId, 'von' => $von, 'bis' => $bis, 'entschuldigung_id' => getData($result)]);
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

	public function deleteEntschuldigung()
	{
		$data = json_decode($this->input->raw_input_stream, true);
		$entschuldigung_id = $data['entschuldigung_id'];

//		if (isEmptyString($entschuldigung_id))
//			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnung($entschuldigung_id, getAuthPersonId());

		if (hasData($zuordnung))
		{
			$entschuldigung = getData($zuordnung)[0];

			// terminate with error if entschuldigung is already accepted/declined

			$deletedEntschuldigung = $this->_ci->EntschuldigungModel->delete($entschuldigung->entschuldigung_id);

			if (isError($deletedEntschuldigung))
				$this->terminateWithError(getError($deletedEntschuldigung));

			$deletedFile = $this->_ci->dmslib->delete($entschuldigung->person_id, $entschuldigung->dms_id);
			if (isError($deletedFile))
				$this->terminateWithError(getError($deletedFile));

			$this->terminateWithSuccess($this->p->t('global', 'successDeleteEnschuldigung'));
		}
	}

	public function getEntschuldigungenByPerson()
	{
		$this->terminateWithSuccess($this->_ci->EntschuldigungModel->getEntschuldigungenByPerson(getAuthPersonId()));
	}

	public function getEntschuldigungenByPersonID() {
		$result = $this->getPostJSON();
		$person_id = $result->person_id;

		$this->terminateWithSuccess($this->_ci->EntschuldigungModel->getEntschuldigungenByPerson($person_id));
	}

	public function getAnwesenheitSumByLva() {
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kz;
		$prestudent_id = $result->id;

		$result = $this->_ci->AnwesenheitUserModel->getAnwesenheitSumByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorCalculatingAnwQuota'), 'general');
		$this->terminateWithSuccess(getData($result));
	}

	public function deleteUserAnwesenheitById() {
		$result = $this->getPostJSON();
		$anwesenheit_user_id = $result->anwesenheit_user_id;

		$deleteresp = $this->_ci->AnwesenheitUserModel->delete(array(
			'anwesenheit_user_id' => $anwesenheit_user_id
		));

		if(!hasData($deleteresp)) $this->terminateWithError($this->p->t('global', 'errorDeleteSingleAnwUserEntry'), 'general');

		$this->terminateWithSuccess(getData($deleteresp));
	}

	public function deleteUserAnwesenheitByIds() {
		$result = $this->getPostJSON();
		$ids = $result->ids;

		$deleteresp = $this->_ci->AnwesenheitUserModel->deleteUserAnwesenheitByIds($ids);

		if(!hasData($deleteresp)) $this->terminateWithError($this->p->t('global', 'errorDeleteMultipleAnwUserEntry'), 'general');

		$this->terminateWithSuccess(getData($deleteresp));
	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}