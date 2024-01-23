<?php

$query = '
	SELECT anwesenheit_id, prestudent_id, lehreinheit_id, status
    FROM extension.tbl_anwesenheit
';

echo json_encode($dates);

$filterWidgetArray = array(
	'query' => $query,
	'app' => 'core',
	'tableUniqueId' => 'adminAnwesenheitOverview',
	'filter_id' => $this->input->get('filter_id'),
	'requiredPermissions' => 'admin:r',
	'datasetRepresentation' => 'tabulator',
	'additionalColumns' => array(
	),
	'datasetRepOptions' => '{
		index: "anwesenheit_id",
		height: func_height(this),
		layout: "fitColumns",
		headerFilterPlaceholder: " ",
		tableWidgetHeader: false,
		columnVertAlign:"center",
		columnAlign:"center",
		fitColumns:true,
		selectable: true,
		selectableRangeMode: "click",
		selectablePersistence: false
	}',
	'datasetRepFieldsDefs' => '{
		anwesenheit_id: {visible: true},
		prestudent_id: {visible: true},
		lehreinheit_id: {width: "150"},
		status: {visible: false, width: "250"}
	}'
);
echo $this->widgetlib->widget('TableWidget', $filterWidgetArray);