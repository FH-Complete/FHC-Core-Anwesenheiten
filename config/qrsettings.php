<?php

if (! defined('BASEPATH')) exit('No direct script access allowed');

define('REGENERATE_QR_TIMER', 30000); //30 seconds
//define('REGENERATE_QR_TIMER', 3000000); //50 minutes
//define('REGENERATE_QR_TIMER', 8000); //8 seconds
//define('REGENERATE_QR_TIMER', 120000); //120 seconds
define('USE_REGENERATE_QR', true);
// used in deleteOldQR Cronjob
define('QR_EXPIRATION_TIMER', 3600000); // 1 hour