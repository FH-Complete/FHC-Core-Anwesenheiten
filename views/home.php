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
	'primevue3' => true,
	'phrases' => array(
		'ui'
	),
	'customJSs' => array(
		'public/extensions/FHC-Core-Anwesenheiten/js/anwesenheiten.js',
	),
	'customJSModules' => (
		'public/extensions/FHC-Core-Anwesenheiten/js/vue/OverviewApp.js'
	)
);

//echo json_encode($students);

$this->load->view('templates/FHC-Header', $includesArray);
?>
<script>
	var students = <?= json_encode($students) ?>;
	var dates = <?= json_encode($dates) ?>;
	var parameters = <?= json_encode($parameters)?>
</script>

<div>

	<div id="overviewApp">
		<overview-component></overview-component>
	</div>

<!--	<div class="row">-->
<!--		<div class="col-lg-12">-->
<!--			--><?php //$this->load->view('extensions/FHC-Core-Anwesenheiten/overview/OverviewData.php', $dates); ?>
<!--		</div>-->
<!--	</div>-->

</div>


<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

