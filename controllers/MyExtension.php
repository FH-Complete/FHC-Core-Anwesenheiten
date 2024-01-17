<?php
if (! defined('BASEPATH')) exit('No direct script access allowed');

class MyExtension extends Auth_Controller
{
	
	private $_ci;
	private $_uid;
	
	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
                'index'     => 'admin:rw',
                'save'      => 'admin:rw',
                'edit'      => 'admin:rw',
                'delete'    => 'admin:rw'
			)
		);
		
		$this->_ci =& get_instance();

        // load libraries
        $this->_ci->load->library('PermissionLib');
        $this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		
		$this->loadPhrases(
			array(
				'ui'
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

        // Set nearest Studiensemester as default
//        $this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
//        $result = $this->StudiensemesterModel->getNearest();
//        $studiensemester_kurzbz = hasData($result) ? getData($result)[0]->studiensemester_kurzbz : '';
		
		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/home');

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

