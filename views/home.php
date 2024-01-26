<?php

$includesArray = array(
	'title' => 'Anwesenheiten',
	'jquery3' => true,
	'jqueryui1' => true,
	'bootstrap5' => true,
	'fontawesome6' => true,
	'tablewidget' => true,
	'tabulator5' => true,
	'ajaxlib' => true,
	'axios027' => true,
	'dialoglib' => true,
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
		'public/extensions/FHC-Core-Anwesenheiten/js/vue/OverviewApp.js'
	)
);

$this->load->view('templates/FHC-Header', $includesArray);
?>


<div id="main">

	<core-navigation-cmpt v-bind:add-side-menu-entries="appSideMenuEntries"></core-navigation-cmpt>





	<overview-component></overview-component>


<!--	<div class="row">-->
<!--		<div class="col-lg-12">-->
<!--			--><?php //$this->load->view('extensions/FHC-Core-Anwesenheiten/overview/OverviewData.php', $dates); ?>
<!--		</div>-->
<!--	</div>-->

</div>


<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

