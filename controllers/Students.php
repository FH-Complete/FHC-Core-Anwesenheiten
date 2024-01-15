<?php
if (! defined('BASEPATH')) exit('No direct script access allowed');

class Students extends Auth_Controller
{

    const DEFAULT_PERMISSION = 'basis/student:r';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(array(
                'index'=> Students::DEFAULT_PERMISSION	)
        );
        $this->load->model('extensions/FHC-Core-Personalverwaltung/Api_model','ApiModel');

        // Loads WidgetLib
        $this->load->library('WidgetLib');

        // Loads phrases system
        $this->loadPhrases(
            array(
                'global',
                'ui',
                'filter'
            )
        );
    }

    /**
     * Index Controller
     * @return void
     */
    public function index()
    {
        $this->load->library('WidgetLib');
        $this->load->view('extensions/FHC-Core-Anwesenheiten/students/home');
    }

}