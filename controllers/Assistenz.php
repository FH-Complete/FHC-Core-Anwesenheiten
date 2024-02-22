<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Assistenz extends Auth_Controller
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
				'getEntschuldigungen' => 'admin:rw',
				'updateEntschuldigung' => 'admin:rw',
			)
		);

		$this->_ci =& get_instance();
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitenModel');
		$this->_ci->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');

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

	}
	
	public function getEntschuldigungen()
	{
		$this->outputJsonSuccess($this->_ci->EntschuldigungModel->getEntschuldigungen());
	}

	public function updateEntschuldigung()
	{
		$data = json_decode($this->input->raw_input_stream, true);

		$entschuldigung_id = $data['entschuldigung_id'];
		$status = $data['status'];

		if (isEmptyString($entschuldigung_id) || !in_array($status, [true, false]))
			$this->terminateWithJsonError('Error');

		$entschuldigung = $this->_ci->EntschuldigungModel->load($entschuldigung_id);

		if (isError($entschuldigung))
			$this->terminateWithJsonError('Error');
		if (!hasData($entschuldigung))
			$this->terminateWithJsonError('Error');

		$entschuldigung = getData($entschuldigung)[0];
		if ($entschuldigung->akzeptiert !== $status)
		{
			$updateStatus = $status ? 'entschuldigt' : 'abwesend';

			$updateAnwesenheit = $this->_ci->AnwesenheitenModel->updateAnwesenheitenByDatesStudent($entschuldigung->von, $entschuldigung->bis, $entschuldigung->person_id, $updateStatus);
			if (isError($updateAnwesenheit))
				$this->terminateWithJsonError($updateAnwesenheit);

			$update = $this->_ci->EntschuldigungModel->update(
				$entschuldigung->entschuldigung_id,
				array(
					'updatevon' => $this->_uid,
					'updateamum' => date('Y-m-d H:i:s'),
					'statussetvon' => $this->_uid,
					'statussetamum' => date('Y-m-d H:i:s'),
					'akzeptiert' => $status
				)
			);

			if (isError($update))
				$this->terminateWithJsonError('Error');
		}

		$this->outputJsonSuccess('Erfolgreich gespeichert');
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

