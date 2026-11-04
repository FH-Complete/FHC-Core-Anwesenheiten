<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');


class AdministrationApi extends FHCAPI_Controller
{
	public function __construct()
	{
		parent::__construct(array(
				// fetch table data
				'getEntschuldigungen' => array('extension/anw_r_ent_assistenz:r', 'extension/anw_r_full_assistenz:r'),
				
				// open entschuldigungen the date range of the table hides + the range of all open ones
				'getOffeneTimespan' => array('extension/anw_r_ent_assistenz:r', 'extension/anw_r_full_assistenz:r'),
				
				// set status on entschuldigung
				'updateEntschuldigung' => array('extension/anw_r_ent_assistenz:rw', 'extension/anw_r_full_assistenz:rw'),
				
				// fetch dates related to students digital anwesenheiten
				'getTimeline' => array('extension/anw_r_ent_assistenz:r', 'extension/anw_r_full_assistenz:r')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_History_model', 'EntschuldigungHistoryModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('extensions/FHC-Core-Anwesenheiten/EntschuldigungUploadLib');
		$this->_ci->load->library('extensions/FHC-Core-Anwesenheiten/AnwesenheitenLib');

		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');

		$this->loadPhrases(
			array(
				'global',
				'ui'
			)
		);

		$this->_setAuthUID(); // sets property uid

		$this->load->helper('hlp_sancho_helper');
	}

	/**
	 * POST METHOD
	 * Expects parameter 'stg_kz_arr', 'von', 'bis'
	 * Optional parameter 'nurOffene': true loads the open Entschuldigungen only
	 */
	public function getEntschuldigungen()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		$result = $this->getPostJSON();
		$stg_kz_arr = $this->_ci->anwesenheitenlib->filterEntitledStudiengaenge($result->stg_kz_arr);
		$von = $result->von;
		$bis = $result->bis;
		$nurOffene = isset($result->nurOffene) && $result->nurOffene === true;

		if(!$stg_kz_arr || count($stg_kz_arr) < 1) $this->terminateWithSuccess($this->p->t('global', 'errorNoSTGassigned'));

		$result = $this->_ci->EntschuldigungModel->getEntschuldigungenForStudiengaenge($stg_kz_arr, $von, $bis, $nurOffene);
		$entschuldigungen = getData($result);
		if($entschuldigungen != null && count($entschuldigungen) > 0) {
			// one query for the accounts of all persons. A person with more than one account can belong to
			// the assistenz of another studiengang, the frontend warns before it changes the status
			$person_ids = array_values(array_unique(array_map(function ($entschuldigung) {
				return $entschuldigung->person_id;
			}, $entschuldigungen)));

			$result = $this->_ci->EntschuldigungModel->getStudentAccountsForPersons($person_ids);
			if (isError($result))
				$this->terminateWithError(getError($result), 'general');

			$accountsByPerson = array();
			foreach ((getData($result) ?: array()) as $account) {
				$accountsByPerson[$account->person_id][] = $account;
			}

			foreach ($entschuldigungen as $entschuldigung) {
				$accounts = isset($accountsByPerson[$entschuldigung->person_id]) ? $accountsByPerson[$entschuldigung->person_id] : array();
				$entschuldigung->student_uid = array_column($accounts, 'uid');
				$entschuldigung->accounts = $accounts;
			}
		}
		
		
		$this->terminateWithSuccess($entschuldigungen);
	}

	/**
	 * POST METHOD
	 * Expects parameter 'stg_kz_arr', 'von', 'bis'
	 * Returns for the open Entschuldigungen of the Studiengaenge: 'anzahl' with an Antragsdatum outside
	 * von - bis, 'von' and 'bis' the Antragsdatum range of all of them (null if there is none).
	 */
	public function getOffeneTimespan()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		$result = $this->getPostJSON();
		$stg_kz_arr = $this->_ci->anwesenheitenlib->filterEntitledStudiengaenge($result->stg_kz_arr);
		$von = $result->von;
		$bis = $result->bis;

		if(!$stg_kz_arr || count($stg_kz_arr) < 1)
			$this->terminateWithSuccess(array('anzahl' => 0, 'von' => null, 'bis' => null));

		$result = $this->_ci->EntschuldigungModel->getOffeneTimespan($stg_kz_arr, $von, $bis);
		if (isError($result))
			$this->terminateWithError(getError($result), 'general');

		$offene = getData($result)[0];
		$offene->anzahl = (int)$offene->anzahl;
		$this->terminateWithSuccess($offene);
	}

	/**
	 * POST METHOD
	 * Expects parameter 'entschuldigung_id', 'status'
	 * Optional parameter 'notiz'
	 * Updates an existing Entschuldigung entry in extension.tbl_anwesenheit_entschuldigung and finds relevant
	 * Anwesenheiten User entries to update to or back from ENTSCHULDIGT_STATUS to ABWESEND_STATUS in respect to
	 * the updated Entschuldigung status.
	 */
	public function updateEntschuldigung()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		$data = json_decode($this->input->raw_input_stream, true);

		// a string: isEmptyString reads the integers 9 to 13 and 32 as whitespace on PHP 7.0 (ctype_space)
		$entschuldigung_id = isset($data['entschuldigung_id']) ? (string) $data['entschuldigung_id'] : '';
		$status = isset($data['status']) ? $data['status'] : null;
		$notiz = isset($data['notiz']) ? $data['notiz'] : '';
		$vonParam = $this->input->post('von');
		$bisParam = $this->input->post('bis');

		// strict: the loose in_array let 'x' through as true. null is the status of an open entschuldigung
		if (isEmptyString($entschuldigung_id) || !in_array($status, array(true, false, null), true))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = $this->_ci->EntschuldigungModel->load($entschuldigung_id);

		if (isError($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		if (!hasData($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = getData($entschuldigung)[0];

		if (!$this->_ci->anwesenheitenlib->isPersonInEntitledStudiengaenge($entschuldigung->person_id))
			$this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');

		// the edit modal of an open entschuldigung sends null. A decision is not taken back
		if ($status === null && $entschuldigung->akzeptiert !== null)
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		// new von/bis from the edit modal: check them before the status update changes any anwesenheit.
		// a status change from the table sends no von/bis
		if (isset($vonParam) || isset($bisParam)) {
			$vonTimestamp = strtotime(isset($vonParam) ? $vonParam : $entschuldigung->von);
			$bisTimestamp = strtotime(isset($bisParam) ? $bisParam : $entschuldigung->bis);
			if ($vonTimestamp === false || $bisTimestamp === false)
				$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

			$zeitraumError = $this->_ci->entschuldigunguploadlib->checkZeitraum($vonTimestamp, $bisTimestamp);
			if ($zeitraumError !== null) $this->terminateWithError($zeitraumError, 'general');
		}

		// check if status is being updated at all
		$statusChanged = $status !== $entschuldigung->akzeptiert;

		// check if von/bis are being sent, else retrieve previous values
		$von = isset($vonParam) ? $vonParam : $entschuldigung->von;
		$bis = isset($bisParam) ? $bisParam : $entschuldigung->bis;

		// the entries, the history and the entschuldigung go together: all or nothing
		$this->_ci->db->trans_begin();

		// the entries follow the change from the old state (range, accepted) to the new one: entries the old state
		// covered and the new one does not go back, entries only the new one covers get entschuldigt. Entries that
		// another accepted entschuldigung covers do not change
		$akzeptiert = $statusChanged ? $status : $entschuldigung->akzeptiert;
		$coveredBefore = $entschuldigung->akzeptiert === true
			? $this->_uncoveredEntries($entschuldigung, $entschuldigung->von, $entschuldigung->bis)
			: array();
		$coveredAfter = $akzeptiert === true ? $this->_uncoveredEntries($entschuldigung, $von, $bis) : array();

		$revertIds = array_values(array_diff($coveredBefore, $coveredAfter));
		$entschuldigtIds = array_values(array_diff($coveredAfter, $coveredBefore));

		if (count($revertIds)) {
			// only entries with the entschuldigt status go back, to their state before the entschuldigung
			// (a qr scan during it counts as anwesend, see ProfilApi::checkInAnwesenheit). An entry with another
			// status stays, a declined entschuldigung never overwrites a positive anwesenheitskontrolle
			$result = $this->_ci->AnwesenheitUserModel->revertEntschuldigt(
				$revertIds,
				$this->_ci->config->item('ENTSCHULDIGT_STATUS'),
				$this->_ci->config->item('FEHLMINUTEN_STATUS'),
				$this->_ci->config->item('ABWESEND_STATUS')
			);
			if (isError($result)) $this->_rollbackAndTerminate($this->p->t('global', 'errorUpdateEntschuldigung'));
		}

		if (count($entschuldigtIds)) {
			$result = $this->_ci->AnwesenheitModel->updateAnwesenheiten($entschuldigtIds, $this->_ci->config->item('ENTSCHULDIGT_STATUS'));
			if (isError($result)) $this->_rollbackAndTerminate($this->p->t('global', 'errorUpdateEntschuldigung'));
		}

		// check notiz size and trim to char varying 255 if it is too big
		$notiz = substr($notiz, 0, 255);
		$version = $entschuldigung->version + 1;

		// add old version to history table
		$this->_ci->EntschuldigungHistoryModel->insertVersion($entschuldigung, $entschuldigung->dms_id);

		// only apply statusset cols when akzeptiert flag is different
		if($statusChanged) {
			$updateEntries = array(
				'updatevon' => $this->_uid,
				'updateamum' => date('Y-m-d H:i:s'),
				'statussetvon' => $this->_uid,
				'statussetamum' => date('Y-m-d H:i:s'),
				'akzeptiert' => $status,
				'notiz' => $notiz,
				'version' => $version,
				'von' => $von,
				'bis' => $bis
			);
		} else {
			$updateEntries = array(
				'updatevon' => $this->_uid,
				'updateamum' => date('Y-m-d H:i:s'),
				'notiz' => $notiz,
				'version' => $version,
				'von' => $von,
				'bis' => $bis
			);
		}
		
		$update = $this->_ci->EntschuldigungModel->update(
			$entschuldigung->entschuldigung_id,
			$updateEntries
		);

		if (isError($update) || $this->_ci->db->trans_status() === false)
			$this->_rollbackAndTerminate($this->p->t('global', 'errorUpdateEntschuldigung'));

		$this->_ci->db->trans_commit();

		if($statusChanged) { // send mail to student

			$result = $this->_ci->EntschuldigungModel->getMailInfoForStudent($entschuldigung->person_id);
			$data = getData($result)[0];
			
			// Link to Entschuldigungsmanagement
			if(defined('CIS4') && CIS4) {
				$ci3BootstrapFilePath = "cis.php";
			} else {
				$ci3BootstrapFilePath = "index.ci.php";
			}
			$url = APP_ROOT.$ci3BootstrapFilePath.'/extensions/FHC-Core-Anwesenheiten/Profil/Entschuldigung';
			$student_uid = $data->uid;

			$vonDate = new DateTime($von);
			$vonFormatted = $vonDate->format('d.m.Y H:i');
			$bisDate = new DateTime($bis);
			$bisFormatted = $bisDate->format('d.m.Y H:i');
			
			// Prepare mail content
			$body_fields = array(
				'von' => $vonFormatted,
				'bis' => $bisFormatted,
				'akzeptiert' => $status == true ? 'akzeptiert' : 'abgelehnt',
				'linkEntschuldigungen' => $url
			);

			$email = $student_uid . "@" . DOMAIN;
			
			if (!isEmptyString($notiz)) { // send template with anmerkung/begründung
				$body_fields['notiz'] = $notiz;
				
				sendSanchoMail(
					'AnwEntUpdateNotiz',
					$body_fields,
					$email,
					$this->p->t('global', 'entschuldigungStatusUpdateAutoEmailBetreff')
				);
			} else {
				sendSanchoMail(
					'AnwEntUpdate',
					$body_fields,
					$email,
					$this->p->t('global', 'entschuldigungStatusUpdateAutoEmailBetreff')
				);
			}
		}

		$this->terminateWithSuccess($this->p->t('global', 'successUpdateEntschuldigung'));
	}

	/**
	 * POST METHOD
	 * Expects parameter 'person_id'
	 * Loads every anw_user_entry linked to person_ids prestudents and every entschuldigung to visualize a timeline.
	 */
	public function getTimeline() {
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		$result = $this->getPostJSON();
		$person_id = isset($result->person_id) ? $result->person_id : null;

		// only students of the studiengaenge of the assistenz
		if (!$this->_ci->anwesenheitenlib->isPersonInEntitledStudiengaenge($person_id))
			$this->terminateWithError($this->p->t('global', 'noAuthorization'), 'general');

		// fetch all anw_user entries for persons prestudent_ids
		$anw = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByPersonId($person_id);

		// fetch all entschuldigungen
		$ent = $this->_ci->EntschuldigungModel->getEntschuldigungenByPerson($person_id);

		$this->terminateWithSuccess(array($anw, $ent));
	}

	/**
	 * the ids of the entries of kontrollen in von - bis that no other accepted entschuldigung of the person covers.
	 * Runs inside the transaction of updateEntschuldigung
	 */
	private function _uncoveredEntries($entschuldigung, $von, $bis)
	{
		$result = $this->_ci->EntschuldigungModel->getAllUncoveredAnwesenheitenInTimespan(
			$entschuldigung->entschuldigung_id, $entschuldigung->person_id, $von, $bis
		);
		if (isError($result)) $this->_rollbackAndTerminate($this->p->t('global', 'errorUpdateEntschuldigung'));

		return array_map(function ($row) {
			return $row->anwesenheit_user_id;
		}, getData($result) ?: array());
	}

	/**
	 * rolls back the open transaction and terminates with $message
	 */
	private function _rollbackAndTerminate($message)
	{
		$this->_ci->db->trans_rollback();
		$this->terminateWithError($message, 'general');
	}

	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}