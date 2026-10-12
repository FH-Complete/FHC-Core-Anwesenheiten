// test data of the run, created through the extension API as admin. anw_r_full_assistenz has no date limits for
// Kontrollen and Entschuldigungen in the past, so the data can lie in the semester of the LV.
// 1. reset: the Kontrollen of the LV and the Entschuldigungen of its students that the run accounts created.
//    Other data of the dump stays.
// 2. weekly Kontrollen, statuses, Fehlminuten and notes; a few Kontrollen in the LV-Teil of a colleague.
// 3. Entschuldigungen in every status: offen with and without document, akzeptiert, abgelehnt.
// png/seed.json lists the result

import { API, state, users, api, apiStaff, dataOf, postMultipart } from './api.js'

export const STATUS = { anwesend: 'anwesend', abwesend: 'abwesend', fehlminuten: 'fehlminuten', entschuldigt: 'entschuldigt' }

const pad = n => String(n).padStart(2, '0')
export const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const deDate = d => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const fromDe = s => { const [d, m, y] = s.split('.').map(Number); return new Date(y, m - 1, d) }
const dateParam = d => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() })
const timeParam = hhmm => { const [h, m] = hhmm.split(':').map(Number); return { hours: h, minutes: m, seconds: 0 } }

const KONTROLLEN = 6
const MAIN_TIME = ['09:00', '10:30']
const SECOND_TIME = ['11:00', '12:30'] // a second Kontrolle on the last day: several per day are allowed
const FOREIGN_TIME = ['13:00', '14:30']

// weekly Mondays, three weeks after the start of the semester of the LV
function kontrollDates() {
	const sem = (state.semesterData?.[0] || []).find(s => s.studiensemester_kurzbz === state.lv.sem_kurzbz)
	let day = sem ? new Date(sem.start + 'T00:00:00') : addDays(new Date(), -60)
	day = addDays(day, 21)
	while (day.getDay() !== 1) day = addDays(day, 1)
	return [...Array(KONTROLLEN)].map((_, i) => addDays(day, 7 * i))
}

const lektorState = leIds => api('admin', 'POST', `${API}/KontrolleApi/fetchAllAnwesenheitenByLva`,
	{ lv_id: state.lv.lv_id, sem_kurzbz: state.lv.sem_kurzbz, le_ids: leIds }).then(body => body.data)

function insertKontrolle(leId, date, [von, bis]) {
	return api('admin', 'POST', `${API}/KontrolleApi/insertAnwWithoutQR`,
		{ le_id: leId, datum: dateParam(date), beginn: timeParam(von), ende: timeParam(bis) })
}

// ---------- 1. reset ----------

function reset(leIds, persons, report) {
	const runUids = Object.values(state.uids)

	lektorState(leIds).then(data => {
		const own = (data.kontrollen || []).filter(k => runUids.includes(String(k.insertvon).toLowerCase()))
		report.deletedKontrollen = own.length
		cy.wrap(own).each(k => api('admin', 'POST', `${API}/KontrolleApi/deleteAnwesenheitskontrolle`,
			{ le_id: k.lehreinheit_id, date: dateParam(fromDe(k.datum)), anwesenheit_id: k.anwesenheit_id }))
	})

	// the API deletes only open Entschuldigungen (checkZuordnung: akzeptiert IS NULL) and cannot set a decided one
	// back to open. The decided ones of the last run stay, the seed reuses them: their dates follow the semester start
	report.deletedEntschuldigungen = 0
	state.seed.decided = []
	cy.wrap(persons).each(person_id => {
		api('admin', 'POST', `${API}/ProfilApi/getEntschuldigungenByPersonID`, { person_id }).then(body => {
			const own = (dataOf(body) || []).filter(e => runUids.includes(String(e.insertvon).toLowerCase()))
			const open = own.filter(e => e.akzeptiert === null || e.akzeptiert === undefined)
			state.seed.decided.push(...own.filter(e => !open.includes(e)))
			report.deletedEntschuldigungen += open.length
			cy.wrap(open).each(e => api('admin', 'POST', `${API}/ProfilApi/deleteEntschuldigung`,
				{ entschuldigung_id: e.entschuldigung_id, person_id }))
		})
	})
}

const isAccepted = value => value === true || value === 't'

// a decided Entschuldigung of the last run with the same person, day and decision
function keptDecision(person_id, range, accepted) {
	return state.seed.decided.find(e => String(e.person_id) === String(person_id)
		&& String(e.von).startsWith(range.von.slice(0, 10)) && isAccepted(e.akzeptiert) === accepted)
}

// ---------- 2. Kontrollen and statuses ----------

// a fixed pattern, so every run shows the same picture. The student with the login gets a
// Fehlminuten entry and the abwesend entries the Entschuldigungen cover later
function statusChanges(data, mainPrestudentId) {
	const students = [...data.students].sort((a, b) => a.nachname.localeCompare(b.nachname))
	const kontrollen = [...data.kontrollen].sort((a, b) => fromDe(a.datum) - fromDe(b.datum) || a.von.localeCompare(b.von))
	const changes = []

	students.forEach((st, i) => {
		const main = String(st.prestudent_id) === String(mainPrestudentId)
		kontrollen.forEach((k, ki) => {
			const entry = data.anwEntries.find(e => e.prestudent_id == st.prestudent_id && e.anwesenheit_id == k.anwesenheit_id)
			// a new Kontrolle takes over an accepted Entschuldigung of the last run, the pattern keeps that status
			if (!entry || entry.status === STATUS.entschuldigt) return
			let change = null
			if (main) {
				if (ki === 1) change = { status: STATUS.fehlminuten, fehlminuten: 20, notiz: 'Verspätung' }
				if (ki === 3 || ki === 4 || ki === 5) change = { status: STATUS.abwesend }
			} else if ((i * 3 + ki) % 7 === 4) {
				change = { status: STATUS.abwesend }
			} else if ((i + ki) % 6 === 2) {
				change = { status: STATUS.fehlminuten, fehlminuten: [15, 20, 30][(i + ki) % 3], notiz: ['Verspätung', 'Früher gegangen'][(i + ki) % 2] }
			} else if (i === 0 && ki === 0) {
				change = { status: STATUS.anwesend, notiz: 'Laborübung nachgeholt' }
			}
			if (change) changes.push({ anwesenheit_user_id: entry.anwesenheit_user_id, ...change })
		})
	})
	return { students, kontrollen, changes }
}

function seedLe(leId, dates, times, mainPrestudentId, report) {
	cy.wrap(dates).each(date => insertKontrolle(leId, date, times))
	if (leId === state.lv.student.lehreinheit_id) insertKontrolle(leId, dates[dates.length - 1], SECOND_TIME)

	return lektorState([leId]).then(data => {
		const { students, kontrollen, changes } = statusChanges(data, mainPrestudentId)
		report.les.push({ le_id: leId, kontrollen: kontrollen.length, students: students.length, changes: changes.length })
		if (changes.length) api('admin', 'POST', `${API}/KontrolleApi/updateAnwesenheiten`, { le_id: leId, changedAnwesenheiten: changes })
		return cy.wrap({ students, kontrollen })
	})
}

// ---------- 3. Entschuldigungen ----------

const dayRange = (from, to = from) => ({ von: `${isoDate(from)} 00:00:00`, bis: `${isoDate(to)} 23:59:00` })

function addEntschuldigung(person_id, range, pdf) {
	const fields = { ...range, person_id }
	if (!pdf) fields.noFileUpload = 'true'
	return postMultipart('admin', `${API}/ProfilApi/addEntschuldigung`, fields,
		pdf && { name: 'aerztliche_bestaetigung.pdf', type: 'application/pdf', content: pdf })
		.then(body => body.data.entschuldigung_id)
}

function decide(entschuldigung_id, status, notiz = '') {
	return apiStaff('POST', `${API}/AdministrationApi/updateEntschuldigung`, { entschuldigung_id, status, notiz })
}

// ---------- run ----------

export function seed() {
	const report = { les: [], entschuldigungen: [] }
	const lv = state.lv
	const dates = kontrollDates()
	const today = new Date()

	// every LV-Teil of the LV; the colleague's one feeds "Weitere LV-Teile" and the Gesamtansicht
	api('admin', 'GET', `${API}/KontrolleApi/getLehreinheitenForLehrveranstaltung`, { lva_id: lv.lv_id, sem_kurzbz: lv.sem_kurzbz }).then(body => {
		const rows = body.data?.[0] || []
		const leIds = [...new Set(rows.map(r => r.lehreinheit_id))]
		const ownLeIds = new Set(rows.filter(r => r.mitarbeiter_uid === state.uids.lektor).map(r => r.lehreinheit_id))
		state.seed = {
			dates,
			mainLe: lv.student.lehreinheit_id,
			foreignLe: leIds.find(id => !ownLeIds.has(id)) ?? null,
			leIds
		}
		report.leIds = leIds
		report.foreignLe = state.seed.foreignLe

		apiStaff('GET', `${API}/InfoApi/getStudentsForLvaInSemester`, { lva_id: lv.lv_id, sem: lv.sem_kurzbz }).then(res => {
			const students = dataOf(res) || []
			state.seed.students = students
			// the second test student is in another Studiengang, the Entschuldigungsmanagement lists it too
			api('admin', 'POST', `${API}/ProfilApi/getProfileViewData`, { uid: users.student2.username }).then(profile => {
				state.seed.student2 = (dataOf(profile) || [])[0] ?? null
				const persons = [...new Set([...students.map(s => s.person_id), state.seed.student2?.person_id].filter(Boolean))]
				reset(leIds, persons, report)
			})
		})
	})

	cy.then(() => {
		const { mainLe, foreignLe } = state.seed
		seedLe(mainLe, dates, MAIN_TIME, lv.student.prestudent_id, report).then(main => { state.seed.main = main })
		if (foreignLe) seedLe(foreignLe, dates.slice(0, 3), FOREIGN_TIME, null, report)
	})

	// Entschuldigungen: the student with the login has one in every status, two classmates and the second test student add rows
	cy.readFile('fixtures/entschuldigung.pdf', 'binary').then(pdf => {
		const main = state.seed.main
		const s = lv.student
		const others = main.students.filter(st => String(st.prestudent_id) !== String(s.prestudent_id))
		const kDate = i => fromDe(main.kontrollen[i].datum)
		const personOf = st => state.seed.students.find(x => String(x.prestudent_id) === String(st.prestudent_id))?.person_id
		const statusName = decision => decision === undefined ? 'offen' : decision ? 'akzeptiert' : 'abgelehnt'
		// decision: undefined stays open, true accepts, false declines
		const add = (who, person_id, range, withPdf, decision) => {
			if (!person_id) return
			const kept = decision !== undefined && keptDecision(person_id, range, decision)
			if (kept) {
				report.entschuldigungen.push({ who, id: kept.entschuldigung_id, ...range, status: statusName(decision), kept: true })
				return
			}
			addEntschuldigung(person_id, range, withPdf ? pdf : null).then(id => {
				const entry = { who, id, ...range, status: 'offen', document: withPdf }
				report.entschuldigungen.push(entry)
				if (decision === undefined) return
				decide(id, decision, decision ? '' : 'Bestätigung nicht lesbar').then(() => { entry.status = statusName(decision) })
			})
		}

		add(s.uid, s.person_id, dayRange(kDate(4)), true, true)
		add(s.uid, s.person_id, dayRange(kDate(5)), true, false)
		add(s.uid, s.person_id, dayRange(today, addDays(today, 1)), false)
		if (others[1]) add(others[1].uid ?? others[1].nachname, personOf(others[1]), dayRange(kDate(2)), true)
		if (others[2]) add(others[2].uid ?? others[2].nachname, personOf(others[2]), dayRange(kDate(3)), true, true)
		if (state.seed.student2) add(users.student2.username, state.seed.student2.person_id, dayRange(today), true)
	})

	cy.then(() => cy.writeFile('png/seed.json', report))
}
