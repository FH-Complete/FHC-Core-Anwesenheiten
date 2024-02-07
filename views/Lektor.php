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
		'vendor/vuejs/vuedatepicker_css/main.css'
	),
	'customJSs' => array(
		'vendor/vuejs/vuedatepicker_js/vue-datepicker.iife.js',
		'public/extensions/FHC-Core-Anwesenheiten/js/anwesenheiten.js',
	),
	'customJSModules' => (
		'public/extensions/FHC-Core-Anwesenheiten/js/apps/LektorApp.js'
	)
);

$this->load->view('templates/FHC-Header', $includesArray);
?>

<body>
	<div id="main">
		<router-view

		></router-view>
	</div>
</body>



<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

