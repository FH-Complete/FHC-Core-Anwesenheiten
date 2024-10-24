<?php

$includesArray = array(
	'title' => 'Anwesenheiten',
	'axios027' => true,
	'jquery3' => true,
	'jqueryui1' => true,
	'bootstrap5' => true,
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
	'customCSSs' => array(
		'public/css/components/verticalsplit.css',
		'public/css/components/searchbar.css',
		'vendor/vuejs/vuedatepicker_css/main.css',
		'public/css/Fhc.css',
		'public/extensions/FHC-Core-Anwesenheiten/css/PrimevueCustom.css',
		'public/extensions/FHC-Core-Anwesenheiten/css/FhcMain.css'
	),
	'customJSs' => array(
		'vendor/vuejs/vuedatepicker_js/vue-datepicker.iife.js',
		'vendor/npm-asset/primevue/dropdown/dropdown.js',
		'vendor/npm-asset/primevue/divider/divider.js',
		'vendor/npm-asset/primevue/tooltip/tooltip.js',
		'vendor/npm-asset/primevue/panel/panel.js',
		'vendor/npm-asset/primevue/progressspinner/progressspinner.js'
	),
	'customJSModules' => array(
		'public/extensions/FHC-Core-Anwesenheiten/js/apps/AnwesenheitApp.js',
		'public/extensions/FHC-Core-Anwesenheiten/js/formatters/formatters.js',
		'vendor/olifolkerd/tabulator5/src/js/modules/Download/Download.js'
	)
);

$cis_4 = false;
if(defined('CIS4') && CIS4) {
	$cis_4 = true;
	$this->load->view('templates/CISHTML-Header', $includesArray);
} else {
	$this->load->view('templates/FHC-Header', $includesArray);
}

?>

<div id="main" permissions='<?php echo json_encode($permissions) ?>' cis4='<?php echo json_encode($cis_4) ?>' style="overflow: hidden;">
	<router-view permissions='<?php echo json_encode($permissions) ?>' cis4='<?php echo json_encode($cis_4) ?>'>
	
	</router-view>
</div>

<?php
	if(defined('CIS4') && CIS4) {
		$this->load->view('templates/CISHTML-Footer', $includesArray);
	} else {
		$this->load->view('templates/FHC-Footer', $includesArray);
	}
?>