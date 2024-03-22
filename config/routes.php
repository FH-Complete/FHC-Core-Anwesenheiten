<?php

defined('BASEPATH') || exit('No direct script access allowed');

$route['extensions/FHC-Core-Anwesenheiten'] = 'extensions/FHC-Core-Anwesenheiten/Anw/index';
$route['extensions/FHC-Core-Anwesenheiten/'] = 'extensions/FHC-Core-Anwesenheiten/Anw/index';
$route['extensions/FHC-Core-Anwesenheiten/Lektor/.+'] = 'extensions/FHC-Core-Anwesenheiten/Lektor/index';
$route['extensions/FHC-Core-Anwesenheiten/lektor/.+'] = 'extensions/FHC-Core-Anwesenheiten/Lektor/index';
$route['extensions/FHC-Core-Anwesenheiten/Student/.+'] = 'extensions/FHC-Core-Anwesenheiten/Student/index';
$route['extensions/FHC-Core-Anwesenheiten/student/.+'] = 'extensions/FHC-Core-Anwesenheiten/Student/index';
$route['extensions/FHC-Core-Anwesenheiten/Assistenz/.+'] = 'extensions/FHC-Core-Anwesenheiten/Assistenz/index';
$route['extensions/FHC-Core-Anwesenheiten/assistenz/.+'] = 'extensions/FHC-Core-Anwesenheiten/Assistenz/index';