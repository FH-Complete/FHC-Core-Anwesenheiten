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
				'download' => 'admin:rw'
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		

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
		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Anwesenheiten');
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

