<?php

use CI3_Events as Events;


Events::on('lvMenuBuild', function ($menu_reference, $params) {

	extract($params);
	$menu =& $menu_reference();

	$link= APP_ROOT."cis.php/extensions/FHC-Core-Anwesenheiten/?stg_kz=$studiengang_kz&sem=$semester&lvid=$lvid&sem_kurzbz=$angezeigtes_stsem";

	$menu[]=array
	(
		'id'=>'core_menu_digitale_anwesenheitslisten',
		'position'=>'50',
		'name'=> $ci_p->t('global', 'digitalesAnwManagement'),
		'c4_icon'=>APP_ROOT."/skin/images/button_kreuzerltool.png",
		'c4_link'=>$link,
		'text'=>''
	);

});