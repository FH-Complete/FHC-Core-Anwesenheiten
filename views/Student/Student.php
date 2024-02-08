<?php

$includesArray = array(
	'title' => 'Anwesenheiten',
	'axios027' => true,
	'bootstrap5' => true,
	'tabulator5' => true,
	'filtercomponent' => true,
	'navigationcomponent' => true,
	'vue3' => true,
	'primevue3' => true,
	'phrases' => array(
		'global',
		'ui',
		'filter'
	),
	'customJSs' => array(
		'public/extensions/FHC-Core-Anwesenheiten/js/anwesenheiten.js',
	),
	'customJSModules' => (
		'public/extensions/FHC-Core-Anwesenheiten/js/apps/StudentApp.js'
	),
	'customCSSs' => array(
		'vendor/vuejs/vuedatepicker_css/main.css'
	),
);

$this->load->view('templates/FHC-Header', $includesArray);
?>

<body>
	<div id="main">
		<student></student>
	</div>
</body>



<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

