<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Kontrolle extends Auth_Controller
{
	private $_ci;
	private $_uid;

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
				'index' => array('extension/anw_lekt_load:r')
			)
		);

		$this->_ci =& get_instance();

		// load libraries
		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('AuthLib');

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
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');

	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{
		$viewData = array(
			'permissions' => [
				'admin' => $this->permissionlib->isBerechtigt('extension/anw_r_full_assistenz'),
				'assistenz' => $this->permissionlib->isBerechtigt('extension/anw_r_ent_assistenz'),
				'lektor' => $this->permissionlib->isBerechtigt('extension/anw_r_lektor'),
				'student' => $this->permissionlib->isBerechtigt('extension/anw_r_student'),
				'authID' => getAuthUID(),
				'regenerateQRTimer' => $this->_ci->config->item('REGENERATE_QR_TIMER'),
				'useRegenerateQR' => $this->_ci->config->item('USE_REGENERATE_QR'),
				'entschuldigungMaxReach' => $this->_ci->config->item('ENTSCHULDIGUNG_MAX_REACH'),
				'kontrolleDeleteMaxReach' => $this->_ci->config->item('KONTROLLE_DELETE_MAX_REACH'),
				'kontrolleCreateMaxReach' => $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH'),
				'positiveRatingThreshold' => $this->_ci->config->item('POSITIVE_RATING_THRESHOLD'),
				'anwesend_status' => $this->_ci->config->item('ANWESEND_STATUS'),
				'abwesend_status' => $this->_ci->config->item('ABWESEND_STATUS'),
				'entschuldigt_status' => $this->_ci->config->item('ENTSCHULDIGT_STATUS'),
				'einheitDauer' => $this->_ci->config->item('EINHEIT_DAUER'),
				'entschuldigungen_enabled' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'),
				'studiengaengeAssistenz' => $this->permissionlib->getSTG_isEntitledFor('extension/anw_r_ent_assistenz'),
				'studiengaengeAdmin' => $this->permissionlib->getSTG_isEntitledFor('extension/anw_r_full_assistenz'),
				'controller' => get_class($this),
				'show_guide' => $this->_ci->config->item('SHOW_GUIDE'),
				'guide_link' => $this->_ci->config->item('GUIDE_LINK')
			]
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