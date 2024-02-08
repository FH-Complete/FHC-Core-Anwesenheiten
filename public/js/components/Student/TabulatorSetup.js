function customGroupHeader(value, count, data, group){
	return '<div style="display:flex; justify-content: space-between;">' +
		'<div>' + value + '</div>' +
		'<div style="flex-grow: 1; text-align: right;">Anwesenheit ' + data[0].anwesenheit + '</div>' +
		'</div>';
};

function formDownload(cell)
{
	var link = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router + '/extensions/FHC-Core-Anwesenheiten/Student/download?entschuldigung=' + cell.getData().dms_id; //TODO umgestalten

	return "<a href='"+link+"'>Download</a>";
}
export const studentViewTabulatorOptions = {
	height: "100%",
	layout: 'fitColumns',
	selectable: false,
	placeholder: "Keine Daten verfügbar",
	columns: [
		{title: 'Lehrveranstaltung'},
		{title: 'Datum', field: 'datum'},
		{title: 'Anwesend', field: 'status'},
	],
	groupBy: ['bezeichnung'],
	groupHeader: customGroupHeader
};

export const entschuldigungsViewTabulatorOptions = {
	layout: 'fitColumns',
	selectable: false,
	placeholder: "Keine Daten verfügbar",
	maxHeight: "200px",
	columns: [
		{title: 'Download', field: 'dms_id', formatter: formDownload},
		{title: 'Status', field: 'bezeichnung'},
		{title: 'Von', field: 'von'},
		{title: 'Bis', field: 'von'},
	],
};


