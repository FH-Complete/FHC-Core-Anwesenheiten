export default {

	//! API Calls for Anwesenheit Views

	selectAnwesenheitenByLektor: function(ma_uid=null) {
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extension/FHC-Core-Anwesenheiten/controllers/Lektoren/selectAnwesenheitenByLektor?ma_uid=${ma_uid}`;

		return axios.get(url);
	},

};