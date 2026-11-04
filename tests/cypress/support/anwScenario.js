// Test data through the API and the stored state from the database

import { account } from './accounts';
import { administrationApi, kontrolleApi, profilApi } from './anwApi';
import { dateParam, timeParam } from './anwDates';

/** The stored Kontrolle: { kontrolle, entries, history, codes } */
export const readKontrolle = anwesenheitId => cy.task('anw:db:readKontrolle', { anwesenheitId });

/** The minutes of von - bis ('HH:MM') on date that the server counts: the breaks of the Stunden raster do not count */
export const countedMinutes = (date, von, bis) => cy.task('anw:db:countedMinutes', { date, von, bis });

/** The number of Kontrollen in the test LEs */
export const countKontrollen = ctx => cy.task('anw:db:countKontrollen', { leIds: [ctx.le, ctx.foreignLe] });

/** Deletes the Kontrollen of the test LEs */
export const resetKontrollen = ctx => cy.task('anw:db:resetKontrollen', { leIds: [ctx.le, ctx.foreignLe] });

const personIdsOf = ctx => [
	...new Set(
		[...ctx.students, ...ctx.foreignStudents, ...Object.values(ctx.testStudents), ...ctx.stgStudents].map(
			student => student.personId,
		),
	),
];

/** Deletes the Entschuldigungen of the students of the test LEs, of the test students and of ctx.stgStudents */
export const resetEntschuldigungen = ctx => cy.task('anw:db:resetEntschuldigungen', { personIds: personIdsOf(ctx) });

/** The number of Entschuldigungen of these persons */
export const countEntschuldigungen = ctx => cy.task('anw:db:countEntschuldigungen', { personIds: personIdsOf(ctx) });

/** The stored Entschuldigung: { entschuldigung, history (rows of the person), document (DMS row exists) } */
export const readEntschuldigung = (entschuldigungId, student) =>
	cy.task('anw:db:readEntschuldigung', { entschuldigungId, personId: student.personId });

/** A document for addEntschuldigung and editEntschuldigung. content: the text of the PDF fixture */
export const pdfFile = content => ({ field: 'files', name: 'bestaetigung.pdf', type: 'application/pdf', content });

/**
 * Adds an Entschuldigung for a student (ctx.testStudents.*), as the student by default.
 * von, bis: 'YYYY-MM-DD HH:MM:SS' in the time zone of the server. pdf: the content of the PDF, else no document.
 */
export const addEntschuldigung = (student, { von, bis, pdf = null, as } = {}) => {
	const fields = { von, bis, person_id: student.personId };
	if (!pdf) fields.noFileUpload = 'true';
	return profilApi.addEntschuldigung(fields, pdf && pdfFile(pdf), as || account(student.role));
};

/** Adds an Entschuldigung and yields its stored state of readEntschuldigung */
export const givenEntschuldigung = (student, options) =>
	addEntschuldigung(student, options)
		.fhcData()
		.then(({ entschuldigung_id }) => readEntschuldigung(entschuldigung_id, student));

/**
 * An open Entschuldigung through the database, for a student outside the Studiengaenge of the staff accounts:
 * the API lets nobody of the suite create it. Yields the stored state of readEntschuldigung
 */
export const seedEntschuldigung = (ctx, student, { von, bis }) =>
	cy
		.task('anw:db:seedEntschuldigung', { personId: student.personId, personIds: personIdsOf(ctx), von, bis })
		.then(entschuldigungId => readEntschuldigung(entschuldigungId, student));

/**
 * Accepts (true) or declines (false) an Entschuldigung, as ENT_ASSISTENZ by default. The id goes as a string like in
 * AssistenzComponent: isEmptyString rejects the integers 9 to 13 and 32 on PHP 7.0 (ctype_space reads them as ASCII)
 */
export const decide = (entschuldigungId, status, { notiz = '', as } = {}) =>
	administrationApi
		.updateEntschuldigung(String(entschuldigungId), status, notiz, as || account('ENT_ASSISTENZ'))
		.fhcData();

/**
 * Creates a Kontrolle, by default as LEKTOR on ctx.le today from 08:00 to 09:30 without a QR code.
 * Yields the stored state of readKontrolle plus the code of a QR Kontrolle.
 */
export const givenKontrolle = (ctx, { date = ctx.today, von = '08:00', bis = '09:30', qr = false, le = ctx.le, as } = {}) => {
	const create = qr ? kontrolleApi.getNewQRCode : kontrolleApi.insertAnwWithoutQR;

	return create(le, dateParam(date), timeParam(von), timeParam(bis), as || account('LEKTOR'))
		.fhcData()
		.then(data => {
			const kontrolle = qr ? data.kontrolle : data[0];
			return readKontrolle(kontrolle.anwesenheit_id).then(state => ({ ...state, code: qr ? data.code : null }));
		});
};

/** The entry of a student (ctx.testStudents.*) in the state of readKontrolle */
export const entryOf = (state, student) => {
	const entry = state.entries.find(e => e.prestudent_id === student.prestudentId);
	expect(entry, `entry of ${student.role} in Kontrolle ${state.kontrolle.anwesenheit_id}`).to.exist;
	return entry;
};

/** Sets the status of entries as LEKTOR. entries: [{ anwesenheit_user_id, status, fehlminuten, notiz }] */
export const givenStatus = (ctx, entries, { le = ctx.le, as } = {}) =>
	kontrolleApi.updateAnwesenheiten(le, entries, as || account('LEKTOR')).fhcData();
