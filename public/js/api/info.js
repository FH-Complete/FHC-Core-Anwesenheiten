export default {
	async getAktuellesSemester() {
		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getAktuellesSemester';
		return this.$fhcApi.get(url, null, null)
	},
	async getEntschuldigungFile(dms_id) {

		const url = `extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile?dms_id=${dms_id}`;
		return this.$fhcApi.get(url, null, null)

	},
	async getStunden() {

		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStunden';
		return this.$fhcApi.get(url, null, null)

	},
	async getStudiensemester() {

		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudiensemester';
		return this.$fhcApi.get(url, null, null)

	},
	async getStudentInfo(prestudent_id, lva_id, sem_kurzbz) {

		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudentInfo?prestudent_id=${prestudent_id}&lva_id=${lva_id}&sem_kurzbz=${sem_kurzbz}`;
		return this.$fhcApi.get(url, null, null)

	},
	async getLehreinheitenForLehrveranstaltungAndMaUid(lva_id, ma_uid, sem_kurzbz) {

		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLehreinheitenForLehrveranstaltungAndMaUid?lva_id=${lva_id}&ma_uid=${ma_uid}&sem_kurzbz=${sem_kurzbz}`;
		return this.$fhcApi.get(url, null, null)

	},
	async getStudiengaenge(allowed_stg = [], admin) {

		const payload = {allowed_stg, admin}
		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudiengaenge`;
		return this.$fhcApi.post(url, payload, null)

	},
	async getLektorsForLvaInSemester(lva_id, sem) {

		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLektorsForLvaInSemester?lva_id=${lva_id}&sem=${sem}`;
		return this.$fhcApi.get(url, null, null)

	},
	async getStudentsForLvaInSemester(lva_id, sem) {

		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudentsForLvaInSemester?lva_id=${lva_id}&sem=${sem}`;
		return this.$fhcApi.get(url, null, null)

	},
	async getLvViewDataInfo(lv_id) {

		const payload = {lv_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLvViewDataInfo'
		return this.$fhcApi.post(url, payload, null)

	}
};