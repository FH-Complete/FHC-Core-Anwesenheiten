<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Anw extends Auth_Controller
{
	private $_ci;
	private $_uid;

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
				'index' => array('extension/anwesenheit_admin:rw', 'extension/anwesenheit_student:rw', 'extension/anw_ent_admin:rw', 'extension/anwesenheit_lektor:rw')
			)
		);

		$qrsetting_filename = APPPATH.'config/extensions/FHC-Core-Anwesenheiten/qrsettings.php';
		require_once($qrsetting_filename);

		$this->_ci =& get_instance();

		// load libraries
		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('AuthLib');

		$this->loadPhrases(
			array(
				'global',
				'ui',
				'anwesenheiten'
			)
		);

		// Load helpers
		$this->load->helper('array');
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
				'regenerateQRTimer' => REGENERATE_QR_TIMER,
				'useRegenerateQR' => USE_REGENERATE_QR,
				'entschuldigungMaxReach' => ENTSCHULDIGUNG_MAX_REACH,
				'kontrolleDeleteMaxReach' => KONTROLLE_DELETE_MAX_REACH,
				'anwesend_status' => ANWESEND_STATUS,
				'abwesend_status' => ABWESEND_STATUS,
				'entschuldigt_status' => ENTSCHULDIGT_STATUS,
				'studiengaengeAssistenz' => $this->permissionlib->getSTG_isEntitledFor('extension/anw_ent_admin'),
				'studiengaengeAdmin' => $this->permissionlib->getSTG_isEntitledFor('extension/anwesenheit_admin'),
				'controller' => "Anw"
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

