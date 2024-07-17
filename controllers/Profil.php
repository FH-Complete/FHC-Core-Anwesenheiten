<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Profil extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'index' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_student:rw'),
				'getEntschuldigungFile' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_student:rw')
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

		$qrsetting_filename = APPPATH.'config/extensions/FHC-Core-Anwesenheiten/qrsettings.php';
		require_once($qrsetting_filename);

		$this->_ci->load->library('PermissionLib');
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
		$viewData = array(
			'permissions' => [
				'admin' => $this->permissionlib->isBerechtigt('extension/anwesenheit_admin'),
				'assistenz' => $this->permissionlib->isBerechtigt('extension/anw_ent_admin'),
				'lektor' => $this->permissionlib->isBerechtigt('extension/anwesenheit_lektor'),
				'student' => $this->permissionlib->isBerechtigt('extension/anwesenheit_student'),
				'authID' => getAuthUID(),
				'anwesend_status' => ANWESEND_STATUS,
				'abwesend_status' => ABWESEND_STATUS,
				'entschuldigt_status' => ENTSCHULDIGT_STATUS,
				'entschuldigungMaxReach' => ENTSCHULDIGUNG_MAX_REACH,
				'studiengaengeAssistenz' => $this->permissionlib->getSTG_isEntitledFor('extension/anw_ent_admin'),
				'studiengaengeAdmin' => $this->permissionlib->getSTG_isEntitledFor('extension/anwesenheit_admin')
			]
		);

		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Anwesenheiten', $viewData);
	}

	public function getEntschuldigungFile()
	{
		$dms_id = $this->_ci->input->get('entschuldigung');

		if (isEmptyString($dms_id))
			$this->terminateWithError($this->_ci->p->t('global', 'wrongParameters'));

		$person_id = getAuthPersonId();
		$isAdmin = $this->permissionlib->isBerechtigt('extension/anwesenheit_admin');
		$isEntAdmin = $this->permissionlib->isBerechtigt('extension/anw_ent_admin');

		if ($this->_ci->MitarbeiterModel->isMitarbeiter($this->_uid) && ($isAdmin || $isEntAdmin))
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id);
		else
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id, $person_id);

		if (hasData($zuordnung)) {
			$file = $this->_ci->dmslib->download($dms_id, null, 'attachment');
			// remove server filepath from name
			preg_match("~[^/]+$~", $file->retval->name, $matches);
			$file->retval->name = $matches[0];
			$this->outputFile(getData($file));
		}

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

