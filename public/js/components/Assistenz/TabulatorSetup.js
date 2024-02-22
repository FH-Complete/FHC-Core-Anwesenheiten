import { anwesenheitFormatter } from "../../mixins/formatters";



function formAction(cell)
{
	var link = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router + '/extensions/FHC-Core-Anwesenheiten/Student/download?entschuldigung=' + cell.getData().dms_id; //TODO umgestalten

	return "<a href='"+link+"'>Download</a>";
}

function customGroupHeader(value, count, data, group){
	return '<div style="display:flex; justify-content: space-between;">' +
		'<div>' + value + '</div>' +
		'<div style="flex-grow: 1; text-align: right;">Anwesenheit ' + data[0].anwesenheit + '</div>' +
		'</div>';
};



