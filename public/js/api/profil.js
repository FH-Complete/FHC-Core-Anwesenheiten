export default {

	async getAllAnw(studiensemester) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/api/ProfileApi/getAllAnw?studiensemester=${studiensemester}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getAllAnwByUID(studiensemester, uid) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/api/ProfileApi/getAllAnwByUID?studiensemester=${studiensemester}&uid=${uid}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getProfileViewData(uid) {
		try {
			const payload = {uid}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/getProfileViewData';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async checkInAnwesenheit(zugangscode) {
		try {
			const payload = {zugangscode}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/checkInAnwesenheit';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async addEntschuldigung(formData) {
		try {
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/addEntschuldigung';
			const headers = {Headers: { "Content-Type": "multipart/form-data" }}
			return this.$fhcApi.post(url, formData, headers)
		} catch (error) {
			throw error;
		}
	},
	async deleteEntschuldigung(entschuldigung_id) {
		try {
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/deleteEntschuldigung';
			const headers = {Headers: { "Content-Type": "multipart/form-data" }}
			return this.$fhcApi.post(url, formData, headers)
		} catch (error) {
			throw error;
		}
	},
	async getEntschuldigungenByPerson() {
		try {
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/getEntschuldigungenByPerson';
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async getEntschuldigungenByPersonID(person_id) {
		try {
			const payload = {person_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/getEntschuldigungenByPersonID';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async getAnwesenheitSumByLva(lv_id, sem_kz, prestudent_id) {
		try {
			const payload = {lv_id, sem_kz, id: prestudent_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/getAnwesenheitSumByLva';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async deleteUserAnwesenheitById(anwesenheit_user_id) {
		try {
			const payload = {anwesenheit_user_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/deleteUserAnwesenheitById';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async deleteUserAnwesenheitByIds(ids) {
		try {
			const payload = {ids}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/ProfileApi/deleteUserAnwesenheitByIds';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	}


}