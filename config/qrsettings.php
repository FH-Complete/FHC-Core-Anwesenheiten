<?php

if (! defined('BASEPATH')) exit('No direct script access allowed');

$config['REGENERATE_QR_TIMER'] = 30000; //30 seconds
//$config['REGENERATE_QR_TIMER', 3000000); //50 minutes
//$config['REGENERATE_QR_TIMER', 8000); //8 seconds
//$config['REGENERATE_QR_TIMER', 120000); //120 seconds
$config['USE_REGENERATE_QR'] = true;
// used in deleteOldQR Cronjob
$config['QR_EXPIRATION_TIMER'] = 3600000; // 1 hour
// frist welche entscheidet wie weit in die Vergangenheit eine neue Entschuldigung reichen darf
$config['ENTSCHULDIGUNG_MAX_REACH'] = 7; // 7 days
// frist welche entscheidet wie weit in die Vergangenheit alte Kontrollen gelöscht werden dürfen
$config['KONTROLLE_DELETE_MAX_REACH'] = 1; // 1 day
$config['ANWESEND_STATUS'] = 'anwesend';
$config['ABWESEND_STATUS'] = 'abwesend';
$config['ENTSCHULDIGT_STATUS'] = 'entschuldigt';
// dauer einer Unterrichtseinheit in Stunden
$config['EINHEIT_DAUER'] = 0.75;
// toggle für UI elemente & API endpunkte, bestehende daten bleiben unverändert
$config['ENTSCHULDIGUNGEN_ENABLED'] = true;
$config['STATS_ENABLED'] = true;
$config['KONTROLLE_CREATE_MAX_REACH'] = 14; // days +/- semester beginn bzw ende
$config['POSITIVE_RATING_THRESHOLD'] = 0.75; // min. 75 % anwesenheit