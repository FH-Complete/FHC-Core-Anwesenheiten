<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');


class AdministrationApi extends FHCAPI_Controller
{
	public function __construct()
	{
		parent::__construct(array(
				// fetch table data
				'getEntschuldigungen' => array('extension/anw_r_ent_assistenz:r', 'extension/anw_r_full_assistenz:r'),
				
				// set status on entschuldigung
				'updateEntschuldigung' => array('extension/anw_r_ent_assistenz:rw', 'extension/anw_r_full_assistenz:rw'),
				
				// fetch dates related to students digital anwesenheiten
				'getTimeline' => array('extension/anw_r_ent_assistenz:r', 'extension/anw_r_full_assistenz:r')
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_History_model', 'AnwesenheitUserHistoryModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_History_model', 'EntschuldigungHistoryModel');
		$this->_ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');
		$this->_ci->load->model('ressource/Mitarbeiter_model', 'MitarbeiterModel');
		$this->_ci->load->model('education/Lehreinheit_model', 'LehreinheitModel');

		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('PhrasesLib');
		$this->_ci->load->library('DmsLib');

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
	 * Expects parameter 'stg_kz_arr'
	 */
	public function getEntschuldigungen()
	{
		if(!$this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED')) {
			$this->terminateWithSuccess(
				array('ENTSCHULDIGUNGEN_ENABLED' => $this->_ci->config->item('ENTSCHULDIGUNGEN_ENABLED'))
			);
		}

		$result = $this->getPostJSON();
		$stg_kz_arr = $result->stg_kz_arr;
		$von = $result->von;
		$bis = $result->bis;

		if(!$stg_kz_arr || count($stg_kz_arr) < 1) $this->terminateWithSuccess($this->p->t('global', 'errorNoSTGassigned'));

		$this->terminateWithSuccess( $this->_ci->EntschuldigungModel->getEntschuldigungenForStudiengaenge($stg_kz_arr, $von, $bis));
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

		$entschuldigung_id = $data['entschuldigung_id'];
		$status = $data['status'];
		$notiz = $data['notiz'];
		$vonParam = $this->input->post('von');
		$bisParam = $this->input->post('bis');
		
		if (isEmptyString($entschuldigung_id) || !in_array($status, [true, false]))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = $this->_ci->EntschuldigungModel->load($entschuldigung_id);

		if (isError($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');
		if (!hasData($entschuldigung))
			$this->terminateWithError($this->p->t('global', 'wrongParameters'), 'general');

		$entschuldigung = getData($entschuldigung)[0];

		// check if status is being updated at all
		$statusChanged = $status !== $entschuldigung->akzeptiert;
//		$this->addMeta('$statusChanged', $statusChanged);
//		$this->addMeta('$status', $status);
//		$this->addMeta('$entschuldigung->akzeptiert', $entschuldigung->akzeptiert);
		
		if($statusChanged) {
			$updateStatus = $status ? $this->_ci->config->item('ENTSCHULDIGT_STATUS') : $this->_ci->config->item('ABWESEND_STATUS');

			$result = $this->_ci->EntschuldigungModel->getAllUncoveredAnwesenheitenInTimespan($entschuldigung_id, $entschuldigung->person_id, $entschuldigung->von, $entschuldigung->bis);
			if (isError($result))
				$this->terminateWithError($result);
			$anwesenheit_user_idsArr = getData($result);
//			$this->addMeta('$anwesenheit_user_idsArr', $anwesenheit_user_idsArr);
			
			if($anwesenheit_user_idsArr) {
				$funcAUID = function ($value) {
					return $value->anwesenheit_user_id;
				};

				$anwesenheit_user_ids = array_map($funcAUID, $anwesenheit_user_idsArr);
//				$this->addMeta('$anwesenheit_user_ids_pre_filter', $anwesenheit_user_ids);
				
				// if anw is from exam kontrolle and entschuldigung was uploaded past that date it does not count, even though
				// the kontroll entry was in the time range
				$result = $this->_ci->EntschuldigungModel->checkForExam($anwesenheit_user_ids, $entschuldigung->insertamum);
//				$this->addMeta('examCheck', $result);
				
				if(count($result->retval) > 0) { // filter exam ids
					$exam_ids = array_map($funcAUID, $result->retval);
					
					$anwesenheit_user_ids = array_filter($anwesenheit_user_ids, function($anwId) use ($exam_ids) {
						return !in_array($anwId, $exam_ids);
					});

//					$this->addMeta('$anwesenheit_user_ids_post_filter', $anwesenheit_user_ids);
				}
				
				if(count($anwesenheit_user_ids) > 0) {
					$updateAnwesenheit = $this->_ci->AnwesenheitModel->updateAnwesenheiten($anwesenheit_user_ids, $updateStatus);

					if (isError($updateAnwesenheit))
						$this->terminateWithError($updateAnwesenheit);
					
				}
			}
		}
		
		// check notiz size and trim to char varying 255 if it is too big
		$notiz = substr($notiz, 0, 255);
		$version = $entschuldigung->version + 1;
		
		// check if von/bis are being sent, else retrieve previous values
		$von = isset($vonParam) ? $vonParam : $entschuldigung->von;
		$bis = isset($bisParam) ? $bisParam : $entschuldigung->bis;
		
		// add old version to history table
		$this->_ci->EntschuldigungHistoryModel->insert(
			array(
				'entschuldigung_id' => $entschuldigung->entschuldigung_id,
				'person_id' => $entschuldigung->person_id,
				'von' => $entschuldigung->von,
				'bis' => $entschuldigung->bis,
				'dms_id' => $entschuldigung->dms_id,
				'insertvon' => $entschuldigung->insertvon,
				'insertamum' => $entschuldigung->insertamum,
				'updatevon' => $entschuldigung->updatevon,
				'updateamum' => $entschuldigung->updateamum,
				'statussetvon' => $entschuldigung->statussetvon,
				'statussetamum' => $entschuldigung->statussetamum,
				'akzeptiert' => $entschuldigung->akzeptiert,
				'notiz' => $entschuldigung->notiz,
				'version' => $entschuldigung->version
			)
		);
		
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

		if (isError($update))
			$this->terminateWithError($this->p->t('global', 'errorUpdateEntschuldigung'), 'general');

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
			$student_uid = $data->student_uid;

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
//			$this->addMeta('emailfields', $body_fields);
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
		$person_id = $result->person_id;

		// fetch all anw_user entries for persons prestudent_ids
		$anw = $this->_ci->AnwesenheitUserModel->getAllAnwesenheitenByPersonId($person_id);
		
		// fetch all entschuldigungen
		$ent = $this->_ci->EntschuldigungModel->getEntschuldigungenByPerson($person_id);
		
		$this->terminateWithSuccess(array($anw, $ent));
	}
	
	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();

		if (!$this->_uid)
			show_error('User authentification failed');
	}

}