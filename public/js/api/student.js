import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	async getAll(studiensemester)
	{
		try {
			const result = await CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Student/getAll', { studiensemester: studiensemester });
			return CoreRESTClient.getData(result.data);
		} catch (error) {
			throw error;
		}
	},
	addEntschuldigung(formData)
	{
		try {
			return CoreRESTClient.post('/extensions/FHC-Core-Anwesenheiten/Student/addEntschuldigung',
				formData,
				{Headers: { "Content-Type": "multipart/form-data" }}
			);
		} catch (error) {
			throw error;
		}
	},
	getEntschuldigungen(person_id)
	{
		try {
			return CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Student/getEntschuldigungen');
		} catch (error) {
			throw error;
		}
	},
};