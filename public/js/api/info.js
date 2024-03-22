import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	getStudiensemester() {
		try {
			return CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Api/infoGetStudiensemester');
		} catch (error) {
			throw error;
		}
	},
	getAktStudiensemester() {
		try {
			return CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/Api/infoGetAktStudiensemester');

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
	},
	async getLehreinheitenForLehrveranstaltungAndMaUid(lva_id, ma_uid, sem_kurzbz) {
		try {
			const result = await CoreRESTClient.get(`
				extensions/FHC-Core-Anwesenheiten/Api/
				infoGetLehreinheitenForLehrveranstaltungAndMaUid?lva_id=${lva_id}&ma_uid=${ma_uid}&sem_kurzbz=${sem_kurzbz}
			`);

			return result;
		} catch (error) {
			throw error
		}


	},
	async getLehreinheitenForLehrveranstaltung(lva_id, sem_kurzbz) {
		try {
			const result = await CoreRESTClient.get(`
				extensions/FHC-Core-Anwesenheiten/Api/
				infoGetLehreinheitenForLehrveranstaltung?lva_id=${lva_id}&sem_kurzbz=${sem_kurzbz}
			`);

			return result;
		} catch (error) {
			throw error
		}


	},
	async getPicturesForPrestudentIds(prestudent_ids) {
		try {
			const result = await CoreRESTClient.post(`
				extensions/FHC-Core-Anwesenheiten/Api/
				infoGetPicturesForPrestudentIds
			`, {prestudent_ids});

			return result;
		} catch (error) {
			throw error
		}


	}
};