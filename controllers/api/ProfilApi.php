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
				// load student data (name, etc) by uid, none => own, uid => further berechtigung check
				'getProfileViewData' => array ('extension/anw_r_student:r', 'extension/anw_r_full_assistenz:r'),

				// load student anwesenheiten by uid, none => own, uid => further berechtigung check
				'getAllAnwByUID' => array ('extension/anw_r_student:r', 'extension/anw_r_full_assistenz:r'),
				
				// special function for cis4 widget
				'getAllAnwQuotasForLvaByUID' => array ('extension/anw_r_student:r', 'extension/anw_r_full_assistenz:r'),
				
				// adds new entschuldigung with dates & optional file
				'addEntschuldigung' => array('extension/anw_stud_ent:rw','extension/anw_r_full_assistenz:rw'),

				// adds file to entschuldigung
				'editEntschuldigung' => array('extension/anw_stud_ent:rw','extension/anw_r_full_assistenz:rw'),

				// deletes entschuldigung
				'deleteEntschuldigung' => array('extension/anw_stud_ent:rw','extension/anw_r_full_assistenz:rw'),

				// load student entschuldigungen by uid
				'getEntschuldigungenByPersonID' => array('extension/anw_stud_ent:r','extension/anw_r_full_assistenz:rw'),
				
				// QR code entry
				'checkInAnwesenheit' => array('extension/anw_r_student:rw','extension/anw_r_full_assistenz:rw'),
				
				// load anw sum table data
				'getAnwesenheitSumByLva' => array('extension/anw_r_student:r','extension/anw_r_full_assistenz:r')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_History_model', 'EntschuldigungHistoryModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('ressource/Mitarbeiter_model', 'MitarbeiterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('AkteLib');
		$this->_ci->load->library('DmsLib');

		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');


		$this->loadPhrases(
			array(
				'global',
				'ui'
			)
		);

		$this->_setAuthUID(); // sets property uid

		$this->load->helper('hlp_sancho_helper');
	}

	/**
	 * POST METHOD
	 * expects parameter 'uid'
	 * returns viewData for given student_uid for 'StudentComponent'
	 */
	public function getProfileViewData() {
		$result = $this->getPostJSON();
		$uid = $result->uid;

		if($uid === null) $uid = $this->_uid;

		$berechtigt = $this->isAdminOrStudentCheckingItself($uid);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');

		$result = $this->_ci->AnwesenheitModel->getStudentViewData($uid);

		if(isError($result)) $this->terminateWithError($result);

		$this->terminateWithSuccess($result);
	}

	/**
	 * GET METHOD
	 * expects parameter 'studiensemester', 'uid'
	 *
	 * returns list of all anwesenheiten user entries of student in semester
	 */
	public function getAllAnwByUID()
	{

		$studiensemester = $this->_ci->input->get('studiensemester');
		$uid = $this->_ci->input->get('uid');
		$person_id = $this->_ci->input->get('person_id');

		$berechtigt = $this->isAdminOrStudentCheckingItself($uid);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');


		if($studiensemester === null || $studiensemester === 'null') {

			$result = $this->_ci->StudiensemesterModel->getAkt();
			$aktuellesSem = getData($result)[0];
			$studiensemester = $aktuellesSem->studiensemester_kurzbz;
		}

		if (!isEmptyString($studiensemester))
		{
			$studiensemester = $this->_ci->StudiensemesterModel->load($studiensemester);

			if (isError($studiensemester) || !hasData($studiensemester))
				$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

			$studiensemester = getData($studiensemester)[0]->studiensemester_kurzbz;

			$result = $this->_ci->AnwesenheitModel->getAllByStudent($uid, $studiensemester);

			if($this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
				$entschuldigungen = $this->_ci->EntschuldigungModel->getEntschuldigungenByPerson($person_id);
				$this->terminateWithSuccess(array($result, $entschuldigungen));
			} else {
				$this->terminateWithSuccess(array($result));
			}
		}
	}

	/**
	 * GET METHOD
	 * expects parameter 'studiensemester', 'uid'
	 *
	 * returns list of all anwesenheiten user entries of student in semester
	 */
	public function getAllAnwQuotasForLvaByUID()
	{

		$studiensemester = $this->_ci->input->get('studiensemester');
		$uid = $this->_ci->input->get('uid');

		$berechtigt = $this->isAdminOrStudentCheckingItself($uid);
		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');


		if($studiensemester === null || $studiensemester === 'null') {

			$result = $this->_ci->StudiensemesterModel->getAkt();
			$aktuellesSem = getData($result)[0];
			$studiensemester = $aktuellesSem->studiensemester_kurzbz;
		}

		if (!isEmptyString($studiensemester))
		{
			$studiensemester = $this->_ci->StudiensemesterModel->load($studiensemester);

			if (isError($studiensemester) || !hasData($studiensemester))
				$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

			$studiensemester = getData($studiensemester)[0]->studiensemester_kurzbz;

			$result = $this->_ci->AnwesenheitModel->getAllQuotasForLvaByStudent($uid, $studiensemester);
			$data = null;
			if(!isError($result) && hasData($result)) {
				$data = getData($result);
			} 
			
			$this->terminateWithSuccess($data);
		}
	}

	// TODO: check if this can be removed, unused func
	
//	/**
//	 * GET METHOD
//	 * expects parameter 'studiensemester', 'uid'
//	 *
//	 * returns list of all anwesenheiten user entries of student in semester
//	 */
//	public function getAllAnwesenheitenByStudentByLva() {
//
//		$result = $this->getPostJSON();
//		
//		$prestudent_id = $result->prestudent_id;
//		$lv_id = $result->lv_id;
//		$sem_kurzbz = $result->sem_kurzbz;
//		$uid = $result->uid;
//
//		$berechtigt = $this->isAdminOrStudentCheckingItself($uid);
//		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');
//
//		if($sem_kurzbz === null || $sem_kurzbz === 'null') {
//
//			$result = $this->_ci->StudiensemesterModel->getAkt();
//			$aktuellesSem = getData($result)[0];
//			$sem_kurzbz = $aktuellesSem->studiensemester_kurzbz;
//		}
//		
//		$res = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByStudentByLvaForStudent($prestudent_id, $lv_id, $sem_kurzbz);
//
//		if(!isSuccess($res)) $this->terminateWithError($res);
//		$this->terminateWithSuccess($res);
//	}

	/**
	 * POST METHOD
	 * expects parameter 'zugangscode' - 8digit alphanumeric string
	 *
	 * performs anwesenheitskontrolle checkIn for students if they scanned/entered a zugangscode into their
	 * digital attendances mask.
	 *
	 * Does not update the status if anwesenheit_user entry is ENTSCHULDIGT_STATUS at time of checkIn.
	 *
	 * Checks for:
	 * 		1.) existing and valid zugangscode
	 * 		2.) qr code age to avoid abuse of uncleaned codes
	 * 		3.) existing and valid anwesenheitskontrolle
	 * 		// 4.) if checkIn is performed during time the kontrolle is meant for (could lead to impossible checks so
	 * 		       not in use right now)
	 * 		5.) existing and valid lehreinheit kontrolle is supposed to be meant for
	 * 		6.) if student is participant of said lehreineheit
	 * 		7.) if anwesenheiten_user entry exists to update (should in 100% of unmanipulated cases be true)
	 * 		8.) errors during the actual database update
	 *
	 * On successful checkIn returns various viewData for 'ScanComponent'
	 * Else returns adequate Error Message
	 */
	public function checkInAnwesenheit() {

		$result = $this->getPostJSON();
		$zugangscode = $result->zugangscode;

		$uid = getAuthUID();

		// find relevant entry from tbl_anwesenheit_check via zugangscode
		$result = $this->_ci->QRModel->loadWhere(array('zugangscode' => $zugangscode));

		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorInvalidCode'), 'general');

		// calculate age of zugangscode, since it might be a data relic a student abuses
		$codeDateString = $result->retval[0]->insertamum;
		$codeDateTime = new DateTime($codeDateString);

		$nowString = date("Y-m-d H:i:s");
		$nowDateTime = DateTime::createFromFormat('Y-m-d H:i:s', $nowString);

		$interval = $nowDateTime->diff($codeDateTime, true);
		$timeDiffInMilliseconds = $interval->d * 24 * 60 * 60 * 1000 + $interval->h * 60 * 60 * 1000 + $interval->i * 60 * 1000 + $interval->s * 1000;

		if($timeDiffInMilliseconds > ($this->_ci->config->item('REGENERATE_QR_TIMER')) * 2) {
			$this->terminateWithError(
				$this->p->t('global', 'errorCodeTooOld'), 'general'
			);
		}

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
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorCodeLinkedToInvalidLE'), 'general');

		$result = $this->_ci->AnwesenheitModel->isPersonAttendingLehreinheit($lehreinheit_id, $uid);

		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorNotParticipantOfLE'), 'general');
		$data = getData($result);
		$prestudent_id = $data[0]->prestudent_id;

		$result = $this->_ci->AnwesenheitUserModel->getAnwesenheitEntryByPrestudentIdDateLehreinheitId($prestudent_id, $lehreinheit_id, $von);
		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorNoUserEntriesForAttendanceCheckFound'), 'general');
		$entryToUpdate = getData($result)[0];

		// finally update the entry to anwesend
		if($entryToUpdate) {

			if($entryToUpdate->status !== $this->_ci->config->item('ENTSCHULDIGT_STATUS')) {
				$result = $this->_ci->AnwesenheitUserModel->update($entryToUpdate->anwesenheit_user_id, 
					array(
					'status' => $this->_ci->config->item('ANWESEND_STATUS'), 
					'updateamum' => date('Y-m-d H:i:s'),
					'updatevon' => getAuthUID(),
					'statussetamum' => date('Y-m-d H:i:s'),
					'statussetvon' => getAuthUID()
				));

				if (isError($result)) {
					$this->terminateWithError($this->p->t('global', 'errorUpdateUserEntry'), 'general');
				} else {
					$this->_returnViewDataCheckIn($prestudent_id, $lehreinheit_id, $von, $bis);
				}
			} else {
				$this->_returnViewDataCheckIn($prestudent_id, $lehreinheit_id, $von, $bis);

			}

		} else {
			$this->terminateWithError($this->p->t('global', 'errorPersonStudentIDMismatch'), 'general');
		}
	}

	private function _returnViewDataCheckIn($prestudent_id, $lehreinheit_id, $von, $bis)
	{
		$viewData = $this->_ci->AnwesenheitUserModel->getAnwesenheitenCheckViewData($prestudent_id, $lehreinheit_id);

		// if inserted successfully return some information to display who has entered
		// his anwesenheitscheck for which date and lehreinheit
		$this->terminateWithSuccess(array(
			'viewData' => json_encode($viewData),
			'von' => json_encode($von),
			'bis' => json_encode($bis)
		));
	}

	/**
	 * POST METHOD
	 * expects parameters FORMDATA{'von', 'bis', 'person_id', 'files'}
	 *
	 * Adds Entschuldigungs entry, uploads file with dms lib and sends automated email to
	 * relevant studiengangsassistenz that a new entschuldigung from student x on date y has been uploaded
	 * with a link to the entschuldigungsmanagement.
	 */
	public function addEntschuldigung()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		if (isEmptyString($_POST['von']) || isEmptyString($_POST['bis']) || isEmptyString($_POST['person_id']))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$vonTimestamp = strtotime($_POST['von']);
		$bisTimestamp = strtotime($_POST['bis']);
		$person_id = $_POST['person_id'];
		$noFileUpload = $_POST['noFileUpload'] ?? false;

		if ($vonTimestamp === false || $bisTimestamp === false)
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$isAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');
		$isAssistenz = $this->permissionlib->isBerechtigt('extension/anw_r_ent_assistenz');
		$isStudent = $this->permissionlib->isBerechtigt('extension/anw_r_student');

		$berechtigt = false;
		if($isStudent && $person_id == getAuthPersonId()) $berechtigt = true;
		if($isAdmin || $isAssistenz) $berechtigt = true;

		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'errorNoRightsToChangeData'), 'general');
		
		$dateLimitTimestamp = $this->calcMinDate($this->_ci->config->item('ENTSCHULDIGUNG_MAX_REACH') + 1); // +1 since frontend validates with a 1day larger range currently
		
		$isAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');
		
//		$this->addMeta('$dateLimit', $dateLimitTimestamp);
//		$this->addMeta('$vonTimestamp', $vonTimestamp);
		
		if ($vonTimestamp < $dateLimitTimestamp && !$isAdmin) {
			$this->terminateWithError("Provided date is older than allowed date");
		}
		
		if (!$noFileUpload) {
			// Upload file
			$uploadDataResult = uploadFile($_FILES['files']['name'], array('jpg', 'png', 'pdf'));

			// If an error occurred
			if (isError($uploadDataResult)) $this->terminateWithError($this->p->t('global', 'errorInvalidFiletype'));
			// If no data
			if (!hasData($uploadDataResult)) $this->terminateWithError('Upload error', 'errorInvalidFiletype'));

			// Add file to the DMS (DB + file system)
			$dmsFile = $this->_ci->dmslib->add(
				getData($uploadDataResult)['file_name'],
				getData($uploadDataResult)['file_type'],
				fopen(getData($uploadDataResult)['full_path'], 'r'),
				'ext_anw_entschuldigungen',
				null, // dokument_kurzbz
				null, // beschreibung
				false, // cis_suche
				null, // schlagworte
				getAuthUID() // insertvon
			);

			if(isError($dmsFile) || !hasData($dmsFile)) {
				$this->terminateWithError($this->p->t('global', 'errorInvalidFiletype'));
			}

			$dmsId = getData($dmsFile)->dms_id;
		} else {
			$dmsId = null;
		}

		$von = date('Y-m-d H:i:s', $vonTimestamp);
		$bis = date('Y-m-d H:i:s', $bisTimestamp);
		$result = $this->_ci->EntschuldigungModel->insert(
			array(
				'person_id' => $person_id,
				'von' => $von,
				'bis' => $bis,
				'dms_id' => $dmsId,
				'insertvon' => $this->_uid,
				'insertamum' => date('Y-m-d H:i:s'),
				'version' => 1
			)
		);

		$this->sendEmailToAssistenz($person_id, $dmsId, 'add');

		$this->terminateWithSuccess(['dms_id' => $dmsId, 'von' => $von, 'bis' => $bis, 'entschuldigung_id' => getData($result)]);
	}

	/**
	 * private utility function
	 * Expects parameter $workdaysAgo which is essentially ENTSCHULDIGUNG_CREATE_MAX_REACH config item
	 * calculates the date x workdays ago by skipping 3 days backwards on monday, else 1 day
	 */
	private function calcMinDate($workdaysAgo) {
		$date = new DateTime(); // today

		while ($workdaysAgo > 0) {
			// On Monday (1), subtract 3 days (skip Sat/Sun)
			if ((int) $date->format('N') === 1) {
				$date->modify('-3 days');
			} else {
				$date->modify('-1 day');
			}
			$workdaysAgo--;
		}

		return $date->getTimeStamp();
	}

	public function editEntschuldigung() {
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		if (isEmptyString($_POST['person_id']) || isEmptyString($_POST['entschuldigung_id'])) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		
		$person_id = $_POST['person_id'];
		$entschuldigung_id = $_POST['entschuldigung_id'];
		
		$isAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');
		$isAssistenz = $this->permissionlib->isBerechtigt('extension/anw_r_ent_assistenz');
		$isStudent = $this->permissionlib->isBerechtigt('extension/anw_r_student');

		$berechtigt = false;
		if($isStudent && $person_id == getAuthPersonId()) $berechtigt = true;
		if($isAdmin || $isAssistenz) $berechtigt = true;

		if(!$berechtigt) $this->terminateWithError($this->p->t('global', 'errorNoRightsToChangeData'), 'general');

		$result = $this->_ci->EntschuldigungModel->load($entschuldigung_id);
		if(isError($result) || !hasData($result)) {
			$this->terminateWithError($this->p->t('global', 'errorNoEntschuldigungFound'), 'general');
		}
		$entschuldigung = getData($result)[0];

		// Upload file
		$uploadDataResult = uploadFile($_FILES['files']['name'], array('jpg', 'png', 'pdf'));

		// If an error occurred
		if (isError($uploadDataResult)) $this->terminateWithError($this->p->t('global', 'errorInvalidFiletype'));
		// If no data
		if (!hasData($uploadDataResult)) $this->terminateWithError('Upload error', 'errorInvalidFiletype'));

		// Add file to the DMS (DB + file system)
		$dmsFile = $this->_ci->dmslib->add(
			getData($uploadDataResult)['file_name'],
			getData($uploadDataResult)['file_type'],
			fopen(getData($uploadDataResult)['full_path'], 'r'),
			'ext_anw_entschuldigungen',
			null, // dokument_kurzbz
			null, // beschreibung
			false, // cis_suche
			null, // schlagworte
			getAuthUID() // insertvon
		);

		if(isError($dmsFile) || !hasData($dmsFile)) {
			$this->terminateWithError($this->p->t('global', 'errorInvalidFiletype'));
		}

		// add old version to history table
		$this->_ci->EntschuldigungHistoryModel->insert(
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
		
		$dmsId = getData($dmsFile)->dms_id;
		
		$result = $this->_ci->EntschuldigungModel->update(
			$entschuldigung->entschuldigung_id,
			array(
				'person_id' => $person_id,
				'dms_id' => $dmsId,
				'updatevon' => $this->_uid,
				'updateamum' => date('Y-m-d H:i:s'),
				'version' => $entschuldigung->version + 1
			)
		);

		$this->sendEmailToAssistenz($person_id, $dmsId, 'edit');

		$this->terminateWithSuccess(['dms_id' => $dmsId, 'entschuldigung_id' => getData($result)]);
	}

	private function sendEmailToAssistenz($person_id_param, $dmsId, $type)
	{

		$isAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');
		$isAssistenz = $this->permissionlib->isBerechtigt('extension/anw_r_ent_assistenz');
		$isStudent = $this->permissionlib->isBerechtigt('extension/anw_r_student');

		// Get STG mail address for the uploading student
		$result = null;
		if($isStudent) {
			$result = $this->_ci->EntschuldigungModel->getMailInfoForStudent(getAuthPersonId());
		} elseif ($isAdmin || $isAssistenz) {
			$result = $this->_ci->EntschuldigungModel->getMailInfoForStudent($person_id_param);
		}
		
		if (isError($result))
			$this->terminateWithError(getError($result));

		if(!hasData($result)){
			return;
		}
		
		$data = getData($result)[0];
//		$this->addMeta('emailData', $data);
		//emailTo usually is 1 address, sometimes several seperated by ','
		$emails = explode(', ', $data->email);

		// Link to Entschuldigungsmanagement
		$url = APP_ROOT. 'index.ci.php/extensions/FHC-Core-Anwesenheiten/Administration';
		$studentname = $data->vorname.' '.$data->nachname;
		$student_uid = $data->student_uid;
		$stg = $data->kurzbzlang.' - '.$data->bezeichnung;
		$orgform = $data->dual ? 'DUAL' : $data->orgform_kurzbz;
		$sem = $data->semester.'. Semester';

		if($dmsId && $type == 'add' ) { // neue ent mit datei hochgeladen
			$vorlage = 'AnwesenheitSanchoEntschuldigung';
			$betreff = $this->p->t('global', 'entFullEmailBetreff');
		} else if($dmsId && $type == 'edit') { // datei für alte ent hochgeladen
			$vorlage = 'AnwEntFileAfter';
			$betreff = $this->p->t('global', 'entEditEmailBetreff');
		} else if(!$dmsId && $type == 'add') { // entschuldigung ohne datei uploaded
			$vorlage = 'AnwEntNoFile';
			$betreff = $this->p->t('global', 'entNewEmailBetreff');
		}

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
				$vorlage,
				$body_fields,
				$email,
				$betreff
			);
		}

	}

	/**
	 * POST METHOD
	 * expects parameters 'entschuldigung_id'
	 *
	 * Deletes Entschuldigung entry if it has not yet a accepted or declined status set.
	 */
	public function deleteEntschuldigung()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		$data = json_decode($this->input->raw_input_stream, true);
		$entschuldigung_id = (string)$data['entschuldigung_id'];

		if (isEmptyString($entschuldigung_id)) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$isStudent = $this->permissionlib->isBerechtigt('extension/anw_r_student');
		$isAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');
		
		if($isStudent) {
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnung($entschuldigung_id, getAuthPersonId());
		} else if($isAdmin) {
			$person_id_param = (string)$data['person_id'];
			
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnung($entschuldigung_id, $person_id_param);
		}
		
		if (hasData($zuordnung))
		{
			$entschuldigung = getData($zuordnung)[0];
			
			$person_id = $entschuldigung->person_id;

			// students are only allowed to fetch their own entschuldigungen
			if($isStudent && $person_id !== getAuthPersonId()) $this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

			$deletedEntschuldigung = $this->_ci->EntschuldigungModel->delete($entschuldigung->entschuldigung_id);
			
			if (isError($deletedEntschuldigung))
				$this->terminateWithError(getError($deletedEntschuldigung));

			$deletedFile = $this->_ci->aktelib->removeByPersonIdAndDmsId($entschuldigung->person_id, $entschuldigung->dms_id);

			if (isError($deletedFile))
				$this->terminateWithError(getError($deletedFile));

			$this->terminateWithSuccess($this->p->t('global', 'successDeleteEnschuldigung'));
		} else {
			$this->terminateWithError('Keine Zuordnung gefunden');
		}
	}

	/**
	 * POST METHOD
	 * expects parameters 'person_id'
	 *
	 * returns list of entschuldigungen entries for given person_id
	 */
	public function getEntschuldigungenByPersonID()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		$result = $this->getPostJSON();

		if(!property_exists($result, 'person_id')) {
			$this->terminateWithError($this->p->t('global', 'missingParameters'), 'general');
		}

		// todo: alternatively lookup gethAuthUid in students table
		// todo: this breaks when user has both berechtigungen, find alternative way to check if user is student
		$isStudent = $this->permissionlib->isBerechtigt('extension/anw_r_student');
		$person_id = $result->person_id;

		// students are only allowed to fetch their own entschuldigungen
		if($isStudent && $person_id !== getAuthPersonId()) $this->terminateWithError($this->p->t('ui', 'keineBerechtigung'), 'general');

		if(is_object($person_id) || isEmptyString($person_id)) {
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		}

		$result = $this->_ci->EntschuldigungModel->getEntschuldigungenByPerson($person_id);

		$this->terminateWithSuccess($result);
	}

	/**
	 * POST METHOD
	 * expects parameters 'lv_id', 'sem_kz', 'id'
	 *
	 * returns calculated anwesenheiten quota for student in lva in semester
	 */
	public function getAnwesenheitSumByLva()
	{
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kz;
		$prestudent_id = $result->id;

		$result = $this->_ci->AnwesenheitUserModel->getAnwesenheitSumByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!hasData($result)) $this->terminateWithError($this->p->t('global', 'errorCalculatingAnwQuota'), 'general');
		$this->terminateWithSuccess(getData($result));
	}

	/**
	 * @param $le_id
	 * @return bool
	 *
	 * checks Berechtigungen for Admin/Assistenz or is Student and sending their own $uid
	 */
	private function isAdminOrStudentCheckingItself($uid)
	{
		$isAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');
		if($isAdmin) return true;

		$isAssistenz = $this->permissionlib->isBerechtigt('extension/anw_r_ent_assistenz');
		if($isAssistenz) return true;

		$isStudent = $this->permissionlib->isBerechtigt('extension/anw_r_student');
		if($isStudent) {
			return getAuthUID() == $uid;
		}

		return false;
	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}
