export default {

	//! API Calls for Anwesenheit Views

	async getAllAnwesenheitenByLektor(ma_uid=null,lv_id=null, sem_kurzbz = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
		`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLektor?ma_uid=${ma_uid}&lv_id=${lv_id}&sem_kurzbz=${sem_kurzbz}`;

		// TODO: parameters not in url but somewhere in request body with a post request
		return axios.get(url);
	},
	async getAllAnwesenheitenByStudentByLva(prestudent_id= null, lva_id = null, sem_kurzbz = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByStudentByLva?prestudent_id=${prestudent_id}&lv_id=${lva_id}&sem_kurzbz=${sem_kurzbz}`;

		return axios.get(url);
	},
	async saveChangedAnwesenheiten(changedAnwesenheiten = []){
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorUpdateAnwesenheiten`;

		return axios.post(url,{changedAnwesenheiten});
	},
	async getNewQRCode(le_id = null,beginn = null, ende = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetNewQRCode`;

		return axios.post(url, {le_id, beginn, ende})
	},
	async getExistingQRCode(le_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetExistingQRCode`;

		return axios.post(url, {le_id})
	},
	async deleteQRCode(le_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorDeleteQRCode`;

		return axios.post(url, {le_id})
	},
	async checkInAnwesenheit(payload) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/studentCheckInAnwesenheit`;

		return axios.post(url, payload)
	}
};