<?php

// TODO: actually build Anwesenheit Query

$query = '
	SELECT "anwesenheit_id", "prestudent_id", "lehreinheit_id", "status"
    FROM extension.tbl_anwesenheit
';

$filterWidgetArray = array(
    'query' => $query,
    'tableUniqueId' => 'adminAnwesenheit',
    'requiredPermissions' => 'extension/anwesenheit_admin',
    'datasetRepresentation' => 'tabulator',
    'columnsAliases' => array(
        'anwesenheit_id',
        'prestudent_id' ,
        'lehreinheit_id',
        'status',
        'insertamum'
    ),
    'datasetRepOptions' => '{
		height: func_height(this),
		layout: "fitDataFill",
		persistentLayout:true,
		autoResize: false,
	    headerFilterPlaceholder: " ",
        index: "anwesenheit_id",
        selectable: false,                  // allow row selection
		tableWidgetHeader: true,
		tableBuilt: function(){
            func_tableBuilt(this);
        },
	 }',

    'datasetRepFieldsDefs' => '{
		anwesenheit_id: {visible: false, headerFilter:"input"},
		prestudent_id: {headerFilter:"input"},
		lehreinheit_id: {headerFilter:"input"},
		status: {headerFilter:"input"},
	    insertamum: {headerFilter:"input"}
	 }'
);

echo $this->widgetlib->widget('TableWidget', $filterWidgetArray);