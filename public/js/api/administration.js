export default {

	async getEntschuldigungen(stg_kz_arr) {
		try {
			const payload = {stg_kz_arr}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getEntschuldigungen';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},
	async updateEntschuldigung(entschuldigung_id, status, notiz) {
		try {
			const payload = {entschuldigung_id, status, notiz}
			const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/updateEntschuldigung';
			return this.$fhcApi.post(url, payload, null)
		} catch (error) {
			throw error;
		}
	},


}