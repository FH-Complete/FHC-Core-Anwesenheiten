<?php
if (! defined('BASEPATH')) exit('No direct script access allowed');

class AnwesenheitenLib
{
	private $_ci; // Code igniter instance

	public function __construct()
	{
		$this->_ci =& get_instance();

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('extensions/FHC-Core-Anwesenheiten/EntschuldigungUploadLib');
		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');
		$this->_ci->load->helper('hlp_language');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('person/Benutzer_model', 'BenutzerModel');
		$this->_ci->load->model('crm/Prestudent_model', 'PrestudentModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
	}

	/**
	 * the studiengaenge of $stg_kz_arr with a right of the user: anw_r_ent_assistenz or anw_r_full_assistenz.
	 * A client sends the list, so the list alone must not decide what the user sees
	 */
	public function filterEntitledStudiengaenge($stg_kz_arr)
	{
		if (!is_array($stg_kz_arr)) return array();

		$entitled = array_map('strval', array_merge(
			$this->_ci->permissionlib->getSTG_isEntitledFor('extension/anw_r_ent_assistenz') ?: array(),
			$this->_ci->permissionlib->getSTG_isEntitledFor('extension/anw_r_full_assistenz') ?: array()
		));

		return array_values(array_filter($stg_kz_arr, function ($stg_kz) use ($entitled) {
			return in_array((string) $stg_kz, $entitled, true);
		}));
	}

	/**
	 * true if the person has an active student account in a studiengang with a right of the user,
	 * see filterEntitledStudiengaenge. The scope of the assistenz for the data of a student
	 */
	public function isPersonInEntitledStudiengaenge($person_id)
	{
		// is_numeric first: in PHP 7 "123abc" == 123 is true
		if (!is_numeric($person_id)) return false;

		$result = $this->_ci->EntschuldigungModel->getStudentAccountsForPersons(array($person_id));
		if (isError($result) || !hasData($result)) return false;

		$stg_kz_arr = array_map(function ($account) {
			return $account->studiengang_kz;
		}, getData($result));

		return count($this->filterEntitledStudiengaenge($stg_kz_arr)) > 0;
	}

	/**
	 * isPersonInEntitledStudiengaenge for the person of a uid
	 */
	public function isUidInEntitledStudiengaenge($uid)
	{
		if (isEmptyString((string) $uid)) return false;

		$result = $this->_ci->BenutzerModel->loadWhere(array('uid' => $uid));
		if (isError($result) || !hasData($result)) return false;

		return $this->isPersonInEntitledStudiengaenge(getData($result)[0]->person_id);
	}

	/**
	 * isPersonInEntitledStudiengaenge for the person of a prestudent_id
	 */
	public function isPrestudentInEntitledStudiengaenge($prestudent_id)
	{
		if (!is_numeric($prestudent_id)) return false;

		$result = $this->_ci->PrestudentModel->load($prestudent_id);
		if (isError($result) || !hasData($result)) return false;

		return $this->isPersonInEntitledStudiengaenge(getData($result)[0]->person_id);
	}

	/**
	 * true for a list of numbers that is not empty: the values of an IN clause.
	 * A value of another type in a query gives a database error, and its text must not reach the client
	 */
	public function isIdList($value)
	{
		return is_array($value) && count($value) && count(array_filter($value, 'is_numeric')) === count($value);
	}

	/**
	 * true for a date 'Y-m-d' that exists
	 */
	public function isDate($value)
	{
		return is_string($value) && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts)
			&& checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
	}

	/**
	 * true for anw_r_full_assistenz on an oe of the lva: the admin of the lva in the kontrolle view
	 */
	public function isAdminOfLva($lva_id)
	{
		if (!is_numeric($lva_id)) return false;

		require_once(FHCPATH.'include/lehrveranstaltung.class.php');
		$lva = new lehrveranstaltung();
		$lva->load($lva_id);
		$oes = $lva->getAllOe();
		$oes[] = $lva->oe_kurzbz;

		return $this->_ci->permissionlib->isBerechtigtMultipleOe('extension/anw_r_full_assistenz', $oes);
	}

	/**
	 * the rule of the kontrolle view for the data of an lva and its students: the admin of the lva or a lektor
	 * who teaches a lehreinheit of it. The studiengang of a student does not count here, unlike on the students page
	 */
	public function isAdminOrLektorOfLva($lva_id)
	{
		if (!is_numeric($lva_id)) return false;
		if ($this->isAdminOfLva($lva_id)) return true;
		if (!$this->_ci->permissionlib->isBerechtigt('extension/anw_r_lektor')) return false;

		$result = $this->_ci->AnwesenheitModel->getLektorIsTeachingLva($lva_id, getAuthUID());
		return !isError($result) && hasData($result) && ((int) getData($result)[0]->teaches) > 0;
	}

	/**
	 * true if the prestudent belongs to the logged in person
	 */
	public function isOwnPrestudent($prestudent_id)
	{
		if (!is_numeric($prestudent_id)) return false;

		$result = $this->_ci->PrestudentModel->load($prestudent_id);
		return hasData($result) && getData($result)[0]->person_id == getAuthPersonId();
	}

	/**
	 * the days after the creation of a kontrolle in which a lektor changes its times.
	 * The config file of an installed instance can lack the key: 30 days then
	 */
	public function getKontrolleUpdateMaxReach()
	{
		$reach = $this->_ci->config->item('KONTROLLE_UPDATE_MAX_REACH');

		return $reach === null ? 30 : $reach;
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
			'supplierung' => $this->_ci->permissionlib->isBerechtigt('extension/anw_supplierung'),
			'student' => $this->_ci->permissionlib->isBerechtigt('extension/anw_r_student'),
			'authID' => getAuthUID(),
			'regenerateQRTimer' => $this->_ci->config->item('REGENERATE_QR_TIMER'),
			'useRegenerateQR' => $this->_ci->config->item('USE_REGENERATE_QR'),
			'entschuldigungMaxReach' => $this->_ci->config->item('ENTSCHULDIGUNG_MAX_REACH'),
			'entschuldigungMaxFileSize' => $this->_ci->entschuldigunguploadlib->getMaxFileSize(),
			'entschuldigungFiletypes' => EntschuldigungUploadLib::ALLOWED_FILETYPES,
			'kontrolleDeleteMaxReach' => $this->_ci->config->item('KONTROLLE_DELETE_MAX_REACH'),
			'kontrolleUpdateMaxReach' => $this->getKontrolleUpdateMaxReach(),
			'kontrolleCreateMaxReachPast' => $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH_PAST'),
			'kontrolleCreateMaxReachFuture' => $this->_ci->config->item('KONTROLLE_CREATE_MAX_REACH_FUTURE'),
			'positiveRatingThreshold' => $this->_ci->config->item('POSITIVE_RATING_THRESHOLD'),
			'anwesend_status' => $this->_ci->config->item('ANWESEND_STATUS'),
			'abwesend_status' => $this->_ci->config->item('ABWESEND_STATUS'),
			'entschuldigt_status' => $this->_ci->config->item('ENTSCHULDIGT_STATUS'),
			'fehlminuten_status' => $this->_ci->config->item('FEHLMINUTEN_STATUS'),
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
			'lang' => getUserLanguage(), // used only for alert_lehrform mehrsprachigkeit until cis4 is shipped
			'timeline' => $this->isTimelineAllowed()
		];
	}

	/**
	 * true if the user has one of the berechtigungen of the TIMELINE_BERECHTIGUNGEN config item.
	 * a missing config item allows nobody
	 */
	public function isTimelineAllowed()
	{
		foreach ((array) $this->_ci->config->item('TIMELINE_BERECHTIGUNGEN') as $berechtigung) {
			if ($this->_ci->permissionlib->isBerechtigt($berechtigung)) return true;
		}

		return false;
	}
}
