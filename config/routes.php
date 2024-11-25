<?php

defined('BASEPATH') || exit('No direct script access allowed');

$route['extensions/FHC-Core-Anwesenheiten'] = 'extensions/FHC-Core-Anwesenheiten/Anw/index';
$route['extensions/FHC-Core-Anwesenheiten/'] = 'extensions/FHC-Core-Anwesenheiten/Anw/index';
$route['extensions/FHC-Core-Anwesenheiten/Kontrolle/.+'] = 'extensions/FHC-Core-Anwesenheiten/Kontrolle/index';
$route['extensions/FHC-Core-Anwesenheiten/kontrolle/.+'] = 'extensions/FHC-Core-Anwesenheiten/Kontrolle/index';
$route['extensions/FHC-Core-Anwesenheiten/Lektor/.+'] = 'extensions/FHC-Core-Anwesenheiten/Kontrolle/index';
$route['extensions/FHC-Core-Anwesenheiten/lektor/.+'] = 'extensions/FHC-Core-Anwesenheiten/Kontrolle/index';
$route['extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile.*'] = 'extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile';
$route['extensions/FHC-Core-Anwesenheiten/Profil/.+'] = 'extensions/FHC-Core-Anwesenheiten/Profil/index';
$route['extensions/FHC-Core-Anwesenheiten/profil/.+'] = 'extensions/FHC-Core-Anwesenheiten/Profil/index';
$route['extensions/FHC-Core-Anwesenheiten/Student/.+'] = 'extensions/FHC-Core-Anwesenheiten/Profil/index';
$route['extensions/FHC-Core-Anwesenheiten/student/.+'] = 'extensions/FHC-Core-Anwesenheiten/Profil/index';
$route['extensions/FHC-Core-Anwesenheiten/Administration/.+'] = 'extensions/FHC-Core-Anwesenheiten/Administration/index';
$route['extensions/FHC-Core-Anwesenheiten/administration/.+'] = 'extensions/FHC-Core-Anwesenheiten/Administration/index';
$route['extensions/FHC-Core-Anwesenheiten/Assistenz/.+'] = 'extensions/FHC-Core-Anwesenheiten/Administration/index';
$route['extensions/FHC-Core-Anwesenheiten/assistenz/.+'] = 'extensions/FHC-Core-Anwesenheiten/Administration/index';