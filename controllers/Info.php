<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Info extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'getStudiensemester' => 'admin:rw',
				'getAktStudiensemester' => 'admin:rw',
				'getLehreinheitAndLektorData' => 'admin:rw'
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');


		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_setAuthUID(); // sets property uid
	}
	
	
	public function getStudiensemester()
	{
		$this->_ci->StudiensemesterModel->addOrder("start", "DESC");
		$studiensemester = $this->_ci->StudiensemesterModel->load();
		$this->outputJsonSuccess(getData($studiensemester));
	}
	
	public function getAktStudiensemester()
	{
		$this->outputJsonSuccess(getData($this->_ci->StudiensemesterModel->getAkt()));
	}

	public function getLehreinheitAndLektorData()
	{
		// TODO: remove date parameter after testing
		$le_id = $this->input->get('le_id');
		$ma_uid = $this->input->get('ma_uid');
		$currentDate = $this->input->get('date');
//		$currentDate = date('Y-m-d');

		$lektorLehreinheitData = $this->AnwesenheitenModel->getLehreinheitAndLektorData($le_id, $ma_uid, $currentDate);

		$this->outputJsonSuccess(getData($lektorLehreinheitData));
	}
	
	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();
		
		if (!$this->_uid)
			show_error('User authentification failed');
	}

}

