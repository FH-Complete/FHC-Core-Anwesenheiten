<?php

$includesArray = array(
	'title' => 'Anwesenheiten',
	'jquery3' => true,
	'jqueryui1' => true,
	'bootstrap5' => true,
	'fontawesome4' => true,
	'tablewidget' => true,
	'tabulator4' => true,
	'ajaxlib' => true,
	'axios027' => true,
	'dialoglib' => true,
	'vue3' => true,
	'phrases' => array(
		'ui'
	),
	'customJSs' => array(
		'public/extensions/FHC-Core-Anwesenheiten/js/anwesenheiten.js',
	),
	'customJSModules' => (
		'public/extensions/FHC-Core-Anwesenheiten/js/vue/Overview.js'
	)
);


$this->load->view('templates/FHC-Header', $includesArray);
?>
<div id="content">

</div>


<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

