export default {
	getAllAnwQuotasForLvaByUID(studiensemester, uid) {

		const params = { studiensemester, uid }
		const url = `extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getAllAnwQuotasForLvaByUID`//?studiensemester=${studiensemester}&uid=${uid}`;

		return {
			method: 'get',
			url,
			params
		}
		
	},
	getAllAnwByUID(studiensemester, uid, person_id) {

		const url = `extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getAllAnwByUID?studiensemester=${studiensemester}&uid=${uid}&person_id=${person_id}`;

		return {
			method: 'get',
			url,
			params
		}
		
	},
	getProfileViewData(uid) {

		const payload = {uid}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getProfileViewData';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	checkInAnwesenheit(zugangscode) {

		const params = {zugangscode}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/checkInAnwesenheit';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	addEntschuldigung(formData) {

		const params = formData;
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/addEntschuldigung';
		const headers = {Headers: { "Content-Type": "multipart/form-data" }}

		return {
			method: 'post',
			url,
			params,
			headers
		}
		
	},
	editEntschuldigung(formData) {
		const params = formData
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/editEntschuldigung';
		const headers = {Headers: { "Content-Type": "multipart/form-data" }}

		return {
			method: 'post',
			url,
			params,
			headers
		}
		
	},
	deleteEntschuldigung(entschuldigung_id, person_id) {

		const params = {entschuldigung_id, person_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/deleteEntschuldigung';
		const headers = {Headers: { "Content-Type": "multipart/form-data" }}

		return {
			method: 'post',
			url,
			params,
			headers
		}
		
	},
	getEntschuldigungenByPersonID(person_id) {

		const params = {person_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getEntschuldigungenByPersonID';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	getAnwesenheitSumByLva(lv_id, sem_kz, prestudent_id) {

		const params = {lv_id, sem_kz, id: prestudent_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getAnwesenheitSumByLva';
		// return this.$fhcApi.post(url, payload, null)

		return {
			method: 'post',
			url,
			params
		}
		
	},
	getAnwesenheitenByLva(sem_kurzbz, lv_id, prestudent_id, uid) {

		const params = {sem_kurzbz, lv_id, prestudent_id, uid}
		const url = `extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getAllAnwesenheitenByStudentByLva`;

		return {
			method: 'post',
			url,
			params
		}
		
	}
}