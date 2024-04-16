<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Info extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'studentDownload' => array('admin:rw', 'extension/anwesenheit_assistenz:rw', 'extension/anwesenheit_student:rw')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');
		$this->_ci->load->model('ressource/mitarbeiter_model', 'MitarbeiterModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

		$this->_setAuthUID(); // sets property uid
	}

	public function studentDownload()
	{
		$dms_id = $this->_ci->input->get('entschuldigung');

		if (isEmptyString($dms_id))
			$this->terminateWithError($this->_ci->p->t('ui', 'errorFelderFehlen'));

		$person_id = getAuthPersonId();

		//TODO (david) noch prüfen ob der Mitarbeiter Zugriff haben sollte
		if ($this->_ci->MitarbeiterModel->isMitarbeiter($this->_uid))
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id);
		else
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id, $person_id);

		if (hasData($zuordnung))
		{
			$file = $this->_ci->dmslib->download($dms_id, null, 'attachment');
			// remove server filepath from name
			preg_match("~[^/]+$~", $file->retval->name, $matches);
			$file->retval->name = $matches[0];
			$this->outputFile(getData($file));
		}

	}


	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();
		
		if (!$this->_uid)
			show_error('User authentification failed');
	}

}

