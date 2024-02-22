<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Api extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'infoGetStudiensemester' => 'admin:rw',
				'infoGetAktStudiensemester' => 'admin:rw',
				'infoGetLehreinheitAndLektorData' => 'admin:rw',

				'lektorStudentByLva' => 'admin:rw',
				'lektorGetAllAnwesenheitenByLektor' => 'admin:rw',
				'lektorGetAllAnwesenheitenByStudentByLva' => 'admin:rw',
				'lektorUpdateAnwesenheiten' => 'admin:rw',
				'lektorGetNewQRCode' => 'admin:rw',
				'lektorGetExistingQRCode' => 'admin:rw',
				'lektorDeleteQRCode' => 'admin:rw',

				'studentGetAll' => 'admin:rw',
				'studentAddEntschuldigung' => 'admin:rw',
				'studentGetEntschuldigungen' => 'admin:rw',
				'studentDownload' => 'admin:rw',
				'studentCheckInAnwesenheit' => 'admin:rw' // TODO: change this one certainly
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');


		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

		$this->_setAuthUID(); // sets property uid
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

	public function infoGetLehreinheitAndLektorData()
	{
		// TODO: remove date parameter after testing
		$le_id = $this->input->get('le_id');
		$ma_uid = $this->input->get('ma_uid');
		$currentDate = $this->input->get('date');
//		$currentDate = date('Y-m-d');

		$lektorLehreinheitData = $this->AnwesenheitenModel->getLehreinheitAndLektorData($le_id, $ma_uid, $currentDate);

		$this->outputJsonSuccess(getData($lektorLehreinheitData));
	}

	// ASSISTENZ API


	// LEKTOR API

	public function lektorGetAllAnwesenheitenByLektor()
	{
		$ma_uid = $this->input->get('ma_uid');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitenModel->getAllAnwesenheitenByLektor($ma_uid, $lv_id, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->outputJson($res);
	}



	public function lektorGetAllAnwesenheitenByStudentByLva()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitenModel->getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->outputJson($res);
	}

	public function lektorUpdateAnwesenheiten()
	{
		$result = $this->getPostJSON();
		$changedAnwesenheiten = $result->changedAnwesenheiten;
		return $this->_ci->AnwesenheitenModel->updateAnwesenheiten($changedAnwesenheiten);
	}

	public function lektorGetExistingQRCode(){
		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		$result = $this->_ci->QRModel->loadWhere(array('lehreinheit_id' => $le_id));

		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		if(hasData($result)) { // resend existing qr

			$shortHash = $result->retval[0]->zugangscode;

			// TODO: maybe there is a better way to define $url? is APP_ROOT reliable?
			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";
			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash));
		} else {
			$this->outputJsonError("No existing Anwesenheitskontrolle found");
		}

	}



	public function lektorGetNewQRCode()
	{
		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		$beginn = $result->beginn;
		$beginnDate = date('Y-m-d H:i:s', mktime($beginn->hours, $beginn->minutes, $beginn->seconds));
		$ende = $result->ende;
		$endeDate = date('Y-m-d H:i:s', mktime($ende->hours, $ende->minutes, $ende->seconds));

		// maybe double check with stundenplan but api caller provides beginn/ende anyways
		// design choice

		// CHECKING FOR CURRENT STUNDENPLAN HOURS
//		$currentDate = date('Y-m-d');
//		$currentDate = '2023-10-02';
//
//		$result = $this->_ci->AnwesenheitenModel->getHoursForLE($le_id, $currentDate);
//
//		if(hasData($result)){ // set anwesenheit von/bis to fetched stundenplan data
//			$data = getData($result);
//		} else {
//			// request current von/bis Daten from Lektor
//
//		}

		// CORE OF QR GENERATOION

		// check if QR code already exists for given qrinfo
		$result = $this->_ci->QRModel->loadWhere(array('lehreinheit_id' => $le_id));

		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		if(hasData($result)) { // resend existing qr

			$shortHash = $result->retval[0]->zugangscode;

			// TODO: maybe there is a better way to define $url? is APP_ROOT reliable?
			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";
			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash));

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
				'lehreinheit_id' => $le_id,
				'insertamum' => date('Y-m-d H:i:s')
			));

			if (isError($insert))
				$this->terminateWithJsonError('Fehler beim Speichern');


			// insert Anwesenheiten entries of every Student as Abwesend
			$this->_ci->AnwesenheitenModel->createNewAnwesenheitenEntries($le_id, $beginnDate, $endeDate);

			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash));
		}
	}

	public function lektorDeleteQRCode()
	{

		// TODO: maybe wait with ACTUALLY deleting because stupid user will 99% prematurely cancel a check?

		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		$result = $this->_ci->QRModel->loadWhere(array('lehreinheit_id' => $le_id));

		if (hasData($result)) {
			$deleteresp = $this->_ci->QRModel->delete(array(
				'zugangscode' => $result->retval[0]->zugangscode,
				'lehreinheit_id' => $le_id
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



		$result = $this->_ci->AnwesenheitenModel->getAllByStudent('el23b115', $studiensemester);



		$this->outputJsonSuccess($result);
	}

	public function studentCheckInAnwesenheit() {

		$result = $this->getPostJSON();
		$zugangscode = $result->zugangscode;

		$person_id = getAuthPersonId();

		// find relevant entry from tbl_anwesenheit_check via zugangscode
		$result = $this->_ci->QRModel->loadWhere(array('zugangscode' => $zugangscode));
		// if not return
		if(!hasData($result)) $this->terminateWithJsonError("Ungültiger Zugangscode eingegeben.");

		$lehreinheit_id = $result->retval[0]->lehreinheit_id;
		$anwesenheit_id = $result->retval[0]->anwesenheit_id;

		// find relevant lehreinheit from relevant entry
		$result = $this->_ci->LehreinheitModel->loadWhere(array('lehreinheit_id' => $lehreinheit_id));
		$lehreinheit = $result->retval[0];

		if(!hasData($result)) $this->terminateWithJsonError("Zugangscode hat fehlerhafte Lehreinheit hinterlegt.");

		$result = $this->_ci->AnwesenheitenModel->getAllPersonIdsForLE($lehreinheit_id);
		if(!hasData($result)) $this->terminateWithJsonError("Lehreinheit hat keine Teilnehmer hinterlegt.");

		// check if the student/person sending the request is actually supposed to be in that lehreinheit
		$isLegit = false;
		$prestudent_id = null;
		forEach ($result->retval as $entry) {
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
//		$result = $this->_ci->AnwesenheitenModel->getAllAnwesenheitenByLehreinheitByDate($lehreinheit_id, $date);

		// TODO: check if counts and/or id's actually match

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

			$result = $this->_ci->AnwesenheitenModel->update($entryToUpdate->anwesenheit_id, array(
				'status' => 'anw', // TODO: lets not hardcode this here, or?
				'updateamum' => 'NOW()',
				'updatevon' => getAuthUID()
			));

			if (isError($result)) {
				return terminateWithJsonError('Anwesenheitskontrolle fehlgeschlagen.');
			} else {
				$viewData = $this->_ci->AnwesenheitenModel->getAnwesenheitenCheckViewData($entryToUpdate);

				// if inserted successfully return some information to display who has entered
				// his anwesenheitscheck for which date and lehreinheit
				$this->outputJsonSuccess(array(
					'message' => 'Anwesenheitskontrolle erfolgreich.',
					'entry' => json_encode($entry),
					'viewData' => json_encode($viewData)
				));
			}

		} else {
			$this->terminateWithJsonError("Person und Student ID Mismatch.");

		}
	}

	public function studentAddEntschuldigung()
	{

		/*if (isEmptyString($_POST['von']) || isEmptyString($_POST['bis']))
			$this->terminateWithJsonError('Falsche Parameterübergabe');*/

		/*$vonTimestamp = strtotime($_POST['von']);
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

		$dmsId = $dmsFile['dms_id'];*/

		$result = $this->_ci->EntschuldigungModel->insert(
			array(
				'person_id' => getAuthPersonId(),
				/*'von' =>  date('Y-m-d H:i:s', $vonTimestamp),
				'bis' => date('Y-m-d H:i:s', $bisTimestamp),*/
				'status' => 'e_hochgeladen', //TODO status überlegen
				'dms_id' => /*$dmsId*/ 287654,
				'insertvon' => $this->_uid
			)
		);

		if (isError($result))
			$this->terminateWithJsonError(getError($result));

		$this->outputJsonSuccess('Entschuldigung erfolgreich hochgeladen');

	}
	public function studentDownload()
	{
		$dms_id = $this->_ci->input->get('entschuldigung');

		if (isEmptyString($dms_id))
			$this->terminateWithJsonError($this->_ci->p->t('ui', 'errorFelderFehlen'));

		$person_id = getAuthPersonId();
		if ($person_id === 'Assistenz') //TODO prüfen
		{
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnung($dms_id);
		}
		else
		{
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnung($dms_id, getAuthPersonId());
		}

		if (hasData($zuordnung))
		{
			$file = $this->_ci->dmslib->download($dms_id, 'Entschuldigung.pdf', 'attachment');
			$this->outputFile(getData($file));
		}

	}

	public function studentGetEntschuldigungen()
	{
		$this->outputJsonSuccess($this->_ci->EntschuldigungModel->getEntschuldigungen(getAuthPersonId()));
	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}

