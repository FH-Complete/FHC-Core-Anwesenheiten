<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

use \chillerlan\QRCode\QROptions;
use \chillerlan\QRCode\QRCode;

class Api extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'infoGetStudiensemester' => 'admin:rw',
				'infoGetAktStudiensemester' => 'admin:rw',
				'infoGetLehreinheitAndLektorInfo' => 'admin:rw',
				'infoGetStudentInfo' => 'admin:rw',

				'lektorStudentByLva' => 'admin:rw',
				'lektorGetAllAnwesenheitenByLva' => 'admin:rw',
				'lektorGetAllAnwesenheitenByStudentByLva' => 'admin:rw',
				'lektorUpdateAnwesenheiten' => 'admin:rw',
				'lektorGetNewQRCode' => 'admin:rw',
				'lektorGetExistingQRCode' => 'admin:rw',
				'lektorDeleteQRCode' => 'admin:rw',

				'studentGetAll' => 'admin:rw',
				'studentAddEntschuldigung' => 'admin:rw',
				'studentDeleteEntschuldigung' => 'admin:rw',
				'studentGetEntschuldigungenByPerson' => 'admin:rw',
				'studentDownload' => 'admin:rw',
				'studentCheckInAnwesenheit' => 'admin:rw',
				'studentGetAnwesenheitSumByLva' => 'admin:rw',

				'assistenzGetEntschuldigungen' => 'admin:rw',
				'assistenzUpdateEntschuldigung' => 'admin:rw'
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
		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');
		$this->_ci->load->library('AuthLib');

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
		$this->outputJsonSuccess(getData($studiensemester));
	}

	public function infoGetAktStudiensemester()
	{
		$this->outputJsonSuccess(getData($this->_ci->StudiensemesterModel->getAkt()));
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

		$this->outputJsonSuccess(getData($lektorLehreinheitData));
	}

	public function infoGetStudentInfo()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lva_id = $this->input->get('lva_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$studentLvaData = $this->AnwesenheitModel->getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz);

		$this->outputJsonSuccess(getData($studentLvaData));
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
		$this->outputJson($res);
	}

	public function lektorGetAllAnwesenheitenByStudentByLva()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->outputJson($res);
	}

	public function lektorUpdateAnwesenheiten()
	{
		$result = $this->getPostJSON();
		$changedAnwesenheiten = $result->changedAnwesenheiten;
		return $this->_ci->AnwesenheitUserModel->updateAnwesenheiten($changedAnwesenheiten);
	}

	public function lektorGetExistingQRCode(){
		$resultPost= $this->getPostJSON();
		$le_ids = $resultPost->le_ids;

		// we assume that every LE provided when starting a new check was supposed to point to the same qr code
		// anyways, just per different anwesenheit_ids
		$le_id = $le_ids[0];

		$resultKontrolle = $this->_ci->QRModel->getActiveCodeForLE($le_id);
		if(!hasData($resultKontrolle)) $this->terminateWithJsonError("No existing Anwesenheitskontrolle found");

		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		$anwesenheit_id = $resultKontrolle->retval[0]->anwesenheit_id;
		$shortHash = $resultKontrolle->retval[0]->zugangscode;
		if($shortHash) { // resend existing qr

			// TODO: maybe there is a better way to define $url? is APP_ROOT reliable?
			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";
			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));

		}

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


		$resultKontrolle = $this->_ci->QRModel->getActiveCodeForLE($le_id);

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
			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));

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
				'insertamum' => date('Y-m-d H:i:s')
			));

			if (isError($insert))
				$this->terminateWithJsonError('Fehler beim Speichern');

			// insert Anwesenheiten entries of every Student as Abwesend
			$this->_ci->AnwesenheitUserModel->createNewUserAnwesenheitenEntries($le_id, $anwesenheit_id, $von, $bis);

			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash, 'anwesenheit_id' => $anwesenheit_id));
		}
	}

	public function lektorDeleteQRCode()
	{

		// TODO: maybe wait with ACTUALLY deleting because stupid user will 99% prematurely cancel a check?

		$result = $this->getPostJSON();

		$anwesenheit_id = $result->anwesenheit_id;

		$result = $this->_ci->QRModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));

		if (hasData($result)) {
			$deleteresp = $this->_ci->QRModel->delete(array(
				'zugangscode' => $result->retval[0]->zugangscode
			));

			return $deleteresp;
		} else {
			$this->terminateWithJsonError('Fehler beim Löschen der Anwesenheitskontrolle');
		}
	}

	// STUDENT API

	public function studentGetAll()
	{
		$studiensemester = $this->_ci->input->get('studiensemester');

		if (!isEmptyString($studiensemester))
		{
			/*$studiensemester = $this->_ci->StudiensemesterModel->load($studiensemester);

			if (isError($studiensemester) || !hasData($studiensemester))
				$this->terminateWithJsonError('Falsche Parameterübergabe');

			$studiensemester = getData($studiensemester)[0]->studiensemester_kurzbz;*/
		}



		$result = $this->_ci->AnwesenheitModel->getAllByStudent('el23b115', $studiensemester);



		$this->outputJsonSuccess($result);
	}

	public function studentCheckInAnwesenheit() {

		$result = $this->getPostJSON();
		$zugangscode = $result->zugangscode;

		$person_id = getAuthPersonId();

		// find relevant entry from tbl_anwesenheit_check via zugangscode
		$result = $this->_ci->QRModel->loadWhere(array('zugangscode' => $zugangscode));
		if(!hasData($result)) $this->terminateWithJsonError("Ungültiger Zugangscode eingegeben.");

		// find relevant entry from tbl_anwesenheit via anwesenheit_id
		$anwesenheit_id = $result->retval[0]->anwesenheit_id;
		$result = $this->_ci->AnwesenheitModel->loadWhere(array('anwesenheit_id' => $anwesenheit_id));
		if(!hasData($result)) $this->terminateWithJsonError("Zugangscode hat fehlerhafte Anwesenheitskontrolle hinterlegt.");


		$lehreinheit_id = $result->retval[0]->lehreinheit_id;

		// find relevant lehreinheit from relevant entry
		$result = $this->_ci->LehreinheitModel->loadWhere(array('lehreinheit_id' => $lehreinheit_id));
		$lehreinheit = $result->retval[0];

		if(!hasData($result)) $this->terminateWithJsonError("Zugangscode hat fehlerhafte Lehreinheit hinterlegt.");

		$resultAnwKontrolle = $this->_ci->AnwesenheitModel->getAllPersonIdsForLE($lehreinheit_id);
		if(!hasData($result)) $this->terminateWithJsonError("Lehreinheit hat keine Teilnehmer hinterlegt.");

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
		if(!$isLegit) $this->terminateWithJsonError("Sie sind nicht als Teilnehmer der Lehreinheit eingetragen.");

		// check if there is already an anwesenheit written to lehreinheit on date of check
		$date = date('Y-m-d');
		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLehreinheitByDate($lehreinheit_id, $date);

		// all entries need to be inserted on start
		if(!hasData($result)) $this->terminateWithJsonError("Keine Anwesenheitseinträge gefunden für die Lehreinheit an diesem Datum");

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
				return terminateWithJsonError('Anwesenheitskontrolle fehlgeschlagen.');
			} else {
				$viewData = $this->_ci->AnwesenheitUserModel->getAnwesenheitenCheckViewData($prestudent_id, $lehreinheit_id);

				// if inserted successfully return some information to display who has entered
				// his anwesenheitscheck for which date and lehreinheit
				$this->outputJsonSuccess(array(
					'message' => 'Anwesenheitskontrolle erfolgreich.',
					'anwesenheitEntry' => json_encode($entry),
					'viewData' => json_encode($viewData)
				));
			}

		} else {
			$this->terminateWithJsonError("Person und Student ID Mismatch.");

		}
	}

	public function studentAddEntschuldigung()
	{
		if (isEmptyString($_POST['von']) || isEmptyString($_POST['bis']))
			$this->terminateWithJsonError('Falsche Parameterübergabe');

		$vonTimestamp = strtotime($_POST['von']);
		$bisTimestamp = strtotime($_POST['bis']);

		if ($vonTimestamp === false || $bisTimestamp === false)
			$this->terminateWithJsonError('Falsche Parameterübergabe');

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
			$this->terminateWithJsonError(getError($result));

		$this->outputJsonSuccess(['dms_id' => $dmsId, 'von' => $von, 'bis' => $bis, 'entschuldigung_id' => getData($result)]);
	}

	public function studentDownload()
	{
		$dms_id = $this->_ci->input->get('entschuldigung');

		if (isEmptyString($dms_id))
			$this->terminateWithJsonError($this->_ci->p->t('ui', 'errorFelderFehlen'));

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
			$this->terminateWithJsonError('Error');

		$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnung($entschuldigung_id, /*getAuthPersonId()*/ 106538);

		if (hasData($zuordnung))
		{
			$entschuldigung = getData($zuordnung)[0];

			$deletedEntschuldigung = $this->_ci->EntschuldigungModel->delete($entschuldigung->entschuldigung_id);

			if (isError($deletedEntschuldigung))
				$this->terminateWithJsonError(getError($deletedEntschuldigung));

			$deletedFile = $this->_ci->dmslib->delete($entschuldigung->person_id, $entschuldigung->dms_id);
			if (isError($deletedFile))
				$this->terminateWithJsonError(getError($deletedFile));

			$this->outputJsonSuccess('Success');
		}

	}

	public function studentGetEntschuldigungenByPerson()
	{
		$this->outputJsonSuccess($this->_ci->EntschuldigungModel->getEntschuldigungenByPerson(getAuthPersonId()));
	}

	public function studentGetAnwesenheitSumByLva() {
		$result = $this->getPostJSON();
		$lv_id = $result->lv_id;
		$sem_kurzbz = $result->sem_kz;
		$prestudent_id = $result->id;

		$this->outputJsonSuccess($this->_ci->AnwesenheitUserModel->getAnwesenheitSumByLva($prestudent_id, $lv_id, $sem_kurzbz));
	}



	// ASSISTENZ API

	public function assistenzGetEntschuldigungen()
	{
		$this->outputJsonSuccess($this->_ci->EntschuldigungModel->getEntschuldigungen());
	}

	public function assistenzUpdateEntschuldigung()
	{
		$data = json_decode($this->input->raw_input_stream, true);

		$entschuldigung_id = $data['entschuldigung_id'];
		$status = $data['status'];

		if (isEmptyString($entschuldigung_id) || !in_array($status, [true, false]))
			$this->terminateWithJsonError('Error');

		$entschuldigung = $this->_ci->EntschuldigungModel->load($entschuldigung_id);

		if (isError($entschuldigung))
			$this->terminateWithJsonError('Error');
		if (!hasData($entschuldigung))
			$this->terminateWithJsonError('Error');

		$entschuldigung = getData($entschuldigung)[0];
		if ($entschuldigung->akzeptiert !== $status)
		{
			$updateStatus = $status ? 'entschuldigt' : 'abwesend';

			$updateAnwesenheit = $this->_ci->AnwesenheitModel->updateAnwesenheitenByDatesStudent($entschuldigung->von, $entschuldigung->bis, $entschuldigung->person_id, $updateStatus);
			if (isError($updateAnwesenheit))
				$this->terminateWithJsonError($updateAnwesenheit);

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
				$this->terminateWithJsonError('Error');
		}

		$this->outputJsonSuccess('Erfolgreich gespeichert');
	}

}

