export default {
	fetchAllAnwesenheitenByLvaAssigned(lv_id, sem_kurzbz, le_id, ma_uid, date) {
		
		const params = { lv_id, sem_kurzbz, le_id, ma_uid, date} 
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/fetchAllAnwesenheitenByLvaAssigned';
		
		return {
			method: 'post',
			url,
			params
		}
		
	},
	getAllAnwesenheitenByStudentByLva(prestudent_id, lv_id, sem_kurzbz) {
		
		const params = { prestudent_id, lv_id, sem_kurzbz }
		const url = `extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByStudentByLva`;//`?prestudent_id=${prestudent_id}&lv_id=${lv_id}&sem_kurzbz=${sem_kurzbz}`;

		return {
			method: 'get',
			url,
			params
		}

	},
	updateAnwesenheiten(le_id, changedAnwesenheiten) {

		const params = {le_id, changedAnwesenheiten}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/updateAnwesenheiten';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	getExistingQRCode(le_id) {

		const params = {le_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getExistingQRCode';
		
		return {
			method: 'post',
			url,
			params
		}
		
	},
	regenerateQRCode(anwesenheit_id) {

		const params = {anwesenheit_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/regenerateQRCode';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	degenerateQRCode(anwesenheit_id, zugangscode) {

		const params = {anwesenheit_id, zugangscode}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/degenerateQRCode';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	getNewQRCode(le_id, datum, beginn, ende) {

		const params = {le_id, datum, beginn, ende}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getNewQRCode';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	deleteQRCode(anwesenheit_id, lv_id) {

		const params = {anwesenheit_id, lv_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/deleteQRCode';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	deleteAnwesenheitskontrolle(le_id, date) {

		const params = {le_id, date}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/deleteAnwesenheitskontrolle';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	pollAnwesenheiten(anwesenheit_id, lv_id) {

		const params = {anwesenheit_id, lv_id}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/pollAnwesenheiten';

		return {
			method: 'post',
			url,
			params
		}
		
	},
	getAnwQuoteForPrestudentIds(ids, lv_id, sem_kurzbz) {

		const params = {ids, lv_id, sem_kurzbz}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAnwQuoteForPrestudentIds';

		return {
			method: 'post',
			url,
			params
		}
		
	}
	
}