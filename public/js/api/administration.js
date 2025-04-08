export default {

	async getEntschuldigungen(stg_kz_arr, von, bis) {

		const payload = {stg_kz_arr, von, bis}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getEntschuldigungen';
		return this.$fhcApi.post(url, payload, null)

	},
	async updateEntschuldigung(entschuldigung_id, status, notiz, von, bis) {

		const payload = {entschuldigung_id, status, notiz, von, bis}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/updateEntschuldigung';
		return this.$fhcApi.post(url, payload, null)

	},
	async getTimeline(entschuldigung_id, person_id) {
		const payload = {entschuldigung_id, person_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getTimeline';
		return this.$fhcApi.post(url, payload, null)
	}

}