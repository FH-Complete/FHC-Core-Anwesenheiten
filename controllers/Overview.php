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
//		$this->LehrveranstaltungModel->addSelect(["lehrveranstaltung_id as ID"]);
//		$res = $this->LehrveranstaltungModel->addSelect('WS2023', 1149, true);

		$lva_id = 38733; // Microcontroller Software Design Sem 3 Studiengang BEL
		$studiensemester_kurzbz = 'WS2023';
		// get LE ceiling
		$this->LehreinheitModel->addSelect(["Count(lehreinheit_id) AS Anzahl"]);
		$this->LehreinheitModel->addJoin("lehre.tbl_lehrveranstaltung");
		$res = $this->LehreinheitModel->loadWhere("lehrveranstaltung_id = {$lva_id}");

		if(!hasData($res)) {
			echo json_encode($res);
			return;
		}
		$data = getData($res);
		echo json_encode($data);

		// get all Students of LVA
//		$res = $this->LehrveranstaltungModel->execReadOnlyQuery(`
//		SELECT uid, vorname, nachname, prestudent_id
//		FROM campus.vw_student_lehrveranstaltung
//		JOIN campus.vw_student USING(uid)
//		WHERE vw_student_lehrveranstaltung.lehrveranstaltung_id = {$lva_id}
//		`);


		$this->LehrveranstaltungModel->resetQuery();

		$this->LehrveranstaltungModel->addSelect(["prestudent_id", "vorname", "nachname"]);
		$this->LehrveranstaltungModel->addDistinct();
//		$this->LehrveranstaltungModel->addSelect("Count(*)");

		$this->LehrveranstaltungModel->addJoin("public.tbl_studiengang", "studiengang_kz");
		$this->LehrveranstaltungModel->addJoin("public.tbl_prestudent", "studiengang_kz");
		$this->LehrveranstaltungModel->addJoin("public.tbl_person", "person_id");
		$this->LehrveranstaltungModel->addJoin("lehre.tbl_lehreinheit", "lehrveranstaltung_id");
		// count: 50140
		$res = $this->LehrveranstaltungModel->loadWhere("lehrveranstaltung_id = {$lva_id}");

		// count: 10028 -> Distinct 5014
//		$res = $this->LehrveranstaltungModel->loadWhere("lehrveranstaltung_id = {$lva_id} AND lehre.tbl_lehreinheit.studiensemester_kurzbz = '{$studiensemester_kurzbz}'");


		if(!hasData($res)) {
			echo json_encode($res);
			return;
		}
		$data = getData($res);
		echo json_encode($data);



//		$res = $this->LehreinheitModel->load('13887');
//		if(!hasData($res)) return;
//		$data = getData($res);
//		echo json_encode($data);
//
//		$res = $this->LehreinheitModel->getStudenten('13887');
//		if(!hasData($res)) return;
//		$data = getData($res);
//		echo json_encode($data);
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

