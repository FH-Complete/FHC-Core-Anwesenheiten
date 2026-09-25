<?php
if (! defined('BASEPATH')) exit('No direct script access allowed');

class AnwesenheitenLib
{
	private $_ci; // Code igniter instance

	public function __construct()
	{
		$this->_ci =& get_instance();

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
		$this->_ci->load->helper('hlp_language');
	}

	/**
	 * returns the permissions and config items every view controller hands to the frontend
	 * in the 'permissions' attribute of the Anwesenheiten view
	 */
	public function getViewPermissions()
	{
		return [
			'admin' => $this->_ci->permissionlib->isBerechtigt('extension/anw_r_full_assistenz'),
			'assistenz' => $this->_ci->permissionlib->isBerechtigt('extension/anw_r_ent_assistenz'),
			'lektor' => $this->_ci->permissionlib->isBerechtigt('extension/anw_r_lektor'),
			'student' => $this->_ci->permissionlib->isBerechtigt('extension/anw_r_student'),
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
			'studiengaengeAssistenz' => $this->_ci->permissionlib->getSTG_isEntitledFor('extension/anw_r_ent_assistenz'),
			'studiengaengeAdmin' => $this->_ci->permissionlib->getSTG_isEntitledFor('extension/anw_r_full_assistenz'),
			'controller' => get_class($this->_ci),
			'show_guide' => $this->_ci->config->item('SHOW_GUIDE'),
			'guide_link' => $this->_ci->config->item('GUIDE_LINK'),
			'no_qr_lehrform' => $this->_ci->config->item('NO_QR_LEHRFORM'),
			'alert_lehrform' => $this->_ci->config->item('ALERT_LEHRFORM'),
			'show_outgoing_semester_overlap' => $this->_ci->config->item('SHOW_OUTGOING_SEMESTER_OVERLAP'),
			'show_outgoing_semester_overlap_min_days' => $this->_ci->config->item('SHOW_OUTGOING_SEMESTER_OVERLAP_MIN_DAYS'),
			'legacy_le_selection' => $this->_ci->config->item('LEGACY_LE_SELECTION'),
			'lang' => getUserLanguage() // used only for alert_lehrform mehrsprachigkeit until cis4 is shipped
		];
	}
}
