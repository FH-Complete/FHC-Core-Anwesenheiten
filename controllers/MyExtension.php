<?php
if (! defined('BASEPATH')) exit('No direct script access allowed');

class MyExtension extends Auth_Controller
{
	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct(array(
                'index'     => 'lehre/anwesenheiteneinsehen:rw',
                'save'      => 'lehre/anwesenheiteneinsehen:rw',
                'edit'      => 'lehre/anwesenheiteneinsehen:rw',
                'delete'    => 'lehre/anwesenheiteneinsehen:rw'
			)
		);
	}

	/**
	 * Index Controller
	 * @return void
	 */
	public function index()
	{

        // TODO: get ViewData defined
//        $viewData = array (
//
//        )

		$this->load->view('extensions/FHC-Core-Anwesenheiten/home', $viewData);
	}
}

