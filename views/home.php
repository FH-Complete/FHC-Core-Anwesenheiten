<?php
    $includesArray = array(
        'title' => 'FH-Complete Anwesenheiten Extension Test Test Test',
        'jquery3' => true,
        'jqueryui1' => true,
        'bootstrap3' => true,
        'fontawesome6' => true,
        'ajaxlib' => true,
        'dialoglib' => true,
        'tabulator4' => true,
        'tablewidget' => true,
        'sbadmintemplate3' => true,
        'navigationwidget' => true
    );

    $this->load->view('templates/FHC-Header', $includesArray);
?>

<body>
	<div id="wrapper">

		<?php echo $this->widgetlib->widget('NavigationWidget'); ?>

		<div id="page-wrapper">
			<div class="container-fluid">
				<div class="row">
					<div class="col-lg-12">
						<h3 class="page-header">Anwesenheiten Extension</h3>
					</div>
				</div>
				<div>
					This is the Anwesenheiten Extensionnnnnnnnnnn
				</div>

                <!-- Tabelle -->
                <div class="row">
                    <div class="col-lg-12">
                        <?php $this->load->view('extensions/FHC-Core-Anwesenheiten/anwesenheit/AnwesenheitData.php'); ?>
                    </div>
                </div>

			</div>
		</div>
	</div>
</body>

<?php $this->load->view('templates/FHC-Footer', $includesArray); ?>

