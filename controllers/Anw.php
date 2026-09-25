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
				'index' => array('extension/anw_r_full_assistenz:r', 'extension/anw_r_student:rw', 'extension/anw_r_ent_assistenz:rw', 'extension/anw_r_lektor:rw')
			)
		);

		$this->_ci =& get_instance();

		// load libraries
		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('extensions/FHC-Core-Anwesenheiten/AnwesenheitenLib');
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
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');

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
			'permissions' => $this->_ci->anwesenheitenlib->getViewPermissions()
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