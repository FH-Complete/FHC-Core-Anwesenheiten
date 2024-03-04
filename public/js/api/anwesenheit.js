export default {

	// API Calls for Anwesenheit Views

	async getAllAnwesenheitenByLva(lv_id=null, le_ids = [], sem_kurzbz = null) {
		const payload = {lv_id, le_ids, sem_kurzbz}
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
		`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLva`;

		return axios.post(url, payload);
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
	async getNewQRCode(le_ids = [],beginn = null, ende = null, datum) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetNewQRCode`;

		return axios.post(url, {le_ids, beginn, ende, datum})
	},
	async getExistingQRCode(le_ids = [], ma_uid, date) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetExistingQRCode`;

		return axios.post(url, {le_ids, ma_uid, date})
	},
	async deleteQRCode(le_ids = [], anwesenheit_id) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorDeleteQRCode`;

		return axios.post(url, {le_ids, anwesenheit_id})
	},
	async regenerateQR(anwesenheit_id = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorRegenerateQRCode`;

		return axios.post(url, {anwesenheit_id})
	},
	async degenerateQR(anwesenheit_id = null, zugangscode = null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorDegenerateQRCode`;

		return axios.post(url, {anwesenheit_id, zugangscode})
	},
	async checkInAnwesenheit(payload) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/studentCheckInAnwesenheit`;

		return axios.post(url, payload)
	},
	async deleteUserAnwesenheitById(anwesenheit_user_id) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/studentDeleteUserAnwesenheitById`;

		return axios.post(url, {anwesenheit_user_id})
	},
	async deleteAnwesenheitskontrolle(le_ids, date) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/lektorDeleteAnwesenheitskontrolle`;

		return axios.post(url, {le_ids, date})
	}
};