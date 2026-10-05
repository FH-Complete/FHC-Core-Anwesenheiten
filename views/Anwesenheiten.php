<?php

$includesArray = array(
	'title' => 'Anwesenheiten',
	'axios027' => true,
	'bootstrap5' => true,
	'fontawesome6' => true,
	'tabulator5' => true,
	'vue3' => true,
	'primevue3' => true,
	'customCSSs' => array(
		'public/css/components/verticalsplit.css',
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
		'vendor/npm-asset/primevue/checkbox/checkbox.js',
		'vendor/npm-asset/primevue/textarea/textarea.js',
		'vendor/npm-asset/primevue/tristatecheckbox/tristatecheckbox.js',
		'vendor/npm-asset/primevue/progressspinner/progressspinner.js',
		'vendor/npm-asset/primevue/timeline/timeline.js',
		'vendor/moment/luxonjs/luxon.min.js'
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
	$this->load->view('templates/CISVUE-Header', $includesArray);
} else {
	$this->load->view('templates/FHC-Header', $includesArray);
}

?>

<div id="main" permissions='<?php echo json_encode($permissions) ?>' cis4='<?php echo json_encode($cis_4) ?>'>
	<router-view permissions='<?php echo json_encode($permissions) ?>' cis4='<?php echo json_encode($cis_4) ?>'>
	
	</router-view>
</div>

<?php
	if(defined('CIS4') && CIS4) {
		$this->load->view('templates/CISVUE-Footer', $includesArray);

	} else {
		$this->load->view('templates/FHC-Footer', $includesArray);
	}
?>