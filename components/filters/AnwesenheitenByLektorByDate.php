<?php

$filterCmptArray = array(
	'app' => 'core',
	'datasetName' => 'AnwesenheitenByLektorByDate',
	'query' => '
			SELECT
				anwesenheit_id,
				prestudent_id,
				lehreinheit_id,
				tbl_anwesenheit_status.status_kurzbz as status, 
				extension.tbl_anwesenheit.datum as datum
			FROM
				extension.tbl_anwesenheit 
			JOIN extension.tbl_anwesenheit_status ON (tbl_anwesenheit.status = tbl_anwesenheit_status.status_kurzbz)
			
		',
	'requiredPermissions' => 'admin' // TODO: lektor permissions
);
