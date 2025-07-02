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

		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('ressource/Mitarbeiter_model', 'MitarbeiterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

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
		$this->load->helper('hlp_language');
	}


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
				'guide_link' => $this->_ci->config->item('GUIDE_LINK'),
				'no_qr_lehrform' => $this->_ci->config->item('NO_QR_LEHRFORM'),
				'alert_lehrform' => $this->_ci->config->item('ALERT_LEHRFORM'),
				'lang' => getUserLanguage() // used only for alert_lehrform mehrsprachigkeit until cis4 is shipped
			]
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