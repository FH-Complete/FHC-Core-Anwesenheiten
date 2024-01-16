<?php
if (! defined('BASEPATH')) exit('No direct script access allowed');

class MyExtension extends Auth_Controller
{
	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
                'index'     => 'extension/anwesenheit_admin:rw',
                'save'      => 'extension/anwesenheit_admin:rw',
                'edit'      => 'extension/anwesenheit_admin:rw',
                'delete'    => 'extension/anwesenheit_admin:rw'
			)
		);

        // Load models
        $this->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
        $this->load->model('person/Benutzer_model', 'BenutzerModel');
        $this->load->model('person/Person_model', 'PersonModel');
        $this->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
        $this->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');


        // load libraries
        $this->load->library('PermissionLib');
        $this->load->library('AuthLib');
        $this->load->library('WidgetLib');

        // Load helpers
        $this->load->helper('array');
        $this->_setAuthUID(); // sets property uid
	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{

        // Set nearest Studiensemester as default
//        $this->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
//        $result = $this->StudiensemesterModel->getNearest();
//        $studiensemester_kurzbz = hasData($result) ? getData($result)[0]->studiensemester_kurzbz : '';


		$this->load->view('extensions/FHC-Core-Anwesenheiten/home');

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

