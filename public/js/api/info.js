import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	async getStudiensemester() {
		try {
			const result = await CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Info/getStudiensemester');
			return CoreRESTClient.getData(result.data);
		} catch (error) {
			throw error;
		}
	},
	async getAktStudiensemester() {
		try {
			const result = await CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Info/getAktStudiensemester');
			return CoreRESTClient.getData(result.data);
		} catch (error) {
			throw error;
		}
	},
};