<?php
$this->load->view(

	'templates/FHC-Header',
	array(
		'title' => 'Anwesenheiten',
		'jquery3' => true,
		'jqueryui1' => true,
		'bootstrap3' => true,
		'fontawesome4' => true,
		'tablewidget' => true,
		'tabulator4' => true,
		'ajaxlib' => true,
		'dialoglib' => true,
		'phrases' => array(
			'ui'
		),
		'customJSs' => array(
			'public/extensions/FHC-Core-Anwesenheiten/js/anwesenheiten.js',
		)
	)
);
?>
<body>
<div id="wrapper">
	<div id="page-wrapper">
		<div class="container-fluid">
			<div class="row">
				<div class="col-lg-12">
					<h3 class="page-header">
						Anwesenheit
					</h3>
				</div>
			</div>

			<div>
				<?php $this->load->view('extensions/FHC-Core-Anwesenheiten/anwesenheit/AnwesenheitData.php');?>
			</div>
		</div>
	</div>
</div>
</body>

<?php $this->load->view('templates/FHC-Footer'); ?>

