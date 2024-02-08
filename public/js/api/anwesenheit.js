export default {

	//! API Calls for Anwesenheit Views

	getAllAnwesenheitenByLektor: function(ma_uid=null,lv_id=null, sem_kurzbz = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
		`/extensions/FHC-Core-Anwesenheiten/lektor/getAllAnwesenheitenByLektor?ma_uid=${ma_uid}&lv_id=${lv_id}&sem_kurzbz=${sem_kurzbz}`;

		// TODO: parameters not in url but somewhere in request body with a post request
		return axios.get(url);
	},
	getAllAnwesenheitenByStudentByLva: function(prestudent_id= null, lva_id = null, sem_kurzbz = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/getAllAnwesenheitenByStudentByLva?prestudent_id=${prestudent_id}&lv_id=${lva_id}&sem_kurzbz=${sem_kurzbz}`;

		return axios.get(url);
	},
	saveChangedAnwesenheiten(){

	}
};