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
	
Events::on('extendStundenplanData', function($data_reference) {
	$ci =& get_instance();

	$data =& $data_reference();

	$ci->load->model('organisation/Studiensemester_model', 'StudiensemesterModel');

	$semKurzbzByDatum = array(); // cache: datum => studiensemester_kurzbz

	foreach($data as $item) {
		if (empty($item->gruppe) || !isset($item->gruppe[0]))
			continue;

		$sem = $item->gruppe[0]->semester;
		$stg_kz = $item->gruppe[0]->studiengang_kz;

		// resolve sem_kurzbz from the lesson date (cached per date)
		$datum = $item->datum;
		if (!array_key_exists($datum, $semKurzbzByDatum)) {
			$semRes = $ci->StudiensemesterModel->getByDate($datum);
			$semRow = (isSuccess($semRes) && hasData($semRes)) ? current(getData($semRes)) : null;
			$semKurzbzByDatum[$datum] = $semRow ? $semRow->studiensemester_kurzbz : null;
		}

		$item->digi_anw_data = array(
			'sem' => $sem,
			'stg_kz' => $stg_kz,
			'lv_id' => $item->lehrveranstaltung_id,
			'sem_kurzbz' => $semKurzbzByDatum[$datum]
		);
	}
	
});
