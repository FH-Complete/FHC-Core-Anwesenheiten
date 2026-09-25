<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Profil extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
				'index' => array('extension/anw_r_full_assistenz:rw', 'extension/anw_r_ent_assistenz:rw', 'extension/anw_r_student:rw'),
				'getEntschuldigungFile' => array('extension/anw_r_full_assistenz:rw', 'extension/anw_r_ent_assistenz:rw', 'extension/anw_r_student:rw')
			)
		);

		$this->_ci =& get_instance();

		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('ressource/Mitarbeiter_model', 'MitarbeiterModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('extensions/FHC-Core-Anwesenheiten/AnwesenheitenLib');
		$this->_ci->load->library('DmsLib');
		$this->_ci->load->library('extensions/FHC-Core-Anwesenheiten/EntschuldigungUploadLib');

		$this->loadPhrases(
			array(
				'global',
				'ui',
				'filter'
			)
		);

		$this->setControllerId(); // sets the controller id
		$this->_setAuthUID(); // sets property uid
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
	}


	public function index()
	{
		$viewData = array(
			'permissions' => $this->_ci->anwesenheitenlib->getViewPermissions()
		);

		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Anwesenheiten', $viewData);
	}

	/**
	 * GET METHOD
	 * expects parameter 'entschuldigung' (dms_id)
	 *
	 * Is being used in Auth_Controller and not FHC_API Controller since return value is file object
	 *
	 * checks for zuordnung just like api/ProfilApi/deleteEntschuldigung
	 */
	public function getEntschuldigungFile()
	{
		$dms_id = $this->_ci->input->get('entschuldigung');

		if (isEmptyString($dms_id))
			$this->terminateWithError($this->_ci->p->t('global', 'wrongParameters'));

		$person_id = getAuthPersonId();
		$isAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz');
		$isEntAdmin = $this->permissionlib->isBerechtigt('extension/anw_r_ent_assistenz');

		if ($this->_ci->MitarbeiterModel->isMitarbeiter($this->_uid) && ($isAdmin || $isEntAdmin))
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id);
		else
			$zuordnung = $this->_ci->EntschuldigungModel->checkZuordnungByDms($dms_id, $person_id);

		if (hasData($zuordnung)) {
			$file = $this->_ci->dmslib->download($dms_id, null, 'attachment');
			// remove server filepath from name
			preg_match("~[^/]+$~", $file->retval->name, $matches);
			$file->retval->name = $matches[0];
			$this->outputFile(getData($file));
		}

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