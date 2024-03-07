import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	async getAll(studiensemester)
	{
		try {

			return await CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Api/studentGetAll', { studiensemester: studiensemester });
		} catch (error) {
			throw error;
		}
	},
	addEntschuldigung(formData)
	{
		try {
			return CoreRESTClient.post('/extensions/FHC-Core-Anwesenheiten/Api/studentAddEntschuldigung',
				formData,
				{Headers: { "Content-Type": "multipart/form-data" }}
			);
		} catch (error) {
			throw error;
		}
	},
	getEntschuldigungenByPerson()
	{
		try {
			return CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Api/studentGetEntschuldigungenByPerson');
		} catch (error) {
			throw error;
		}
	},
	deleteEntschuldigung(entschuldigung_id)
	{
		try {
			return CoreRESTClient.post('/extensions/FHC-Core-Anwesenheiten/Api/studentDeleteEntschuldigung',
				{'entschuldigung_id': entschuldigung_id}
			);
		} catch (error) {
			throw error;
		}
	},
	async getAnwesenheitSumByLva(id, lv_id, sem_kz){
		const url = FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+
			`/extensions/FHC-Core-Anwesenheiten/Api/studentGetAnwesenheitSumByLva`;

		return axios.post(url,{id, lv_id, sem_kz});
	},
};