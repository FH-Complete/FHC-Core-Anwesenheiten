export default {
	async getAllAnwesenheitenByLvaAssigned(lv_id, sem_kurzbz, le_id, ma_uid, date) {

		const payload = {lv_id, sem_kurzbz, le_id, ma_uid, date}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByLvaAssigned';
		return this.$fhcApi.post(url, payload, null)

	},
	async getAllAnwesenheitenByStudentByLva(prestudent_id, lv_id, sem_kurzbz) {

		const url = `extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByStudentByLva?prestudent_id=${prestudent_id}&lv_id=${lv_id}&sem_kurzbz=${sem_kurzbz}`;
		return this.$fhcApi.get(url, null, null)

	},
	async updateAnwesenheiten(le_id, changedAnwesenheiten) {

		const payload = {le_id, changedAnwesenheiten}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/updateAnwesenheiten';
		return this.$fhcApi.post(url, payload, null)

	},
	async getExistingQRCode(le_id) {

		const payload = {le_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getExistingQRCode';
		return this.$fhcApi.post(url, payload, null)

	},
	async regenerateQRCode(anwesenheit_id) {

		const payload = {anwesenheit_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/regenerateQRCode';
		return this.$fhcApi.post(url, payload, null)

	},
	async degenerateQRCode(anwesenheit_id, zugangscode) {

		const payload = {anwesenheit_id, zugangscode}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/degenerateQRCode';
		return this.$fhcApi.post(url, payload, null)

	},
	async getNewQRCode(le_id, datum, beginn, ende) {

		const payload = {le_id, datum, beginn, ende}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getNewQRCode';
		return this.$fhcApi.post(url, payload, null)

	},
	async deleteQRCode(anwesenheit_id, lva_id) {

		const payload = {anwesenheit_id, lva_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/deleteQRCode';
		return this.$fhcApi.post(url, payload, null)

	},
	async deleteAnwesenheitskontrolle(le_id, date) {

		const payload = {le_id, date}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/deleteAnwesenheitskontrolle';
		return this.$fhcApi.post(url, payload, null)

	},
	async pollAnwesenheiten(anwesenheit_id, lv_id) {

		const payload = {anwesenheit_id, lv_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/pollAnwesenheiten';
		return this.$fhcApi.post(url, payload, null)

	},
	async getAnwQuoteForPrestudentIds(ids, lv_id, sem_kurzbz) {

		const payload = {ids, lv_id, sem_kurzbz}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAnwQuoteForPrestudentIds';
		return this.$fhcApi.post(url, payload, null)

	}
	
}