<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Administration extends Auth_Controller
{

	private $_ci;
	private $_uid;

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
				'index' => array('extension/anwesenheit_admin:rw', 'extension/anw_ent_admin:rw')
			)
		);

		$this->_ci =& get_instance();

		$qrsetting_filename = APPPATH.'config/extensions/FHC-Core-Anwesenheiten/qrsettings.php';
		require_once($qrsetting_filename);

		// load libraries
		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('AuthLib');
		$this->_ci->load->library('DmsLib');

		$this->loadPhrases(
			array(
				'global',
				'ui',
				'filter'
			)
		);
		// Load helpers
		$this->setControllerId(); // sets the controller id
		$this->_setAuthUID(); // sets property uid

	}

	/**
	 * Index Controller
	 * @return void
	 */
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
				'studiengaengeAdmin' => $this->permissionlib->getSTG_isEntitledFor('extension/anwesenheit_admin'),
				'controller' => get_class($this)
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