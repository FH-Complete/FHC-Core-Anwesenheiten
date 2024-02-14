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
				'getNewQRCode' => 'admin:rw',
				'getExistingQRCode' => 'admin:rw',
				'deleteQRCode' => 'admin:rw'
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/QR_model', 'QRModel');

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

	public function getExistingQRCode(){
		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		$result = $this->_ci->QRModel->loadWhere(array('lehreinheit_id' => $le_id));

		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		if(hasData($result)) { // resend existing qr

			$shortHash = $result->retval[0]->zugangscode;

			// TODO: maybe there is a better way to define $url? is APP_ROOT reliable?
			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";
			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash));
		} else {
			$this->outputJsonError("No existing Anwesenheitskontrolle found");
		}

	}

	public function getNewQRCode()
	{
		// TODO: (johann) probably the right spot to insert/prepare stundenplan fetching logic for incoming batch of Anwesenheiten
		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		// check if QR code already exists for given qrinfo
		$result = $this->_ci->QRModel->loadWhere(array('lehreinheit_id' => $le_id));

		$options = new QROptions([
			'outputType' => QRCode::OUTPUT_MARKUP_SVG,
			'addQuietzone' => true,
			'quietzoneSize' => 1,
			'scale' => 10
		]);
		$qrcode = new QRCode($options);

		if(hasData($result)) { // resend existing qr

			$shortHash = $result->retval[0]->zugangscode;

			// TODO: maybe there is a better way to define $url? is APP_ROOT reliable?
			$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";
			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash));

		} else { // create a newqr

			do {
				$token = generateToken();
				$hash = hash('md5', $token); // even md5 is way too secure when trimming hashcode anyways
				$shortHash = substr($hash, 0, 8);// trim hashcode for people entering manually

				$url = APP_ROOT."index.ci.php/extensions/FHC-Core-Anwesenheiten/Student/Scan/$shortHash";

				$check = $this->_ci->QRModel->loadWhere(array('zugangscode' => $shortHash));
			} while(hasData($check));

			$insert = $this->_ci->QRModel->insert(array(
				'zugangscode' => $shortHash,
				'lehreinheit_id' => $le_id,
				'insertamum' => date('Y-m-d H:i:s')
			));

			if (isError($insert))
				$this->terminateWithJsonError('Fehler beim Speichern');


			// insert Anwesenheiten entries of every Student as Abwesend sitting
			$this->_ci->AnwesenheitenModel->createNewAnwesenheitenEntries($le_id);

			$this->outputJsonSuccess(array('svg' => $qrcode->render($url), 'url' => $url, 'code' => $shortHash));
		}
	}

	public function deleteQRCode()
	{

		// TODO: maybe wait with ACTUALLY deleting because stupid user will 99% prematurely cancel a check?

		$result = $this->getPostJSON();
		$le_id = $result->le_id;

		$result = $this->_ci->QRModel->loadWhere(array('lehreinheit_id' => $le_id));

		if (hasData($result)) {
			$deleteresp = $this->_ci->QRModel->delete(array(
				'zugangscode' => $result->retval[0]->zugangscode,
				'lehreinheit_id' => $le_id
			));

			return $deleteresp;
		} else {
			$this->terminateWithJsonError('Fehler beim Löschen der Anwesenheitskontrolle');
		}
	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{
		$this->_ci->load->view('extensions/FHC-Core-Anwesenheiten/Anwesenheiten', [
			'permissions' => [
				'admin/rw' => $this->permissionlib->isBerechtigt('admin/rw'),
				'student/alias' => $this->permissionlib->isBerechtigt('student/alias')
			]
		]);
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

