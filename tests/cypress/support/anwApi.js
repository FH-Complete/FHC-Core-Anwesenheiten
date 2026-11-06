// The extension API: one function per endpoint, with the method name of the controller.
// account: an object of support/accounts.js, null sends no credentials. Dates and times: support/anwDates.js.

// the path after the entry point: cy.fhcGet and cy.fhcPost of core send it through cis.php
export const API = 'extensions/FHC-Core-Anwesenheiten/api';

const INFO = `${API}/InfoApi`;
const KONTROLLE = `${API}/KontrolleApi`;
const PROFIL = `${API}/ProfilApi`;
const ADMINISTRATION = `${API}/AdministrationApi`;

export const infoApi = {
	getViewPermissions: account => cy.fhcGet(`${INFO}/getViewPermissions`, undefined, account),
};

export const kontrolleApi = {
	fetchAllAnwesenheitenByLvaAssigned: (lv_id, sem_kurzbz, le_id, ma_uid, account) =>
		cy.fhcPost(`${KONTROLLE}/fetchAllAnwesenheitenByLvaAssigned`, { lv_id, sem_kurzbz, le_id, ma_uid }, account),

	fetchAllAnwesenheitenByLva: (lv_id, sem_kurzbz, le_ids, account) =>
		cy.fhcPost(`${KONTROLLE}/fetchAllAnwesenheitenByLva`, { lv_id, sem_kurzbz, le_ids }, account),

	getAllAnwesenheitenByStudentByLva: (prestudent_id, lv_id, sem_kurzbz, account) =>
		cy.fhcGet(`${KONTROLLE}/getAllAnwesenheitenByStudentByLva`, { prestudent_id, lv_id, sem_kurzbz }, account),

	/** changedAnwesenheiten: [{ anwesenheit_user_id, status, fehlminuten, notiz }] */
	updateAnwesenheiten: (le_id, changedAnwesenheiten, account) =>
		cy.fhcPost(`${KONTROLLE}/updateAnwesenheiten`, { le_id, changedAnwesenheiten }, account),

	getNewQRCode: (le_id, datum, beginn, ende, account) =>
		cy.fhcPost(`${KONTROLLE}/getNewQRCode`, { le_id, datum, beginn, ende }, account),

	insertAnwWithoutQR: (le_id, datum, beginn, ende, account) =>
		cy.fhcPost(`${KONTROLLE}/insertAnwWithoutQR`, { le_id, datum, beginn, ende }, account),

	getExistingQRCode: (le_id, account) => cy.fhcPost(`${KONTROLLE}/getExistingQRCode`, { le_id }, account),

	regenerateQRCode: (anwesenheit_id, account) =>
		cy.fhcPost(`${KONTROLLE}/regenerateQRCode`, { anwesenheit_id }, account),

	degenerateQRCode: (anwesenheit_id, zugangscode, account) =>
		cy.fhcPost(`${KONTROLLE}/degenerateQRCode`, { anwesenheit_id, zugangscode }, account),

	restartKontrolle: (le_id, datum, anwesenheit_id, account) =>
		cy.fhcPost(`${KONTROLLE}/restartKontrolle`, { le_id, datum, anwesenheit_id }, account),

	updateKontrolle: (le_id, anwesenheit_id, von, bis, account) =>
		cy.fhcPost(`${KONTROLLE}/updateKontrolle`, { le_id, anwesenheit_id, von, bis }, account),

	deleteQRCode: (anwesenheit_id, lv_id, account) =>
		cy.fhcPost(`${KONTROLLE}/deleteQRCode`, { anwesenheit_id, lv_id }, account),

	deleteAnwesenheitskontrolle: (le_id, date, anwesenheit_id, account) =>
		cy.fhcPost(`${KONTROLLE}/deleteAnwesenheitskontrolle`, { le_id, date, anwesenheit_id }, account),

	pollAnwesenheiten: (anwesenheit_id, lv_id, account) =>
		cy.fhcPost(`${KONTROLLE}/pollAnwesenheiten`, { anwesenheit_id, lv_id }, account),

	getAnwQuoteForPrestudentIds: (ids, lv_id, sem_kurzbz, account) =>
		cy.fhcPost(`${KONTROLLE}/getAnwQuoteForPrestudentIds`, { ids, lv_id, sem_kurzbz }, account),

	getLehreinheitenForLehrveranstaltungAndMaUid: (lva_id, ma_uid, sem_kurzbz, account) =>
		cy.fhcGet(`${KONTROLLE}/getLehreinheitenForLehrveranstaltungAndMaUid`, { lva_id, ma_uid, sem_kurzbz }, account),

	getLehreinheitenForLehrveranstaltung: (lva_id, sem_kurzbz, account) =>
		cy.fhcGet(`${KONTROLLE}/getLehreinheitenForLehrveranstaltung`, { lva_id, sem_kurzbz }, account),
};

export const profilApi = {
	/** uid null: the own data */
	getProfileViewData: (uid, account) => cy.fhcPost(`${PROFIL}/getProfileViewData`, { uid }, account),

	getAllAnwByUID: (studiensemester, uid, person_id, account) =>
		cy.fhcGet(`${PROFIL}/getAllAnwByUID`, { studiensemester, uid, person_id }, account),

	getAllAnwQuotasForLvaByUID: (studiensemester, uid, account) =>
		cy.fhcGet(`${PROFIL}/getAllAnwQuotasForLvaByUID`, { studiensemester, uid }, account),

	getAllAnwesenheitenByStudentByLva: (sem_kurzbz, lv_id, prestudent_id, uid, account) =>
		cy.fhcPost(`${PROFIL}/getAllAnwesenheitenByStudentByLva`, { sem_kurzbz, lv_id, prestudent_id, uid }, account),

	checkInAnwesenheit: (zugangscode, account) => cy.fhcPost(`${PROFIL}/checkInAnwesenheit`, { zugangscode }, account),

	/** form data: fields { von, bis, person_id, noFileUpload }, file { field, name, type, content } or null */
	addEntschuldigung: (fields, file, account) => cy.fhcUpload(`${PROFIL}/addEntschuldigung`, fields, file, account),

	/** form data: fields { person_id, entschuldigung_id }, file { field, name, type, content } */
	editEntschuldigung: (fields, file, account) => cy.fhcUpload(`${PROFIL}/editEntschuldigung`, fields, file, account),

	deleteEntschuldigung: (entschuldigung_id, person_id, account) =>
		cy.fhcPost(`${PROFIL}/deleteEntschuldigung`, { entschuldigung_id, person_id }, account),

	getEntschuldigungenByPersonID: (person_id, account) =>
		cy.fhcPost(`${PROFIL}/getEntschuldigungenByPersonID`, { person_id }, account),

	/** the id parameter is the prestudent_id */
	getAnwesenheitSumByLva: (lv_id, sem_kz, prestudent_id, account) =>
		cy.fhcPost(`${PROFIL}/getAnwesenheitSumByLva`, { lv_id, sem_kz, id: prestudent_id }, account),

	/** person_id null: the own person */
	getTimeline: (person_id, account) => cy.fhcPost(`${PROFIL}/getTimeline`, { person_id }, account),
};

export const administrationApi = {
	getEntschuldigungen: (stg_kz_arr, von, bis, nurOffene, account) =>
		cy.fhcPost(`${ADMINISTRATION}/getEntschuldigungen`, { stg_kz_arr, von, bis, nurOffene }, account),

	getOffeneTimespan: (stg_kz_arr, von, bis, account) =>
		cy.fhcPost(`${ADMINISTRATION}/getOffeneTimespan`, { stg_kz_arr, von, bis }, account),

	/** status: true accepts, false declines. range: { von, bis } of the edit modal, else the range stays */
	updateEntschuldigung: (entschuldigung_id, status, notiz, account, range = {}) =>
		cy.fhcPost(`${ADMINISTRATION}/updateEntschuldigung`, { entschuldigung_id, status, notiz, ...range }, account),

	getTimeline: (person_id, account) => cy.fhcPost(`${ADMINISTRATION}/getTimeline`, { person_id }, account),
};

// every AdministrationApi endpoint with its HTTP method, for the role matrix
export const ADMINISTRATION_ENDPOINTS = ['getEntschuldigungen', 'getOffeneTimespan', 'updateEntschuldigung', 'getTimeline'].map(
	name => ({ method: 'POST', name, url: `${ADMINISTRATION}/${name}` }),
);

// every ProfilApi endpoint with its HTTP method, for the role matrix
export const PROFIL_ENDPOINTS = [
	['POST', 'getProfileViewData'],
	['GET', 'getAllAnwByUID'],
	['GET', 'getAllAnwQuotasForLvaByUID'],
	['POST', 'addEntschuldigung'],
	['POST', 'editEntschuldigung'],
	['POST', 'deleteEntschuldigung'],
	['POST', 'getEntschuldigungenByPersonID'],
	['POST', 'checkInAnwesenheit'],
	['POST', 'getAnwesenheitSumByLva'],
	['POST', 'getAllAnwesenheitenByStudentByLva'],
	['POST', 'getTimeline'],
].map(([method, name]) => ({ method, name, url: `${PROFIL}/${name}` }));

// every KontrolleApi endpoint with its HTTP method, for the role matrix
export const KONTROLLE_ENDPOINTS = [
	['POST', 'fetchAllAnwesenheitenByLvaAssigned'],
	['POST', 'fetchAllAnwesenheitenByLva'],
	['GET', 'getAllAnwesenheitenByStudentByLva'],
	['POST', 'updateAnwesenheiten'],
	['POST', 'regenerateQRCode'],
	['POST', 'degenerateQRCode'],
	['POST', 'getNewQRCode'],
	['POST', 'insertAnwWithoutQR'],
	['POST', 'restartKontrolle'],
	['POST', 'updateKontrolle'],
	['POST', 'getExistingQRCode'],
	['POST', 'deleteQRCode'],
	['POST', 'deleteAnwesenheitskontrolle'],
	['POST', 'pollAnwesenheiten'],
	['POST', 'getAnwQuoteForPrestudentIds'],
	['GET', 'getLehreinheitenForLehrveranstaltungAndMaUid'],
	['GET', 'getLehreinheitenForLehrveranstaltung'],
].map(([method, name]) => ({ method, name, url: `${KONTROLLE}/${name}` }));
