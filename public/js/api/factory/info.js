export default {
	getAktuellesSemester() {
		
		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getAktuellesSemester';
		return {
			method: 'get',
			url
		}
		
	},
	getViewDataStudent() {
		
		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getViewDataStudent';
		return {
			method: 'get',
			url
		}
		
	},
	getEntschuldigungFile(dms_id) {
		
		const params = { dms_id }
		const url = `extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile`;
		return {
			method: 'get',
			url,
			params
		}
		
	},
	getStunden() {
		
		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStunden';
		return {
			method: 'get',
			url
		}
		
	},
	getStudiensemester() {
		
		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudiensemester';
		return {
			method: 'get',
			url
		}
		
	},
	getStudentInfo(prestudent_id, lva_id, sem_kurzbz) {
		
		const params = { prestudent_id, lva_id, sem_kurzbz }
		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudentInfo`;
		return {
			method: 'get',
			url,
			params
		}
		
	},
	getLehreinheitenForLehrveranstaltungAndMaUid(lva_id, ma_uid, sem_kurzbz) {
		
		const params = { lva_id, ma_uid, sem_kurzbz }
		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLehreinheitenForLehrveranstaltungAndMaUid`;
		return {
			method: 'get',
			url,
			params
		}
		
	},
	getStudiengaenge(allowed_stg = [], admin) {
		
		const params = {allowed_stg, admin}
		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudiengaenge`;

		return {
			method: 'post',
			url,
			params
		}

	},
	getLektorsForLvaInSemester(lva_id, sem) {

		const params = { lva_id, sem }
		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLektorsForLvaInSemester`;

		return {
			method: 'get',
			url,
			params
		}
	},
	getStudentsForLvaInSemester(lva_id, sem) {
		
		const params = { lva_id, sem }
		const url = `extensions/FHC-Core-Anwesenheiten/api/InfoApi/getStudentsForLvaInSemester`;

		return {
			method: 'get',
			url,
			params
		}
	},
	getLvViewDataInfo(lv_id) {

		const params = { lv_id }
		const url = 'extensions/FHC-Core-Anwesenheiten/api/InfoApi/getLvViewDataInfo'

		return {
			method: 'post',
			url,
			params
		}
	}
};