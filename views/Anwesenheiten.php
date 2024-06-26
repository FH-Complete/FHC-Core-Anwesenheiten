<?php

$includesArray = array(
	'title' => 'Anwesenheiten',
	'axios027' => true,
	'jquery3' => true,
	'jqueryui1' => true,
	'bootstrap5' => true,
	'fontawesome4' => true,
	'fontawesome6' => true,
	'tabulator5' => true,
	'tablesorter2' => true,
	'ajaxlib' => true,
	'filtercomponent' => true,
	'navigationcomponent' => true,
	'navigationwidget' => true,
	'momentjs2' => true,
	'dialoglib' => true,
	'vue3' => true,
	'primevue3' => true,
	'phrases' => array(
		'ui', 'person', 'lehre', 'table', 'filter', 'global'
	),
	'customCSSs' => array(
		'public/css/components/verticalsplit.css',
		'public/css/components/searchbar.css',
		'vendor/vuejs/vuedatepicker_css/main.css',
		'public/css/Fhc.css'
	),
	'customJSs' => array(
		'vendor/vuejs/vuedatepicker_js/vue-datepicker.iife.js',
		'vendor/npm-asset/primevue/dropdown/dropdown.js',
		'vendor/npm-asset/primevue/divider/divider.js'
	),
	'customJSModules' => array(
		'public/extensions/FHC-Core-Anwesenheiten/js/apps/AnwesenheitApp.js',
		'public/extensions/FHC-Core-Anwesenheiten/js/mixins/formatters.js'
	)
);

$this->load->view('templates/FHC-Header', $includesArray);
?>



<body>

<div id="main" permissions='<?php echo json_encode($permissions) ?>' style="margin-right: 18px;">
	<router-view permissions='<?php echo json_encode($permissions) ?>'>
	
	</router-view>
</div>
</body>

<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

