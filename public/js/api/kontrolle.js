export default {
	async getAllAnwesenheitenByLvaAssigned(lv_id, sem_kurzbz, le_id) {
		try {
			const payload = {}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByLvaAssigned';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async getAllAnwesenheitenByStudentByLva(prestudent_id, lv_id, sem_kurzbz) {
		try {
			const url = `extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByStudentByLva?prestudent_id=${prestudent_id}&lv_id=${lv_id}&sem_kurzbz=${sem_kurzbz}`;
			return this.$fhcApi.get(url, null, null)
		} catch (error) {
			throw error;
		}
	},
	async updateAnwesenheiten(le_id, changedAnwesenheiten) {
		try {
			const payload = {le_id, changedAnwesenheiten}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/updateAnwesenheiten';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async getExistingQRCode(le_id) {
		try {
			const payload = {le_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getExistingQRCode';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async regenerateQRCode(anwesenheit_id) {
		try {
			const payload = {anwesenheit_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/regenerateQRCode';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async degenerateQRCode(anwesenheit_id, zugangscode) {
		try {
			const payload = {anwesenheit_id, zugangscode}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/degenerateQRCode';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async getNewQRCode(le_id, datum, beginn, ende) {
		try {
			const payload = {le_id, datum, beginn, ende}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getNewQRCode';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async deleteQRCode(anwesenheit_id) {
		try {
			const payload = {anwesenheit_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/deleteQRCode';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async deleteAnwesenheitskontrolle(le_id, date) {
		try {
			const payload = {le_id, date}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/deleteAnwesenheitskontrolle';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async pollAnwesenheiten(anwesenheit_id) {
		try {
			const payload = {anwesenheit_id}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/pollAnwesenheiten';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async getAllAnwesenheitenByStudiengang(stg_kz, sem_kurzbz) {
		try {
			const payload = {stg_kz, sem_kurzbz}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByStudiengang';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async getAllAnwesenheitenByLva(lv_id, sem_kurzbz) {
		try {
			const payload = {lv_id, sem_kurzbz}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByLva';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	
}