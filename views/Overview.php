<?php

$includesArray = array(
	'title' => 'Anwesenheiten',
	'axios027' => true,
	'jquery3' => true,
	'jqueryui1' => true,
	'bootstrap5' => true,
	'fontawesome4' => true,
	'tabulator5' => true,
	'tablesorter2' => true,
	'ajaxlib' => true,
	'filtercomponent' => true,
	'navigationcomponent' => true,
	'navigationwidget' => true,
	'dialoglib' => true,
	'vue3' => true,
	'phrases' => array(
		'global',
		'ui',
		'filter'
	),
	'customCSSs' => array(
		'public/css/components/verticalsplit.css',
		'public/css/components/searchbar.css',
	),
	'customJSs' => array(
//		'vendor/axios/axios/lib/axios.js',
//		'vendor/axios/axios/axios.min.js',
		'public/extensions/FHC-Core-Anwesenheiten/js/anwesenheiten.js',
	),
	'customJSModules' => (
		'public/extensions/FHC-Core-Anwesenheiten/js/apps/OverviewApp.js'
	)
);

$this->load->view('templates/FHC-Header', $includesArray);
?>


<div id="main">

</div>


<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

