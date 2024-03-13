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
				'infoGetStudiensemester' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetAktStudiensemester' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetLehreinheitAndLektorInfo' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'infoGetStudentInfo' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),

				'lektorStudentByLva' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetAllAnwesenheitenByLva' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetAllAnwesenheitenByStudentByLva' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorUpdateAnwesenheiten' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorRegenerateQRCode' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorDegenerateQRCode' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetNewQRCode' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorGetExistingQRCode' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorDeleteQRCode' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'lektorDeleteAnwesenheitskontrolle' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),

				'studentGetAll' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'studentAddEntschuldigung' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentDeleteEntschuldigung' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentGetEntschuldigungenByPerson' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentDownload' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentCheckInAnwesenheit' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
				'studentGetAnwesenheitSumByLva' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw', 'extension/anwesenheit_student:rw'),
				'studentDeleteUserAnwesenheitById' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),
				'studentDeleteUserAnwesenheitByIds' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_lektor:rw'),

				'assistenzGetEntschuldigungen' => array('admin:rw', 'extension/anwesenheit_assistenz:rw'),
				'assistenzUpdateEntschuldigung' => array('admin:rw', 'extension/anwesenheit_assistenz:rw')
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


		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

		$this->_setAuthUID(); // sets property uid
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
		// TODO: remove date parameter after testing
		$result = $this->getPostJSON();
		$le_ids = $result->le_ids;
		$ma_uid = $result->ma_uid;
		$currentDate = $result->date ;

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

		$studentLvaData = $this->AnwesenheitModel->getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz);

		$this->terminateWithSuccess(getData($studentLvaData));
	}

	// LEKTOR API

	public function lektorGetAllAnwesenheitenByLva()
	{
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kurzbz;
		$le_ids = $result->le_ids ;

		$res = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLektor($lv_id, $le_ids, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->terminateWithSuccess($res);
	}

	public function lektorGetAllAnwesenheitenByStudentByLva()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->terminateWithSuccess($res);
	}

	public function lektorUpdateAnwesenheiten()
	{
		$result = $this->getPostJSON();
		$changedAnwesenheiten = $result->changedAnwesenheiten;
		$result = $this->_ci->AnwesenheitUserModel->updateAnwesenheiten($changedAnwesenheiten);

		if(!hasData($result)) $this->terminateWithError("Error updating Anwesenheiten");
		$this->terminateWithSuccess(getData($result));
	}

	public function lektorGetExistingQRCode(){
		$resultPost= $this->getPostJSON();
		$le_ids = $resultPost->le_ids;

		// we assume that every LE provided when starting a new check was supposed to point to the same qr code
		// anyways, just per different anwesenheit_ids
		$le_id = $le_ids[0];

		$resultQR = $this->_ci->QRModel->getActiveCodeForLE($le_id);

		// TODO: maybe handle this as error? should be expected behaviour and thus success
		if(!hasData($resultQR)) $this->terminateWithSuccess("No existing Anwesenheitskontrolle found");


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

			// TODO: maybe there is a better way to define $url? is APP_ROOT reliable?
			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";
			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));

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
			$this->terminateWithError('Fehler beim Speichern');

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

		if(!$deleteresp) $this->terminateWithError('Fehler beim degenerieren des QRCode');

		return $deleteresp;
	}

	public function lektorGetNewQRCode()
	{
		$result = $this->getPostJSON();
		$le_ids = $result->le_ids;

		// TODO: find solution for multiple LE
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

			$resultQR = $this->_ci->QRModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));

			$this->_handleResultQR($resultQR, $qrcode, $anwesenheit_id, $le_id, $von, $bis);
		}
	}

	private function _handleResultQR($resultQR, $qrcode, $anwesenheit_id, $le_id, $von, $bis){

		if(hasData($resultQR)) { // resend existing qr

			$shortHash = $resultQR->retval[0]->zugangscode;

			// TODO: maybe there is a better way to define $url? is APP_ROOT reliable?
			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";
			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));

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
				$this->terminateWithError('Fehler beim Speichern');

			// insert Anwesenheiten entries of every Student as Abwesend
			$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries($le_id, $anwesenheit_id, $von, $bis);

			$this->terminateWithSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));
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
			$this->terminateWithError('Fehler beim Löschen der Anwesenheitskontrolle');
		}
	}

	public function lektorDeleteAnwesenheitskontrolle() {
		$result = $this->getPostJSON();
		$le_ids = $result->le_ids;
		$le_id = $le_ids[0];
		$date = $result->date;

		// find anwesenheitkontrolle by le_id and date
		$resultKontrolle = $this->_ci->AnwesenheitModel->getKontrolleForLEOnDate($le_id, $date);

		if(!hasData($resultKontrolle)) $this->terminateWithError('Keine Anwesenheitskontrolle gefunden für Lehreinheit '.$le_id.' am '.$date->year.'-'.$date->month.'-'.$date->day.'.');
		$anwesenheit_id = getData($resultKontrolle)[0]->anwesenheit_id;

		// delete user anwesenheiten by anwesenheit_id of kontrolle
		$resultDelete = $this->_ci->AnwesenheitUserModel->deleteAllByAnwesenheitId($anwesenheit_id);

		if(!hasData($resultDelete)) $this->terminateWithError('Fehler beim Löschen der User Anwesenheiten für Lehreinheit '.$le_id.' am '.$date->year.'-'.$date->month.'-'.$date->day.'.');


		// delete kontrolle itself
		$result = $this->_ci->AnwesenheitModel->delete(array('anwesenheit_id'=>$anwesenheit_id));

		// delete kontrolle
		if(!hasData($result)) $this->terminateWithError('Fehler beim Löschen der User Anwesenheiten für Lehreinheit '.$le_id.' am '.$date->year.'-'.$date->month.'-'.$date->day.'.');

		$this->terminateWithSuccess('Löschen der Anwesenheitskontrolle für Lehreinheit '.$le_id.' am '.$date->year.'-'.$date->month.'-'.$date->day.' erfolgreich.');
	}

	// STUDENT API

	public function studentGetAll()
	{
		$studiensemester = $this->_ci->input->get('studiensemester');

		if (!isEmptyString($studiensemester))
		{
			$studiensemester = $this->_ci->StudiensemesterModel->load($studiensemester);

			if (isError($studiensemester) || !hasData($studiensemester))
				$this->terminateWithError('Falsche Parameterübergabe');

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
		if(!hasData($result)) $this->terminateWithError("Ungültiger Zugangscode eingegeben.");

		// find relevant entry from tbl_anwesenheit via anwesenheit_id
		$anwesenheit_id = $result->retval[0]->anwesenheit_id;
		$result = $this->_ci->AnwesenheitModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));
		if(!hasData($result)) $this->terminateWithError("Zugangscode hat fehlerhafte Anwesenheitskontrolle hinterlegt.");


		$lehreinheit_id = $result->retval[0]->lehreinheit_id;

		// find relevant lehreinheit from relevant entry
		$result = $this->_ci->LehreinheitModel->loadWhere(array('lehreinheit_id' => $lehreinheit_id));
		$lehreinheit = $result->retval[0];

		if(!hasData($result)) $this->terminateWithError("Zugangscode hat fehlerhafte Lehreinheit hinterlegt.");

		$resultAnwKontrolle = $this->_ci->AnwesenheitModel->getAllPersonIdsForLE($lehreinheit_id);
		if(!hasData($result)) $this->terminateWithError("Lehreinheit hat keine Teilnehmer hinterlegt.");

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
		if(!$isLegit) $this->terminateWithError("Sie sind nicht als Teilnehmer der Lehreinheit eingetragen.");

		// check if there is already an anwesenheit written to lehreinheit on date of check
		$date = date('Y-m-d');
		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLehreinheitByDate($lehreinheit_id, $date);

		// all entries need to be inserted on start
		if(!hasData($result)) $this->terminateWithError("Keine Anwesenheitseinträge gefunden für die Lehreinheit an diesem Datum");

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
				return terminateWithError('Anwesenheitskontrolle fehlgeschlagen.');
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
			$this->terminateWithError("Person und Student ID Mismatch.");

		}
	}

	public function studentAddEntschuldigung()
	{
		if (isEmptyString($_POST['von']) || isEmptyString($_POST['bis']))
			$this->terminateWithError('Falsche Parameterübergabe');

		$vonTimestamp = strtotime($_POST['von']);
		$bisTimestamp = strtotime($_POST['bis']);

		if ($vonTimestamp === false || $bisTimestamp === false)
			$this->terminateWithError('Falsche Parameterübergabe');

		$file = array(
			'kategorie_kurzbz' => 'fas',
			'version' => 0,
			'name' => $_FILES['files']['name'],
			'mimetype' => $_FILES['files']['type'],
			'insertamum' => date('Y-m-d H:i:s'),
			'insertvon' => $this->_uid
		);

		$dmsFile = $this->_ci->dmslib->upload($file, 'files', array('pdf'));
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

		$this->terminateWithSuccess(['dms_id' => $dmsId, 'von' => $von, 'bis' => $bis, 'entschuldigung_id' => getData($result)]);
	}

	public function studentDownload()
	{
		$dms_id = $this->_ci->input->get('entschuldigung');

		if (isEmptyString($dms_id))
			$this->terminateWithError($this->_ci->p->t('ui', 'errorFelderFehlen'));

		$person_id = getAuthPersonId();

		//TODO (david) noch prüfen ob der Mitarbeiter Zugriff haben sollte
		if ($this->_ci->MitarbeiterModel->isMitarbeiter($this->_uid))
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id);
		else
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id, $person_id);

		if (hasData($zuordnung))
		{
			$file = $this->_ci->dmslib->download($dms_id, 'Entschuldigung.pdf', 'attachment');
			$this->outputFile(getData($file));
		}

	}

	public function studentDeleteEntschuldigung()
	{
		$data = json_decode($this->input->raw_input_stream, true);
		$entschuldigung_id = $data['entschuldigung_id'];

		if (isEmptyString($entschuldigung_id))
			$this->terminateWithError('Error');

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

			$this->terminateWithSuccess('Success');
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

		if(!hasData($result)) $this->terminateWithError('Fehler bei der Berechnung der Anwesenheitsquote.');
		$this->terminateWithSuccess(getData($result));
	}

	public function studentDeleteUserAnwesenheitById() {
		$result = $this->getPostJSON();
		$anwesenheit_user_id = $result->anwesenheit_user_id;

		$deleteresp = $this->_ci->AnwesenheitUserModel->delete(array(
			'anwesenheit_user_id' => $anwesenheit_user_id
		));

		if(!hasData($deleteresp)) $this->terminateWithError('Fehler beim löschen des Anwesenheitseintrags.');

		$this->terminateWithSuccess(getData($deleteresp));
	}

	public function studentDeleteUserAnwesenheitByIds() {
		$result = $this->getPostJSON();
		$ids = $result->ids;

		$deleteresp = $this->_ci->AnwesenheitUserModel->deleteUserAnwesenheitByIds($ids);

		if(!hasData($deleteresp)) $this->terminateWithError('Fehler beim löschen der Anwesenheitseinträge.');

		$this->terminateWithSuccess(getData($deleteresp));
	}

	// ASSISTENZ API

	public function assistenzGetEntschuldigungen()
	{
		$this->terminateWithSuccess($this->_ci->EntschuldigungModel->getEntschuldigungen());
	}

	public function assistenzUpdateEntschuldigung()
	{
		$data = json_decode($this->input->raw_input_stream, true);

		$entschuldigung_id = $data['entschuldigung_id'];
		$status = $data['status'];

		if (isEmptyString($entschuldigung_id) || !in_array($status, [true, false]))
			$this->terminateWithError('Error');

		$entschuldigung = $this->_ci->EntschuldigungModel->load($entschuldigung_id);

		if (isError($entschuldigung))
			$this->terminateWithError('Error');
		if (!hasData($entschuldigung))
			$this->terminateWithError('Error');

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
				$this->terminateWithError('Error');
		}

		$this->terminateWithSuccess('Erfolgreich gespeichert');
	}

}

