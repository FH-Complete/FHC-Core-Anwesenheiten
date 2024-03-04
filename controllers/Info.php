<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

class Info extends Auth_Controller
{

	private $_ci;
	private $_uid;

	public function __construct()
	{
		parent::__construct(array(
			)
		);

		$this->_ci =& get_instance();

		$this->_setAuthUID(); // sets property uid
	}
	
	private function _setAuthUID()
	{
		$this->_uid = getAuthUID();
		
		if (!$this->_uid)
			show_error('User authentification failed');
	}

}

