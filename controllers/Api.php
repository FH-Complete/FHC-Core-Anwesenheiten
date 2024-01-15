<?php
defined('BASEPATH') || exit('No direct script access allowed');


class Api extends Auth_Controller
{
    const DEFAULT_PERMISSION = 'basis/mitarbeiter:r';

    public function __construct() {

        parent::__construct(
            array(
                'index' => Api::DEFAULT_PERMISSION,
                'getSprache' => Api::DEFAULT_PERMISSION,
            )
        );


        // Loads authentication library and starts authentication
        $this->load->library('AuthLib');

        $this->load->model('extensions/FHC-Core-Anwesenheiten/Api_model','ApiModel');
        $this->load->model('person/Person_model','PersonModel');
        $this->load->model('person/Kontakt_model','KontaktModel');
        $this->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_model', 'AnwesenheitModel');
        $this->load->model('extensions/FHC-Core-Anwesenheiten/Entschuldigung_model', 'EntschuldigungModel');
    }

    function index()
    {
        $data = $this->ApiModel->fetch_all();
        $this->outputJsonSuccess($data->result_array());
    }


    function getSprache()
    {
        $spracheRes = $this->SpracheModel->load();

        if (isError($spracheRes))
        {
            $this->outputJsonError(getError($spracheRes));
            exit;
        }

        $this->outputJson($spracheRes);
    }
}