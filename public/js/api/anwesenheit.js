export default {

	//! API Calls for Anwesenheit Views

	async getAllAnwesenheitenByLektor(ma_uid=null,lv_id=null, sem_kurzbz = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
		`/extensions/FHC-Core-Anwesenheiten/lektor/getAllAnwesenheitenByLektor?ma_uid=${ma_uid}&lv_id=${lv_id}&sem_kurzbz=${sem_kurzbz}`;

		// TODO: parameters not in url but somewhere in request body with a post request
		return axios.get(url);
	},
	async getAllAnwesenheitenByStudentByLva(prestudent_id= null, lva_id = null, sem_kurzbz = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/getAllAnwesenheitenByStudentByLva?prestudent_id=${prestudent_id}&lv_id=${lva_id}&sem_kurzbz=${sem_kurzbz}`;

		return axios.get(url);
	},
	async saveChangedAnwesenheiten(changedAnwesenheiten = []){
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/updateAnwesenheiten`;

		return axios.post(url,{changedAnwesenheiten});
	},
	async getNewQRCode(le_id = null,beginn = null, ende = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/getNewQRCode`;

		return axios.post(url, {le_id, beginn, ende})
	},
	async getExistingQRCode(le_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/getExistingQRCode`;

		return axios.post(url, {le_id})
	},
	async deleteQRCode(le_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/lektor/deleteQRCode`;

		return axios.post(url, {le_id})
	},
	async checkInAnwesenheit(payload) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/student/checkInAnwesenheit`;

		return axios.post(url, payload)
	}
};