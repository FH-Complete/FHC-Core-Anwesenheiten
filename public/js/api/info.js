import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	async getStudiensemester() {
		try {
			const result = await CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Api/infoGetStudiensemester');
			return CoreRESTClient.getData(result.data);
		} catch (error) {
			throw error;
		}
	},
	async getAktStudiensemester() {
		try {
			const result = await CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Api/infoGetAktStudiensemester');
			return CoreRESTClient.getData(result.data);
		} catch (error) {
			throw error;
		}
	},
	async getLehreinheitAndLektorData(le_id, ma_uid, date) {
		try {
			const result = await CoreRESTClient.get(`
				/extensions/FHC-Core-Anwesenheiten/Api/
				infoGetLehreinheitAndLektorData?le_id=${le_id}&ma_uid=${ma_uid}&date=${date}
			`);

			return result;
		} catch (error) {
			throw error;
		}
	}
};