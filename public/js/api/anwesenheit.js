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
	saveChangedAnwesenheiten(changedAnwesenheiten = []){
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/updateAnwesenheiten`;

		return axios.post(url,{changedAnwesenheiten});
	},
	getNewQRCode(le_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/getNewQRCode`;

		return axios.post(url, {le_id})
	},
	getExistingQRCode(le_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/getExistingQRCode`;

		return axios.post(url, {le_id})
	},
	deleteQRCode(le_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/deleteQRCode`;

		return axios.post(url, {le_id})
	},
	checkInAnwesenheit(payload) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/student/checkInAnwesenheit`;

		return axios.post(url, payload)
	}
};