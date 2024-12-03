export default {
	async getAllAnwQuotasForLvaByUID(studiensemester, uid) {
		
		const url = `extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getAllAnwQuotasForLvaByUID?studiensemester=${studiensemester}&uid=${uid}`;
		return this.$fhcApi.get(url, null, null)
		
	},
	async getAllAnwByUID(studiensemester, uid, person_id) {

		const url = `extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getAllAnwByUID?studiensemester=${studiensemester}&uid=${uid}&person_id=${person_id}`;
		return this.$fhcApi.get(url, null, null)

	},
	async getProfileViewData(uid) {

		const payload = {uid}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getProfileViewData';
		return this.$fhcApi.post(url, payload, null)

	},
	async checkInAnwesenheit(zugangscode) {

		const payload = {zugangscode}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/checkInAnwesenheit';
		return this.$fhcApi.post(url, payload, null)

	},
	async addEntschuldigung(formData) {

		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/addEntschuldigung';
		const headers = {Headers: { "Content-Type": "multipart/form-data" }}
		return this.$fhcApi.post(url, formData, headers)

	},
	async deleteEntschuldigung(entschuldigung_id) {

		const payload = {entschuldigung_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/deleteEntschuldigung';
		const headers = {Headers: { "Content-Type": "multipart/form-data" }}
		return this.$fhcApi.post(url, payload, headers)

	},
	async getEntschuldigungenByPersonID(person_id) {

		const payload = {person_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getEntschuldigungenByPersonID';
		return this.$fhcApi.post(url, payload, null)

	},
	async getAnwesenheitSumByLva(lv_id, sem_kz, prestudent_id) {

		const payload = {lv_id, sem_kz, id: prestudent_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getAnwesenheitSumByLva';
		return this.$fhcApi.post(url, payload, null)

	}
}