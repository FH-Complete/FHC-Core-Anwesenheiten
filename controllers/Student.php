<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Student extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'index' => 'admin:rw',
				'getAll' => 'admin:rw',
				'addEntschuldigung' => 'admin:rw',
				'getEntschuldigungen' => 'admin:rw',
				'download' => 'admin:rw',
				'checkInAnwesenheit' => 'admin:rw' // TODO: change this one certainly
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');


		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

		$this->loadPhrases(
			array(
				'global',
				'ui',
				'filter'
			)
		);

		$this->setControllerId(); // sets the controller id
		$this->_setAuthUID(); // sets property uid
	}


	public function index()
	{


		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Anwesenheiten', [
			'permissions' => [
				'admin/rw' => $this->permissionlib->isBerechtigt('admin/rw'),
				'student/alias' => $this->permissionlib->isBerechtigt('student/alias')
			]
		]);
	}
	
	public function getAll()
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

	public function checkInAnwesenheit() {

		$result = $this->getPostJSON();
		$zugangscode = $result->zugangscode;

		// how else can i know which user sent this request?
		$person_id = getAuthPersonId();

		// find relevant entry from tbl_anwesenheit_check via zugangscode
		$result = $this->_ci->QRModel->loadWhere(array('zugangscode' => $zugangscode));
		// if not return smth like "wrong code eingegeben sry"
		if(!hasData($result)) $this->terminateWithJsonError("Ungültiger Zugangscode eingegeben.");


		$lehreinheit_id = $result->retval[0]->lehreinheit_id;

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

		// if johann is testing
		if($person_id === 110810) {
			$prestudent_id = 157641; // roman eisner
			$isLegit = true;
		}

		// to avoid random people being anwesend in random lectures
		if(!$isLegit) $this->terminateWithJsonError("Sie sind nicht als Teilnehmer der Lehreinheit eingetragen.");

		// check if there is already an anwesenheit written to lehreinheit on current date
		$date = date('Y-m-d');
		$result = $this->_ci->AnwesenheitenModel->getAllAnwesenheitenByLehreinheitByDate($lehreinheit_id, $date);

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
				// TODO: anwesenheit timestamp & person
				// if inserted successfully return some information to display who has entered
				// his anwesenheitscheck for which date and lehreinheit
				$this->outputJsonSuccess(array(
					'message' => 'happy response',
					'entry' => json_encode($entryToUpdate),
					'lehreinheit' => json_encode($lehreinheit),
				));
			}

		} else {
			$this->terminateWithJsonError("Person und Student ID Mismatch.");

		}
	}
	
	public function addEntschuldigung()
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
	public function download()
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
	
	public function getEntschuldigungen()
	{
		$this->outputJsonSuccess($this->_ci->EntschuldigungModel->getEntschuldigungen(getAuthPersonId()));
	}
	/**
	 * Retrieve the UID of the logged user and checks if it is valid
	 */
	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid) show_error('User authentification failed');
	}

}

