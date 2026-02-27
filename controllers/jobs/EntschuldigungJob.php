<?php

if (!defined('BASEPATH')) exit('No direct script access allowed');

class EntschuldigungJob extends JOB_Controller
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();

		$this->_ci =& get_instance();

		$this->_ci->load->helper('hlp_sancho_helper');
		
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_History_model', 'EntschuldigungHistoryModel');
		$this->_ci->load->model('organisation/Organisationseinheit_model', 'OrganisationseinheitModel');
		$this->_ci->load->model('person/Person_model', 'PersonModel');
		$this->_ci->load->model('crm/Student_model', 'StudentModel');


		$this->_ci->load->config('extensions/FHC-Core-Anwesenheiten/qrsettings');

		$this->loadPhrases([
			'anwesenheiten',
			'global'
		]);
	}

	
	public function notifyAssistenzAboutMissingEntschuldigungDokumente()
	{
		$this->logInfo('Start job FHC-Core-Anwesenheiten->EntschuldigungJob->notifyAssistenzAboutMissingEntschuldigungDokumente');

		$interval = $this->_ci->config->item('ENTSCHULDIGUNG_EMAIL_INTERVAL');
		$dateThreshold = $this->calcMinDate($interval);
		
		$result = $this->_ci->EntschuldigungModel->findOlderThanDateIntervalMissingUploads($dateThreshold);
		$entschuldigungen = getData($result);
		
		if(count($entschuldigungen) == 0) {
			$this->_ci->logInfo("Keine Emails an Assistenzen über alte Entschuldigungen versandt");
			return;
		}
		
		// organize which assistenz should receive info about which entschuldigungen
		$assistenzMap = [];
		forEach($entschuldigungen as $ent) {
			
			$resultPerson = $this->_ci->PersonModel->load($ent->person_id); 
			$personData = $resultPerson->retval[0];
			
			$resultStudentUIDS = $this->_ci->PersonModel->loadAllStudentUIDSForPersonID($ent->person_id);
			

			// its possible that old entschuldigungen are found where no student exists
			if(count($resultStudentUIDS->retval) == 0) {
				$this->_ci->logInfo("Keine Studenten Info für Person ID: ".$ent->person_id." gefunden, es wird keine Info an Assistenzen über alte Entschuldigungen versandt!");
				continue;
			}
			
			forEach($resultStudentUIDS->retval[0]->stg_oes as $stg_oe) {
				$assistenzResult = $this->_ci->OrganisationseinheitModel->getAssistenzForOE($stg_oe);
				forEach($assistenzResult->retval as $assistenzRow) {
					if (!isset($assistenzMap[$assistenzRow->person_id])) {
						$assistenzMap[$assistenzRow->person_id] = [];
					}

					// Add the current $assistenzRow to the $assistenzMap as an array associated with its entschuldigung_id.
					$assistenzMap[$assistenzRow->person_id][] = [$ent, $assistenzRow, $personData];
				}
				
			}
		}
		
		// send the mails
		$emailcount = 0;
		foreach($assistenzMap as $assistenz_person_id => $tripelArr) {
			// Start Table
			$entschuldigungenString = '<div style="font-family: Arial, sans-serif; color: #333;">';
			$entschuldigungenString .= '
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
					<thead>
						<tr style="background-color: #eee; text-align: left;">
							<th style="padding: 10px; border: 1px solid #ddd; font-size: 13px;">StudentIn</th>
							<th style="padding: 10px; border: 1px solid #ddd; font-size: 13px; width: 20%;">Von</th>
							<th style="padding: 10px; border: 1px solid #ddd; font-size: 13px;">Bis</th>
							<th style="padding: 10px; border: 1px solid #ddd; font-size: 13px;">Antragsdatum</th>
						</tr>
					</thead>
					<tbody>';

			foreach($tripelArr as $tripel) {
				$entschuldigung = $tripel[0];
				$assistenzRow = $tripel[1];
				$person = $tripel[2];
				
				$nameParts = [];
				if (!empty($person->titelpre)) $nameParts[] = $person->titelpre;
				$nameParts[] = $person->vorname;
				$nameParts[] = $person->nachname;
				if (!empty($person->titelpost)) $nameParts[] = $person->titelpost;
				$studentFullName = implode(' ', $nameParts);
				
				

				$vonDateFormatted = (new DateTime($entschuldigung->von))->format('d.m.Y H:i');
				$bisDateFormatted = (new DateTime($entschuldigung->bis))->format('d.m.Y H:i');
				$antragsDateFormatted = (new DateTime($entschuldigung->insertamum))->format('d.m.Y H:i:s');

				$entschuldigungenString .= "
					<tr>
						<td style='padding: 10px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;'>{$studentFullName}</td>
						<td style='padding: 10px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;'>{$vonDateFormatted}</td>
						<td style='padding: 10px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;'>{$bisDateFormatted}</td>
						<td style='padding: 10px; border: 1px solid #ddd; font-size: 13px;'>{$antragsDateFormatted}</td>
					</tr>";
				
			}

			$entschuldigungenString .= '</tbody></table></div>';
			
//			var_dump($entschuldigungenString);
			
			$assistenzRow = $tripelArr[0][1];
			$anrede = $assistenzRow->anrede;
			$anredeFillString = $assistenzRow->anrede == "Herr" ? "r" : "";
			$fullFormattedNameString = $assistenzRow->first;

			$path = $this->_ci->config->item('URL_ASSISTENZ_ENTMANAGEMENT');
			$url = CIS_ROOT.$path;
			
			
			$body_fields = array(
				'anrede' => $anrede,
				'anredeFillString' => $anredeFillString,
				'fullFormattedNameString' => $fullFormattedNameString,
				'dayCount' => $interval,
				'entschuldigungenString' => $entschuldigungenString,
				'link' => $url
			);

			$email = $assistenzRow->uid."@".DOMAIN;

			// send email with bundled info
			sendSanchoMail(
				'AnwEntMissingDocInfo',
				$body_fields,
				$email,
				$this->p->t('global', 'oldEntsWithoutDocumentFound') // ironic to use phrasen for a hardcoded german template btw
			);

			$emailcount++;
		}

		$this->_ci->logInfo($emailcount . " Emails erfolgreich versandt");
		$this->logInfo('End job FHC-Core-Anwesenheiten->EntschuldigungJob->notifyAssistenzAboutMissingEntschuldigungDokumente');

	}

	/**
	 * private utility function
	 * Expects parameter $workdaysAgo which is essentially ENTSCHULDIGUNG_JOB_INTERVAL config item
	 * calculates the date x workdays ago by skipping 3 days backwards on monday, else 1 day
	 */
	private function calcMinDate($workdaysAgo) {
		$date = new DateTime(); // today

		while ($workdaysAgo > 0) {
			// On Monday (1), subtract 3 days (skip Sat/Sun)
			if ((int) $date->format('N') === 1) {
				$date->modify('-3 days');
			} else {
				$date->modify('-1 day');
			}
			$workdaysAgo--;
		}

		return $date->format('c');
	}

	// job which finds entschuldigungen older than the defined interval which do not have a file attached yet
	// and would have been applied for a timespan in the past. Sets these old entschuldigungen to declined to prefilter
	// the entschuldigungen page for assistenzen a little better
	public function setOldApplicationsRejected()
	{
		$this->logInfo('Start job FHC-Core-Anwesenheiten->EntschuldigungJob->setOldApplicationsRejected');

		$interval = $this->_ci->config->item('ENTSCHULDIGUNG_AUTODECLINE_THRESHOLD');

		$result = $this->EntschuldigungModel->findOlderThanInterval($interval);
		$data = getData($result);
		
		$rows_history = 0;
		$rows_declined = 0;
		forEach($data as $ent) {
			$resultHistory = $this->setEntHistoryEntry($ent);
			if(isError($resultHistory)) {
				$this->logError($resultHistory, $interval);
			} else {
				$rows_history++;
			}
			
			$resultUpdate = $this->setEntDeclinedStatus($ent);
			if(isError($resultUpdate)) {
				$this->logError($resultUpdate, $interval);
			} else {
				$rows_declined++;
			}
		}

		$this->logInfo($rows_history." history entries created.");
		$this->logInfo($rows_declined." outdated Entschuldigungen declined.");

		$this->logInfo('End job FHC-Core-Anwesenheiten->EntschuldigungJob->setOldApplicationsRejected');
	}
	
	private function setEntHistoryEntry($ent) {
		return $this->_ci->EntschuldigungHistoryModel->insert(
			array(
				'entschuldigung_id' => $ent->entschuldigung_id,
				'person_id' => $ent->person_id,
				'von' => $ent->von,
				'bis' => $ent->bis,
				'dms_id' => $ent->dms_id,
				'insertvon' => $ent->insertvon,
				'insertamum' => $ent->insertamum,
				'updatevon' => $ent->updatevon,
				'updateamum' => $ent->updateamum,
				'statussetvon' => $ent->statussetvon,
				'statussetamum' => $ent->statussetamum,
				'akzeptiert' => $ent->akzeptiert,
				'notiz' => $ent->notiz,
				'version' => $ent->version
			)
		);
	}
	
	private function setEntDeclinedStatus($ent) {
		$version = $ent->version + 1;

		// statussetvon cant be set since statussetvon has fkey constraint on tbl_benutzer
		$updateEntries = array(
			'updatevon' => 'ent_decline_job',
			'updateamum' => date('Y-m-d H:i:s'),
			'akzeptiert' => false,
			'notiz' => $ent->notiz,
			'version' => $version,
			'von' => $ent->von,
			'bis' => $ent->bis
		);

		return $this->_ci->EntschuldigungModel->update(
			$ent->entschuldigung_id,
			$updateEntries
		);
	}
}