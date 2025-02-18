<?php

use CI3_Events as Events;


Events::on('lvMenuBuild', function ($menu_reference, $params) {

	extract($params);
	$menu =& $menu_reference();

	// config check to only allow defined stg_kz's to see the menu, see cis_menu_lv
	if(defined('CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN') 
		&& CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN && $angemeldet
		&& (!defined('CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN_STG') 
			|| in_array($studiengang_kz, unserialize(CIS_LEHRVERANSTALTUNG_ANWESENHEIT_ANZEIGEN_STG))))
		
	{
		$link = APP_ROOT."cis.php/extensions/FHC-Core-Anwesenheiten/?stg_kz=$studiengang_kz&sem=$semester&lvid=$lvid&sem_kurzbz=$angezeigtes_stsem";
		$menu[]=array
		(
			'id'=>'core_menu_digitale_anwesenheitslisten',
			'position'=>'50',
			'name'=> $ci_p->t('global', 'digitalesAnwManagement'),
			'phrase' => 'global/digitalesAnwManagement',
			'c4_icon'=> APP_ROOT."/skin/images/button_kreuzerltool.png",
			'c4_icon2' => 'fa-solid fa-graduation-cap',
			'c4_link'=>$link,
			'text'=> $studiengang_kz
		);
	}
});