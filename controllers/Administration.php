<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Administration extends Auth_Controller
{

	private $_ci;
	private $_uid;

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
				'index' => array('extension/anw_r_full_assistenz:rw', 'extension/anw_r_ent_assistenz:rw')
			)
		);

		$this->_ci =& get_instance();

		// load libraries
		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('WidgetLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('AuthLib');
		$this->_ci->load->library('DmsLib');

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
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
		$this->load->helper('hlp_language');
	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			show_error('ENTSCHULDIGUNGEN ARE DISABLED');
		}

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
				'kontrolleCreateMaxReachPast' => $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH_PAST'),
				'kontrolleCreateMaxReachFuture' => $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH_FUTURE'),
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
				'guide_link' => $this->_ci->config->item('GUIDE_LINK'),
				'no_qr_lehrform' => $this->_ci->config->item('NO_QR_LEHRFORM'),
				'alert_lehrform' => $this->_ci->config->item('ALERT_LEHRFORM'),
				'lang' => getUserLanguage(), // used only for alert_lehrform mehrsprachigkeit until cis4 is shipped
				'tabPaths' =>  array(
					'Lektor' => absoluteJsImportUrl('public/js/components/Lektor/LektorComponent.js'),
					'Student' => absoluteJsImportUrl('public/js/components/Student/StudentComponent.js'),
					'StudentAnw' => absoluteJsImportUrl('public/js/components/Student/StudentAnwesenheitComponent.js'),
					'StudentEnt' => absoluteJsImportUrl('public/js/components/Student/StudentEntschuldigungComponent.js'),
					'StudentTimeline' => absoluteJsImportUrl('public/js/components/Student/AnwTimelineWrapper.js'),
					'Assistenz' => absoluteJsImportUrl('public/js/components/Assistenz/AssistenzComponent.js')
				)
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