<?php

if (!defined('BASEPATH')) exit('No direct script access allowed');

class StatsApi extends FHCAPI_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'fetchStatsData' => array('extension/anwesenheit_admin:rw'),
				'fetchStatsOptions' => array('extension/anwesenheit_admin:rw')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('organisation/Studiengang_model', 'StudiensemesterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');
		$this->_ci->load->model('ressource/mitarbeiter_model', 'MitarbeiterModel');
		$this->_ci->load->model('ressource/stunde_model', 'StundeModel');
		$this->_ci->load->model('education/Lehrveranstaltung_model', 'LehrveranstaltungModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

		$this->loadPhrases(
			array(
				'global',
				'ui'
			)
		);

		$this->_setAuthUID(); // sets property uid
	}

	// STATS API

	public function fetchStatsData()
	{
		$result = $this->getPostJSON();

		$lva = isset($result->lva) ? $result->lva : [];
		$semester = isset($result->semester) ? $result->semester :  [];
		
		$result = $this->_ci->AnwesenheitModel->getAllAnwesenheitenByLvaMultiple($lva, $semester);
		
		$this->terminateWithSuccess($result);
	}

	// returns setup for chart config
	// studiengänge, studiensemester, lehrveranstaltungen, lehreinheiten
	
	// possible: $students, $anwesenheiten, $entschuldigungsstatus, $kontrollen, $lektorLehreinheitData, $leTermine
	public function fetchStatsOptions() {

		$result = $this->getPostJSON();
		
		$date = isset($result->date) ? $result->date : null;
		$lv_id = isset($result->lv_id) ? $result->lv_id : null;
		$sem_kurzbz = isset($result->sem_kurzbz) ? $result->sem_kurzbz : null;
		$le_id = isset($result->le_id) ? $result->le_id : null;
		$ma_uid = isset($result->ma_uid) ? $result->ma_uid : null;

		// Studiensemester
		$this->_ci->StudiensemesterModel->addOrder("start", "DESC");
		$result = $this->_ci->StudiensemesterModel->load();

		$studiensemester = getData($result);
		$result = $this->_ci->StudiensemesterModel->getAkt();
		$aktuell = getData($result);
		$semester = array($studiensemester, $aktuell);
		
		if(is_null($sem_kurzbz)) {
			$sem_kurzbz = [$aktuell[0]->studiensemester_kurzbz];
		}
		
		// Studiengänge
		$stg = getData($this->_ci->AnwesenheitModel->getStudiengaenge());
		
		foreach($stg as $s) {

			$result = getData($this->_ci->StudiengangModel->getLvaForStudiengangInStudiensemester(
				$s->studiengang_kz,
				$s->orgform_kurzbz,
				$sem_kurzbz
			));
			$s->lva = $result;
		}
		
		$this->terminateWithSuccess(
			array(
				'semester' => $semester,
				'stg' => $stg
			));

	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}