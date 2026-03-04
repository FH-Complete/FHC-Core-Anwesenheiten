<?php

if (! defined('BASEPATH')) exit('No direct script access allowed');

$config['REGENERATE_QR_TIMER'] = 30000; //30 seconds
//$config['REGENERATE_QR_TIMER', 3000000); //50 minutes
//$config['REGENERATE_QR_TIMER', 8000); //8 seconds
//$config['REGENERATE_QR_TIMER', 120000); //120 seconds
$config['USE_REGENERATE_QR'] = true;
// used in deleteOldQR Cronjob
$config['QR_EXPIRATION_TIMER'] = 3600000; // 1 hour
// size of the generated QR code, development phase was always scale 10,
// maybe use smaller sizes for old cis or other environments
$config['QR_SCALE'] = 7;
// frist welche entscheidet wie weit in die Vergangenheit eine neue Entschuldigung reichen darf
$config['ENTSCHULDIGUNG_MAX_REACH'] = 3; // 3 days
// https://media-hp.technikum-wien.at/media/20220818073147/Version-17-vom-07.06.2022.pdf §8 Abs 14
// frist welche entscheidet wie weit in die Vergangenheit alte Kontrollen gelöscht werden dürfen
$config['KONTROLLE_DELETE_MAX_REACH'] = 1; // 1 day
$config['ANWESEND_STATUS'] = 'anwesend';
$config['ABWESEND_STATUS'] = 'abwesend';
$config['ENTSCHULDIGT_STATUS'] = 'entschuldigt';
// dauer einer Unterrichtseinheit in Stunden
$config['EINHEIT_DAUER'] = 0.75;
// toggle für UI elemente & API endpunkte, bestehende daten bleiben unverändert
$config['ENTSCHULDIGUNGEN_ENABLED'] = true;
$config['KONTROLLE_CREATE_MAX_REACH_PAST'] = 14; // days +/- semester beginn bzw ende
$config['KONTROLLE_CREATE_MAX_REACH_FUTURE'] = 3; // days +/- semester beginn bzw ende
$config['POSITIVE_RATING_THRESHOLD'] = 0.75; // min. 75 % anwesenheit
// show guide/tutorial link
$config['SHOW_GUIDE'] = false;
$config['GUIDE_LINK'] = "https://wiki.fhcomplete.org/doku.php?id=extension:anwesenheit";
// lehrformen to allow to skip the qr scan and insert all anw as positive
$config['NO_QR_LEHRFORM'] = [
//	'LAB', 'BE'
];
// when selecting certain lehrformen with special teaching situations alert spezialized text
// on how to handle the attendance check.
$config['ALERT_LEHRFORM'] = array(
//	array(
//		'lehrform_kurzbz' => 'LAB',
//		'german_alert_text' => 'In der Lehrform Labor können Sie die Anwesenheitskontrolle mit QR Code überspringen und Anwesenheiten direkt eintragen!',
//		'english_alert_text' => 'In the laboratory teaching format, you can skip the attendance check with QR code and enter attendance directly!'
//	),
//	array(
//		'lehrform_kurzbz' => 'BE',
//		'german_alert_text' => 'In der Lehrform Betreuung können Sie die Anwesenheitskontrolle mit QR Code überspringen und Anwesenheiten direkt eintragen!',
//		'english_alert_text' => 'In the supervision teaching format, you can skip the attendance check with QR code and enter attendance directly!'
//	)
);
// limit for auto declining old entschuldigung applications that do not have a file attached yet
$config['ENTSCHULDIGUNG_AUTODECLINE_THRESHOLD'] = '60 days';
$config['ENTSCHULDIGUNG_EMAIL_INTERVAL'] = 3; // Workdays
$config['URL_ASSISTENZ_ENTMANAGEMENT'] = 'index.ci.php/extensions/FHC-Core-Anwesenheiten/Administration';


