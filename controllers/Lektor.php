<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

use \chillerlan\QRCode\QROptions;
use \chillerlan\QRCode\QRCode;

class Lektor extends Auth_Controller
{

	private $_ci;
	private $_uid;

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
				'index' => 'admin:rw',
				'studentByLva' => 'admin:rw',
				'getAllAnwesenheitenByLektor' => 'admin:rw',
				'getAllAnwesenheitenByStudentByLva' => 'admin:rw',
				'updateAnwesenheiten' => 'admin:rw',
				'getQRCode' => 'admin:rw'
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');

		// load libraries
		$this->_ci->load->library('PermissionLib');
		$this->_ci->load->library('WidgetLib');
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

	}

	public function getAllAnwesenheitenByLektor()
	{
		$ma_uid = $this->input->get('ma_uid');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitenModel->getAllAnwesenheitenByLektor($ma_uid, $lv_id, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->outputJson($res);
	}



	public function getAllAnwesenheitenByStudentByLva()
	{
		$prestudent_id = $this->input->get('prestudent_id');
		$lv_id = $this->input->get('lv_id');
		$sem_kurzbz = $this->input->get('sem_kurzbz');

		$res = $this->_ci->AnwesenheitenModel->getAllAnwesenheitenByStudentByLva($prestudent_id, $lv_id, $sem_kurzbz);

		if(!hasData($res)) return null;
		$this->outputJson($res);
	}

	public function updateAnwesenheiten()
	{
		$result = $this->getPostJSON();
		$changedAnwesenheiten = $result->changedAnwesenheiten;
		return $this->_ci->AnwesenheitenModel->updateAnwesenheiten($changedAnwesenheiten);
	}

	public function getQRCode() {

			// TODO: (johann) probably the right spot to insert/prepare stundenplan fetching logic for incoming batch of
			// Anwesenheiten

		$result = $this->getPostJSON();
		$qrinfo = $result->qrinfo;


		// TODO: (johann) welche infos benötigen wir wirklich für einen QR?
		$ma_uid = $qrinfo->ma_uid;
		$sem_kurzbz = $qrinfo->sem_kurzbz;
		$lv_id = $qrinfo->lv_id;
		$selectedDate = $qrinfo->selectedDate;

		$mitarbeiter = $this->_ci->Emodel->loadWhere(array('student_uid' => $this->_uid));

		if (!hasData($student))
			$this->terminateWithJsonError('Der Mitarbeiter kann nicht geladen werden.');

		$studiengang = $this->_ci->StudiengangModel->loadWhere(array('studiengang_kz' => getData($student)[0]->studiengang_kz));

		if (!hasData($studiengang))
			$this->terminateWithJsonError('Die Lehreinehit kann nicht geladen werden.');

		$studiengangTyp = getData($studiengang)[0]->typ;

		if ($studiengangTyp !== 'm' && $studiengangTyp !== 'b' && !in_array($this->_uid, $this->_ci->config->item('USERS_WHITELIST')))
			$this->terminateWithJsonError('Sie sind nicht berechtigt.');

		$cards = $this->_ci->BetriebsmittelpersonModel->getBetriebsmittelByUid($this->_uid, 'Zutrittskarte');


		// this->AnwesenheitenModel

		// generate Zugangscode to be entered or scanned with QR

		// check if QR code already exists for given qrinfo

		$existingQR = $this->_ci->QRModel->getQRCode($qrinfo);



		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);

		$qrcode = new QRCode($options);

		if (hasData($existingQR))
		{
			$result = getData($existingQR)[0];

			$hash = $result->zugangscode;

			$this->outputJsonSuccess(array('svg' => $qrcode->render($hash)));
		}
		else
		{
			do {
				$token = generateToken();
				$hash = hash('md5', $token);
				$check = $this->_ci->QRModel->loadWhere(array('zugangscode' => $hash));
			} while(hasData($check));


			$insert = $this->_ci->QRModel->insert(array(
				'zugangscode' => $hash,
//				'lehreinheit_id' => $pin,
				'insertamum' => date('Y-m-d H:i:s')));

			if (isError($insert))
				$this->terminateWithJsonError('Fehler beim Speichern');

			$this->outputJsonSuccess(array('svg' => $qrcode->render($hash), 'pin' => $pin));
		}
	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{
		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Anwesenheiten');
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

