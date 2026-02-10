<?php

use CI3_Events as Events;


Events::on('lvMenuBuild', function ($menu_reference, $params) {

//	extract($params);
	$menu =& $menu_reference();

	// config check to only allow defined stg_kz's to see the menu, see cis_menu_lv
	if(defined('CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN') 
		&& CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN && $params['angemeldet']
		&& (!defined('CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN_STG') || in_array($params['studiengang_kz'], unserialize(CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN_STG)))
		&& (!defined('CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN_LVA') || in_array($params['lvid'], unserialize(CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN_LVA)))
		&& ($params['permissionLib']->isBerechtigt('extension/anw_r_ent_assistenz')
			|| $params['permissionLib']->isBerechtigt('extension/anw_r_lektor')
			|| $params['permissionLib']->isBerechtigt('extension/anw_r_student')
			|| $params['permissionLib']->isBerechtigt('extension/anw_r_full_assistenz')))
		
	{

		$stg_kz = $params['studiengang_kz'];
		$semester = $params['semester'];
		$lv_id = $params['lvid'];
		$angezeigtes_stsem = $params['angezeigtes_stsem'];
		
		$link = APP_ROOT."cis.php/extensions/FHC-Core-Anwesenheiten/?stg_kz=.$stg_kz.&sem=$semester&lvid=$lv_id&sem_kurzbz=$angezeigtes_stsem";
		$menu[]=array
		(
			'id'=>'core_menu_digitale_anwesenheitslisten',
			'position'=>'50',
			'name'=> $params['phrasesLib']->t('global', 'digitalesAnwManagement'),
			'phrase' => 'global/digitalesAnwManagement',
			'c4_icon'=> APP_ROOT."/skin/images/button_kreuzerltool.png",
			'c4_icon2' => 'fa-solid fa-graduation-cap',
			'c4_link'=>$link,
			'text'=> $stg_kz
		);
	}
});

Events::on('getAnwesenheitenForLvAndSemester', function ($prestudent_ids, $lv_id, $sem_kurzbz, $downloadFunc) {
	$ci =& get_instance();

	$ci->load->model('extensions/FHC-Core-Anwesenheiten/Anwesenheit_User_model', 'AnwesenheitUserModel');

	$result = $ci->AnwesenheitUserModel->getAnwQuoteForPrestudentIds($prestudent_ids, $lv_id,  $sem_kurzbz);
	
	$downloadFunc($result->retval);
});
	
