export default {

	async getEntschuldigungen(stg_kz_arr, von, bis) {

		const payload = {stg_kz_arr, von, bis}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getEntschuldigungen';
		return this.$fhcApi.post(url, payload, null)

	},
	async updateEntschuldigung(entschuldigung_id, status, notiz) {

		const payload = {entschuldigung_id, status, notiz}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/updateEntschuldigung';
		return this.$fhcApi.post(url, payload, null)

	},


}