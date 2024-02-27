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
	async getLehreinheitAndLektorInfo(le_ids, ma_uid, date) {
		try {
			return await CoreRESTClient.post(`
				/extensions/FHC-Core-Anwesenheiten/Api/
				infoGetLehreinheitAndLektorInfo
			`, {le_ids, ma_uid, date});

		} catch (error) {
			throw error;
		}
	},
	async getStudentInfo(prestudent_id, lva_id, sem_kurzbz) {
		try {
			const result = await CoreRESTClient.get(`
				/extensions/FHC-Core-Anwesenheiten/Api/
				infoGetStudentInfo?prestudent_id=${prestudent_id}&lva_id=${lva_id}&sem_kurzbz=${sem_kurzbz}
			`);

			return result;
		} catch (error) {
			throw error;
		}
	}
};