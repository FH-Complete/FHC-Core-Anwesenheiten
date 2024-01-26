<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Overview extends Auth_Controller
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
				'save' => 'admin:rw',
				'edit' => 'admin:rw',
				'delete' => 'admin:rw'
			)
		);

		$this->_ci =& get_instance();

		// Load models
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');
		$this->_ci->load->model('education/Lehreinheit_model','LehreinheitModel');
		$this->_ci->load->model('education/Lehrveranstaltung_model','LehrveranstaltungModel');
		$this->_ci->load->model('crm/Prestudent_model','PrestudentModel');
		$this->_ci->load->model('crm/Student_model','StudentModel');

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
		$this->setControllerId(); // sets the controller id
		$this->_setAuthUID(); // sets property uid
	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{
//		$von = '2023-09-01';
//		$bis = '2023-10-30';

		$von = '2023-09-01';
		$bis = '2024-02-01';
		$sem = 3;
		$verband = 'A';
		$gruppe = '';
		$orgeinheit = 'VZ';
		$lva_id = 38733; // Microcontroller Software Design Sem 3 Studiengang BEL
		$le_id = 138879;
		$studiengang_kz = 254;
		$studiensemester_kurzbz = 'WS2023';


		// TODO: how to get Distinct on date column only?
		// get LE dates and ceiling
		$this->LehreinheitModel->addSelect(["lehre.tbl_stundenplan.stunde",
			"lehre.tbl_stundenplan.datum",
			"tbl_lehreinheit.lehreinheit_id",
			"lehre.tbl_lehrveranstaltung.lehrveranstaltung_id",
			"orgform_kurzbz", "stundenplan_id", "verband", "gruppe", "ort_kurzbz"]);
		$this->LehreinheitModel->addDistinct();
		$this->LehreinheitModel->addJoin("lehre.tbl_lehrveranstaltung", "lehrveranstaltung_id");
		$this->LehreinheitModel->addJoin("lehre.tbl_stundenplan",
			"(tbl_lehreinheit.lehreinheit_id = tbl_stundenplan.lehreinheit_id 
			AND tbl_lehrveranstaltung.studiengang_kz = tbl_stundenplan.studiengang_kz 
			AND tbl_stundenplan.semester = tbl_lehrveranstaltung.semester)");
		$this->LehreinheitModel->addOrder("lehre.tbl_stundenplan.datum", "ASC");
		$dates = $this->LehreinheitModel->loadWhere("lehrveranstaltung_id = {$lva_id} 
		AND lehre.tbl_lehreinheit.lehreinheit_id = {$le_id} 
		AND tbl_lehreinheit.studiensemester_kurzbz = '{$studiensemester_kurzbz}'
		AND datum BETWEEN '{$von}' AND '{$bis}'
		");
//		AND datum BETWEEN '{$von}' AND '{$bis}' // actually always fetch every entry to receive max count
		if(!hasData($dates)) {
//			echo json_encode($dates);
			return;
		}

		$datesData = getData($dates);
//		echo json_encode($datesData);

		$this->LehrveranstaltungModel->resetQuery();
		// get all Students of LVA

		$this->StudentModel->addSelect(["prestudent_id", "vorname", "nachname", "semester", "verband", "gruppe",
			"DATE(datum)", "extension.tbl_anwesenheit_status.bezeichnung as status"]);
		$this->StudentModel->addJoin("public.tbl_benutzer", "student_uid = uid");
		$this->StudentModel->addJoin("public.tbl_person", "person_id");
		$this->StudentModel->addJoin("extension.tbl_anwesenheit", "prestudent_id");
		$this->StudentModel->addJoin("extension.tbl_anwesenheit_status", "status = status_kurzbz");
		$this->StudentModel->addOrder("vorname, nachname", "DESC");
		$students = $this->StudentModel->loadWhere("tbl_benutzer.aktiv = true 
		AND studiengang_kz = {$studiengang_kz} 
		AND semester = {$sem}
		AND verband = '{$verband}'
		AND datum BETWEEN '{$von}' AND '{$bis}'
		");

		if(!hasData($students)) {
			echo json_encode($students);
			return;
		}
		$studentsData = getData($students);


		$viewData = array(
			'students' => $studentsData,
			'dates' => $datesData,
			'parameters' => array (
				'semester' => $sem,
				'verband' => $verband,
				'gruppe' => $gruppe,
				'orgeinheit' => $orgeinheit,
				'lehrveranstaltung_id' => $lva_id,
				'lehreinheit_id' => $le_id,
				'studiengang_kz' => $studiengang_kz,
				'studiensemester_kurzbz' => $studiensemester_kurzbz
			)
		);
		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Overview', $viewData);
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

