<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Profil extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'index' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw'),
			)
		);

		$this->_ci =& get_instance();

		$qrsetting_filename = APPPATH.'config/extensions/FHC-Core-Anwesenheiten/qrsettings.php';
		require_once($qrsetting_filename);

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');

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
				'assistenz' => $this->permissionlib->isBerechtigt('extension/anwesenheit_assistenz'),
				'lektor' => $this->permissionlib->isBerechtigt('extension/anwesenheit_lektor'),
				'student' => $this->permissionlib->isBerechtigt('extension/anwesenheit_student'),
				'authID' => getAuthUID(),
				'studiengaengeAssistenz' => $this->permissionlib->getSTG_isEntitledFor('extension/anwesenheit_assistenz')
			]
		);

		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Anwesenheiten', $viewData);
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

