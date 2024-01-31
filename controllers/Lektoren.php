<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Lektoren extends Auth_Controller
{

	private $_ci;
	private $_uid;

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
				'index' => 'admin:rw',
				'selectAnwesenheitenByLektor' => 'admin:rw'
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');


		// load libraries
		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');

		$this->loadPhrases(
			array(
				'global',
				'ui',
				'filter'
			)
		);
		// Load helpers
		$this->load->helper('array');
		$this->setControllerId(); // sets the controller id
		$this->_setAuthUID(); // sets property uid

	}

	public function selectAnwesenheitenByLektor()
	{
		$ma_uid = $this->input->get('ma_uid');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitenModel->getAnwesenheitenByLektor($ma_uid, $lv_id, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->outputJson($res);
	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{
		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Overview');
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

