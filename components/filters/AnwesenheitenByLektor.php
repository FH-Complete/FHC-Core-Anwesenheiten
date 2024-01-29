<?php
$filterCmptArray = array(
	'app' => 'core',
	'datasetName' => 'AnwesenheitenByLektor',
	'query' => '
			SELECT
				anwesenheit_id,
				prestudent_id,
				lehreinheit_id,
				status
			FROM
				extension.tbl_anwesenheit
			
		',
	'requiredPermissions' => 'admin' // TODO: lektor permissions
);
