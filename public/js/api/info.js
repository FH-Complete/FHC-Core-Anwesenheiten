export default {
	async getEntschuldigungFile(dms_id) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile?dms_id=${dms_id}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getStudiensemester() {
		try {
			const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudiensemester';
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getStudentInfo(prestudent_id, lva_id, sem_kurzbz) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudentInfo?prestudent_id=${prestudent_id}&lva_id=${lva_id}&sem_kurzbz=${sem_kurzbz}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getLehreinheitenForLehrveranstaltungAndMaUid(lva_id, ma_uid, sem_kurzbz) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLehreinheitenForLehrveranstaltungAndMaUid?lva_id=${lva_id}&ma_uid=${ma_uid}&sem_kurzbz=${sem_kurzbz}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getStudiengaenge(allowed_stg = [], admin) {
		try {
			const payload = {allowed_stg, admin}
			const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudiengaenge`;
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async getLektorsForLvaInSemester(lva_id, sem) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLektorsForLvaInSemester?lva_id=${lva_id}&sem=${sem}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getStudentsForLvaInSemester(lva_id, sem) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudentsForLvaInSemester?lva_id=${lva_id}&sem=${sem}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getLvViewDataInfo(lv_id) {
		try {
			const payload = {lv_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLvViewDataInfo'
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	}
};