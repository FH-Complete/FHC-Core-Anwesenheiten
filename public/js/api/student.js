import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	async getAll(studiensemester)
	{
		try {
			return await CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/student/getAll', { studiensemester: studiensemester });
		} catch (error) {
			throw error;
		}
	},
	addEntschuldigung(formData)
	{
		try {
			return CoreRESTClient.post('/extensions/FHC-Core-Anwesenheiten/student/addEntschuldigung',
				formData,
				{Headers: { "Content-Type": "multipart/form-data" }}
			);
		} catch (error) {
			throw error;
		}
	},
	getEntschuldigungenByPerson(person_id)
	{
		try {
			return CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/student/getEntschuldigungenByPerson');
		} catch (error) {
			throw error;
		}
	},
	deleteEntschuldigung(entschuldigung_id)
	{
		try {
			return CoreRESTClient.post('/extensions/FHC-Core-Anwesenheiten/student/deleteEntschuldigung',
				{'entschuldigung_id': entschuldigung_id}
			);
		} catch (error) {
			throw error;
		}
	},
};