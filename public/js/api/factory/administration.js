export default {

	getEntschuldigungen(stg_kz_arr, von, bis) {

		const params = {stg_kz_arr, von, bis}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getEntschuldigungen';
		return {
			method: 'post',
			url,
			params
		}

	},
	updateEntschuldigung(entschuldigung_id, status, notiz, von, bis) {

		const params = {entschuldigung_id, status, notiz, von, bis}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/updateEntschuldigung';
		return {
			method: 'post',
			url,
			params
		}

	},
	getTimeline(entschuldigung_id, person_id) {
		const params = {entschuldigung_id, person_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getTimeline';
		return {
			method: 'post',
			url,
			params
		}
	}

}