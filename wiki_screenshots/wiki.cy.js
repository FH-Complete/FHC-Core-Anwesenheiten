// Screenshot suite for wiki_anwesenheit.dokuwiki.txt: every view, dialog and state of the extension, on test data
// the suite creates itself. The file names match the wiki media names (:extension:<name>.png), new names mark screens
// the wiki has no picture for yet. png/index.json lists every screenshot with its section and title.
//
// Setup and run: README.md. Before the run: prepare_cy_db.sql against the test database (permissions, test data the
// API cannot create, checks).
//   npx cypress run --project <extension>/wiki_screenshots
// --env switches:
//   skipPreflight=1    take the screenshots despite failed preflight checks (png/preflight.json)
//   noSeed=1           no reset and no new test data, the screenshots use the data of the last run
//   kontrolleVon=08:00,kontrolleBis=09:30   times of the live Kontrolle today
//
// The run writes into the test database (lib/seed.js): it deletes the Kontrollen and Entschuldigungen the run accounts
// created in the chosen LV, then creates Kontrollen, statuses and Entschuldigungen. The Entschuldigung API sends its
// usual e-mails. Never run it against a production instance.
//
// The suite finds the elements of the extension by their data-cy attribute (byCy in lib/ui.js).
// Keep these attributes when you change a template.

import { ANW, API, CORE_API, LEKTOREN, users, state, requestAs, apiStaff, checkAccount, failReason, needsLogin, visitAs } from './lib/api.js'
import {
	byCy, setSection, shot, shotEl, shotModal, shotSubject, writeIndex, collapseMenu, closeModal, acceptConfirm,
	rejectConfirm, clearToasts, closeTooltips, CONFIRM, tabulatorOf, cellOf, rowOf, waitRows, dateInput, pickDate
} from './lib/ui.js'
import { seed, isoDate, deDate, addDays } from './lib/seed.js'

const NOW = new Date()
const TODAY_ISO = isoDate(NOW)
const TODAY_DE = deDate(NOW)
const VON = Cypress.env('kontrolleVon') || '08:00'
const BIS = Cypress.env('kontrolleBis') || '09:30'
const MOBILE = [390, 844]

// vue warnings and ResizeObserver noise of the app must not stop the screenshots
Cypress.on('uncaught:exception', () => false)

// the CIS4 content is a few pixels larger than the viewport, the screenshots would show the scrollbars.
// The rule hides every scrollbar, scrolling still works.
// Bootstrap scrolls smoothly: element shots scroll and capture at once, the page would not move yet
Cypress.on('window:load', win => {
	const style = win.document.createElement('style')
	style.textContent = '* { scrollbar-width: none !important; } *::-webkit-scrollbar { display: none !important; }'
		+ ' html { scroll-behavior: auto !important; }'
	win.document.head.appendChild(style)
})

// headless Electron draws few frames, after the first element shot often less than one per second. Vue transitions
// (PrimeVue dropdown panels, dialogs) wait for requestAnimationFrame: a panel stayed invisible and never closed.
// A timer frame does not depend on the drawing
Cypress.on('window:before:load', win => {
	win.requestAnimationFrame = cb => win.setTimeout(() => cb(win.performance.now()), 16)
	win.cancelAnimationFrame = id => win.clearTimeout(id)
})

// ---------- the LV of the run ----------

// the LVs of a lektor come from the LE assignment (core getByEmp), not from LV-Plan dates.
// Newest semester first, the first lektor with an LV that holds a test student wins. The dump has no LV with both,
// so one student does the check-in, the Entschuldigung and the profile; the Fehlminuten go to another row
function findLv(lektoren, semesters, tried) {
	const lektor = lektoren[0]
	// no LV: the preflight reports it
	if (!lektor) {
		cy.writeFile('png/discovery.json', { semesters, tried })
		return
	}
	searchSemester(lektor, semesters, 0, tried).then(found => {
		if (!found) return findLv(lektoren.slice(1), semesters, tried)
		cy.writeFile('png/discovery.json', { semesters, tried, chosen: { lektor: lektor.uid, ...found } })
		users.lektor = lektor.account
		users.student = users[found.studentRole]
		state.lektor = lektor
		state.uids.lektor = lektor.uid
		state.loggedIn.lektor = lektor.login === 200 && lektor.anw === 200 && lektor.cis === 200
		state.loggedIn.student = state.loggedIn[found.studentRole]
		state.lv = found
	})
}

function searchSemester(lektor, semesters, i, tried) {
	const sem = semesters[i]
	if (!sem) return cy.wrap(null)

	return apiStaff('GET', `${CORE_API}/Lehrveranstaltung/getByEmp/${sem}/${lektor.uid}`).then(body => {
		const lvs = (body.data || []).map(lv => ({
			lv_id: lv.lehrveranstaltung_id,
			sem_kurzbz: sem,
			stg_kz: lv.lv_studiengang_kz ?? lv.studiengang_kz,
			sem: lv.lv_semester ?? lv.semester,
			bezeichnung: lv.lv_bezeichnung ?? lv.bezeichnung,
			le_ids: (lv._children || []).map(le => String(le.lehreinheit_id))
		}))
		const entry = { lektor: lektor.uid, semester: sem, lvs: lvs.length, matches: [] }
		tried.push(entry)

		const sameUid = account => st => String(st.uid).toLowerCase() === account.username.toLowerCase()
		return cy.wrap(lvs).each(lv => {
			apiStaff('GET', `${API}/InfoApi/getStudentsForLvaInSemester`, { lva_id: lv.lv_id, sem: sem }).then(res => {
				const students = res?.data?.retval || []
				const present = ['student1', 'student2']
					.filter(role => state.login[role])
					.map(role => ({ role, row: students.find(sameUid(users[role])) }))
					.filter(p => p.row)
				if (!present.length) return
				entry.matches.push({
					...lv, studentRole: present[0].role, student: present[0].row, both: present.length > 1,
					ownLe: lv.le_ids.includes(String(present[0].row.lehreinheit_id))
				})
			})
		}).then(() => {
			const m = entry.matches
			if (m.length) return m.find(x => x.both && x.ownLe) || m.find(x => x.ownLe) || m[0]
			return searchSemester(lektor, semesters, i + 1, tried)
		})
	})
}

// ---------- preflight ----------

// accounts, permissions, LV, schema and phrases (png/preflight.json, png/discovery.json).
// A failed check stops the run before the first screenshot
function preflight() {
	const accounts = { lektoren: [], others: {} }
	const checks = []
	const check = (name, ok, detail) => checks.push(ok ? { name, ok: true } : { name, ok: false, detail })

	cy.wrap(LEKTOREN).each(acc => checkAccount(acc).then(r => { accounts.lektoren.push(r) }))
	cy.wrap(['assistenz', 'admin', 'student1', 'student2'].filter(role => users[role])).each(role =>
		checkAccount(users[role]).then(r => { accounts.others[role] = r }))

	// accounts, then the LV
	cy.then(() => {
		const others = accounts.others
		const ready = r => r?.login === 200 && r.anw === 200 && r.cis === 200
		// login: enough for the LV search. loggedIn: the role can open its pages
		state.login = Object.fromEntries(Object.entries(others).map(([role, r]) => [role, r.login === 200]))
		state.loggedIn = Object.fromEntries(Object.entries(others).map(([role, r]) => [role, ready(r)]))
		state.staff = ['admin', 'assistenz'].filter(role => state.login[role])
		state.uids = Object.fromEntries(Object.entries(others).map(([role, r]) => [role, r.uid]).filter(([, uid]) => uid))

		Object.values(others).forEach(r => {
			check(`login ${r.username}`, r.login === 200, `${r.login}: LDAP rejects the password of the .env file`)
			if (r.login !== 200) return
			check(`Anwesenheiten permission ${r.username}`, r.anw === 200, `${r.anw}: prepare_cy_db.sql part 1`)
			check(`basis/cis ${r.username}`, r.cis === 200, `${r.cis}: prepare_cy_db.sql part 1`)
		})

		if (!state.staff.length || !state.semesterData) {
			check('LV search', false, 'needs the login of admin or assistenz and one account with an Anwesenheiten permission')
			return
		}

		// every lektor uid, also without a working login: discovery.json then shows the right lektor.
		// The server lowercases the uid of a login
		const lektoren = LEKTOREN
			.map((account, i) => ({ account, ...accounts.lektoren[i], uid: accounts.lektoren[i].uid || account.username.toLowerCase() }))
			.filter((l, i, all) => all.findIndex(o => o.uid === l.uid) === i)
		// started semesters, newest first; the response is [all semesters, current semester]
		const semesters = state.semesterData[0]
			.filter(sem => new Date(sem.start) <= NOW)
			.slice(0, 8)
			.map(sem => sem.studiensemester_kurzbz)
		findLv(lektoren, semesters, [])
	})

	// the lektor of the LV, the seed permission and the schema: both APIs read the fehlminuten columns
	cy.then(() => {
		const lv = state.lv
		if (!state.staff.length || !state.semesterData) return
		check('LV of a lektor with a test student', lv, 'see png/discovery.json')
		if (!lv) return

		const lektor = state.lektor
		check(`login ${lektor.uid}`, lektor.login === 200, `${lektor.login}: LDAP rejects the password of the .env file`)
		if (lektor.login !== 200) return
		check(`Anwesenheiten permission ${lektor.uid}`, lektor.anw === 200, `${lektor.anw}: prepare_cy_db.sql part 1`)
		check(`basis/cis ${lektor.uid}`, lektor.cis === 200, `${lektor.cis}: prepare_cy_db.sql part 1`)

		// the seed runs as admin: Kontrollen and Entschuldigungen in the past need anw_r_full_assistenz on the LV
		requestAs('admin', 'GET', `${API}/KontrolleApi/getLehreinheitenForLehrveranstaltung`, { lva_id: lv.lv_id, sem_kurzbz: lv.sem_kurzbz })
			.then(res => check(`seed permission ${users.admin.username}`, res.status === 200 && res.body?.meta?.status === 'success',
				`${failReason(res)}: anw_r_full_assistenz on the oe of the LV, prepare_cy_db.sql part 1`))

		if (lektor.anw !== 200) return
		requestAs('lektor', 'POST', `${API}/KontrolleApi/fetchAllAnwesenheitenByLvaAssigned`,
			{ lv_id: lv.lv_id, sem_kurzbz: lv.sem_kurzbz, le_id: lv.student.lehreinheit_id, ma_uid: lektor.uid })
			.then(res => check('Lektor API, DB schema', res.status === 200 && res.body?.meta?.status === 'success', failReason(res)))

		if (!state.loggedIn.student) return
		requestAs('student', 'GET', `${API}/ProfilApi/getAllAnwByUID`,
			{ studiensemester: lv.sem_kurzbz, uid: users.student.username, person_id: lv.student.person_id })
			.then(res => check('Student API, DB schema', res.status === 200 && res.body?.meta?.status === 'success', failReason(res)))
	})

	// phrases: every key of the extension code must exist in the DB, else the screenshots show << PHRASE key >>
	cy.task('usedPhrases').then(used => {
		const missing = []
		cy.wrap(Object.keys(used)).each(cat =>
			cy.request(`${CORE_API}/phrasen/loadModule/${cat}`).then(res => {
				const have = new Set((res.body?.data || []).filter(p => p.category === cat).map(p => p.phrase))
				used[cat].filter(key => !have.has(key)).forEach(key => missing.push(`${cat}/${key}`))
			})
		).then(() => check('phrases', !missing.length, `${missing.length} missing, run system/checksystem.php of the core: ${missing.join(', ')}`))
	})

	// the check runs after the write: an expect beside cy.writeFile runs first and the report never lands
	cy.then(() => cy.writeFile('png/preflight.json', { checks, accounts })).then(() => {
		const failed = checks.filter(c => !c.ok).map(c => `- ${c.name}: ${c.detail}`)
		if (!failed.length || Cypress.env('skipPreflight')) return
		throw new Error(`Preflight failed, see png/preflight.json\n${failed.join('\n')}`)
	})
}

// ---------- Lektor page ----------

const MAIN = `${byCy('lektor-table')} .tabulator`
const isStudent = s => d => String(d.prestudent_id) === String(s.prestudent_id)
const isOther = s => d => String(d.prestudent_id) !== String(s.prestudent_id)

function lektorIdle() {
	cy.get(byCy('lektor-loading'), { timeout: 60000 }).should('not.be.visible')
	cy.wait(1500)
}

// the page preselects the LV-Teil with the closest Termin, switch until the student with the login is in the table
function ensureLe(attempt = 0) {
	cy.window().then(win => {
		const rows = tabulatorOf(win, MAIN).getData()
		if (rows.some(isStudent(state.lv.student))) return

		cy.get(byCy('le-dropdown')).click()
		cy.get(byCy('le-option')).then($items => {
			if (attempt >= $items.length) throw new Error('No LV-Teil shows ' + state.lv.student.uid)
			cy.wrap($items.eq(attempt)).click()
		})
		lektorIdle()
		ensureLe(attempt + 1)
	})
}

function openLektor() {
	needsLogin('lektor')
	const lv = state.lv
	visitAs('lektor', `${ANW}/?stg_kz=${lv.stg_kz}&sem=${lv.sem}&lvid=${lv.lv_id}&sem_kurzbz=${lv.sem_kurzbz}`)
	cy.get(MAIN, { timeout: 60000 }).should('exist')
	lektorIdle()
	collapseMenu()
	ensureLe()
}

function showAllKontrollen() {
	cy.get(byCy('show-all-kontrollen')).then($c => { if (!$c.is(':checked')) cy.wrap($c).click() })
	lektorIdle()
}

function selectDate(date) {
	cy.get(dateInput('lektor-datum')).clear().type(`${deDate(date)}{enter}`)
	cy.get('body').type('{esc}')
	lektorIdle()
}

const seedDate = i => state.seed?.dates?.[i] ?? NOW

// the core filter renders the new button of a table, without a data-cy
const clickNew = table => cy.get(`${byCy(table)} button:has(.fa-plus)`).first().click()

// the core tabs render their titles without a data-cy, the titles are phrases
const tab = title => cy.contains('.nav-tabs .nav-link', title)

// the dashboard card is core markup, its header shows the name of the widget setup
const WIDGET = `.dashboard-item:has(${byCy('anw-widget')})`

// ---------- the suite ----------

describe('Wiki Anwesenheiten', () => {

	before(() => {
		preflight()
		// without an LV (skipPreflight) there is nothing to seed
		if (!Cypress.env('noSeed')) cy.then(() => { if (state.lv) seed() })
	})

	after(() => writeIndex())

	beforeEach(() => cy.viewport(1440, 900))

	describe('LV-Teil Kontrolle: Übersicht', () => {
		before(() => setSection('LV-Teil Kontrolle'))

		it('Übersicht, LV-Teile und fremder LV-Teil', () => {
			openLektor()
			selectDate(seedDate(3))
			shot('lektor1', 'Übersicht eines LV-Teils am gewählten Kontrolldatum')

			showAllKontrollen()
			shot('lektor4', 'Alle Kontrollen des LV-Teils')

			cy.get(byCy('le-dropdown')).click()
			shot('lvteilauswahl', 'Auswahlfeld mit den eigenen LV-Teilen')
			// the toggle needs the colleague LV-Teil of prepare_cy_db.sql part 2
			cy.get(byCy('le-fremde-toggle')).click()
			shot('lvteilauswahlweitere', 'Auswahlfeld mit den LV-Teilen der Kolleginnen und Kollegen')
			cy.get(byCy('le-option')).last().click()
			lektorIdle()
			shot('lvteilfremd', 'LV-Teil einer Kollegin: nur Ansicht')
		})

		it('Gesamtansicht', () => {
			openLektor()
			cy.get(byCy('gesamtansicht-start')).click()
			lektorIdle()
			shot('gesamtansicht', 'Gesamtansicht mehrerer LV-Teile, schreibgeschützt')
			cy.get(byCy('le-multiselect')).click()
			shot('gesamtansichtauswahl', 'Auswahl der LV-Teile in der Gesamtansicht')
		})

		it('Datumsauswahl', () => {
			openLektor()
			// default: the days a Kontrolle without LV-Plan Termin is allowed on, around today
			selectDate(NOW)
			cy.get(dateInput('lektor-datum')).click()
			cy.get(`${byCy('lektor-datum')} .dp__menu`).should('be.visible')
			shot('lektor5', 'Datumsauswahl: aktuell prüfbare Tage')
			cy.get('body').type('{esc}')

			selectDate(seedDate(3))
			cy.get(dateInput('lektor-datum')).click()
			cy.get(`${byCy('lektor-datum')} ${byCy('highlight-kontrollen')}`).click()
			shot('lektor5kontrollen', 'Datumsauswahl: Tage mit Kontrollen')
			cy.get(`${byCy('lektor-datum')} ${byCy('highlight-termine')}`).click()
			shot('lektor5termine', 'Datumsauswahl: Unterricht laut LV-Plan')
		})

		it('Legende', () => {
			openLektor()
			cy.get(byCy('legende-open')).click()
			shotModal('legende-modal', 'legende', 'Legende der Status, Zeichen und Namenszusätze')
		})

		it('Detailansicht einer Person', () => {
			openLektor()
			cellOf(MAIN, isStudent(state.lv.student), 'nachname').then($c => cy.wrap($c).click())
			const ROWS = `${byCy('sbylva-table')} .tabulator-row`
			cy.get(ROWS, { timeout: 30000 }).should('have.length.greaterThan', 0)
			closeTooltips()
			shotModal('student-detail-modal', 'sbylvapreupdate', 'Detailansicht: alle Anwesenheiten einer Person in der LV')

			const firstRow = () => cy.get(ROWS).first()
			// a click on a selected row deselects it, the status buttons then stay disabled
			const selectFirstRow = () => firstRow().then($r => { if (!$r.hasClass('tabulator-selected')) cy.wrap($r).click() })

			selectFirstRow()
			cy.get(byCy('sbylva-abwesend')).click()
			acceptConfirm()
			cy.wait(1500)
			shotModal('student-detail-modal', 'sbylvapostupdate', 'Detailansicht nach dem Setzen eines Status')

			// back to the seeded status
			selectFirstRow()
			cy.get(byCy('sbylva-anwesend')).click()
			acceptConfirm()
			cy.wait(1500)

			firstRow().find('[tabulator-field="notiz"]').click()
			cy.focused().clear().type('Laborübung nachgeholt{enter}')
			acceptConfirm()
			cy.wait(1500)
			shotModal('student-detail-modal', 'sbylvanote', 'Detailansicht: Notiz zu einem Eintrag')
		})

		it('Entschuldigte Person', () => {
			openLektor()
			// the seed accepted an Entschuldigung of the student on this day
			selectDate(seedDate(4))
			shot('studententschuldigt', 'Markierung einer bestätigten Entschuldigung, Status entschuldigt')
			cellOf(MAIN, isStudent(state.lv.student), 'nachname').then($c => cy.wrap($c).trigger('mouseenter').trigger('mouseover'))
			cy.wait(1000)
			shot('studententschuldigttooltip', 'Tooltip mit den Entschuldigungen der Person')
		})
	})

	describe('LV-Teil Kontrolle: Kontrolle durchführen', () => {
		before(() => setSection('LV-Teil Kontrolle: Kontrolle durchführen'))

		it('Neue Kontrolle und QR-Code', () => {
			openLektor()
			clickNew('lektor-table')
			cy.get(`${byCy('new-kontrolle-modal')}.show`).should('be.visible')
			shotModal('new-kontrolle-modal', 'lektor2', 'Neue Kontrolle starten')

			// Escape would close the modal too, a click outside closes only the dropdown or the date picker.
			// Not on the title: a click pins its help tooltip, the tooltip then covers the date fields
			const clickOutside = () => cy.get(byCy('new-kontrolle-heading')).click()

			cy.get(byCy('termine-dropdown')).click()
			shot('lektor2termine', 'Neue Kontrolle: Termine laut LV-Plan')
			clickOutside()
			cy.get(byCy('termine-dropdown-panel')).should('not.exist')

			// date first, a new date resets the times to the Termin
			cy.get(dateInput('new-kontrolle-datum')).clear().type(`${TODAY_DE}{enter}`)
			clickOutside()
			cy.get(dateInput('new-kontrolle-von')).clear().type(`${VON}{enter}`)
			cy.get(dateInput('new-kontrolle-bis')).clear().type(`${BIS}{enter}`)
			clickOutside()
			shotModal('new-kontrolle-modal', 'lektor3', 'Neue Kontrolle: Warnung bei Zeiten außerhalb des LV-Plans')

			cy.get(byCy('new-kontrolle-start')).click()
			acceptConfirm()
			acceptConfirm()

			// the screenshot of the QR code follows with the check-in in "Kontrolle beenden"
			cy.get(byCy('qr-code'), { timeout: 30000 }).should($c => expect($c.text().trim()).to.match(/^\S{4,}$/))
			cy.get(byCy('qr-code')).invoke('text').then(t => { state.code = t.trim() })
		})

		it('Code eingeben', () => {
			needsLogin('student')
			expect(state.code, 'Zugangscode of the previous test').to.exist
			visitAs('student', `${ANW}/Profil/Scan/${state.code}`)
			cy.get(byCy('scan-success'), { timeout: 30000 }).should('be.visible')
			clearToasts()
			shot('eintragerfolgreich', 'Erfolgreiche Registrierung mit dem Zugangscode')
		})

		it('Kontrolle beenden', () => {
			openLektor()
			cy.get(`${byCy('qr-modal')}.show`, { timeout: 30000 }).should('be.visible')
			// the counter polls every 3 seconds
			cy.wait(4000)
			shotModal('qr-modal', 'qr', 'QR-Code und Zugangscode einer laufenden Kontrolle')
			cy.get(byCy('qr-stop')).click()
			acceptConfirm()
			cy.get(`${byCy('qr-modal')}.show`).should('not.exist')
			lektorIdle()
			selectDate(NOW)
			shot('afterkontrolle', 'Die beendete Kontrolle als neue Spalte')
		})

		it('Fehlminuten und Massenanpassung', () => {
			openLektor()
			selectDate(NOW)
			// another student than the one with the login, that one keeps the scanned status.
			// The date columns have the field "<yyyy-mm-dd> | <von> - <bis>"
			cellOf(MAIN, isOther(state.lv.student), TODAY_ISO).then($c => cy.wrap($c).click())
			cy.get(byCy('status-option-fehlminuten')).should('be.visible')
			shot('anwoverviewupdate1', 'Status direkt in der Übersicht ändern')

			// the detail view holds a second Fehlminuten dialog, only the open one has .show
			const FEHLMINUTEN = `${byCy('fehlminuten-dialog')}.show`
			cy.get(byCy('status-option-fehlminuten')).click()
			cy.get(FEHLMINUTEN).should('exist')
			cy.get(`${FEHLMINUTEN} ${byCy('fehlminuten-minuten')}`).clear().type('15')
			cy.get(`${FEHLMINUTEN} ${byCy('fehlminuten-grund-verspaetung')}`).click()
			shotModal('fehlminuten-dialog', 'fehlminuten', 'Dialog Fehlminuten erfassen')
			cy.get(`${FEHLMINUTEN} ${byCy('fehlminuten-anwenden')}`).click()
			cy.get(FEHLMINUTEN).should('not.exist')
			shot('anwoverviewupdate2', 'Ungespeicherte Änderungen in der Übersicht')

			// the detail view asks before it drops unsaved changes
			cellOf(MAIN, isStudent(state.lv.student), 'nachname').then($c => cy.wrap($c).click())
			cy.get(CONFIRM).should('be.visible')
			shotEl(CONFIRM, 'anwdiscardconfirm', 'Nachfrage bei ungespeicherten Änderungen')
			rejectConfirm()

			cy.get(byCy('save-changes')).click()
			acceptConfirm()
			lektorIdle()
			clearToasts()
			shot('anwoverviewupdate3', 'Übersicht nach dem Speichern')
		})

		it('Kontrollen bearbeiten', () => {
			openLektor()
			cy.get(byCy('edit-kontrollen')).click()
			cy.get(`${byCy('edit-kontrolle-modal')}.show`).should('be.visible')
			shotModal('edit-kontrolle-modal', 'lektor6', 'Dialog Anwesenheitskontrolle bearbeiten')

			// the live Kontrolle of today: lektors may edit it
			cy.contains(byCy('edit-kontrolle-row'), TODAY_DE).find(byCy('edit-kontrolle-zeiten')).click()
			shotModal('edit-kontrolle-modal', 'lektor7', 'Zeiten einer Kontrolle bearbeiten')
		})
	})

	describe('Anwesenheitsprofil Student', () => {
		before(() => setSection('Anwesenheitsprofil Student'))

		it('Anwesenheiten und Timeline', () => {
			needsLogin('student')
			visitAs('student', `${ANW}/Profil`)
			// the profile starts in the current semester, the LV of the dump can be older
			cy.get(byCy('studiensemester'), { timeout: 60000 }).select(state.lv.sem_kurzbz)
			collapseMenu()
			waitRows(byCy('student-anw-table'))
			cy.get(`${byCy('student-anw-table')} .tabulator-group`).first().click()
			cy.wait(800)
			shot('studentanwprofilv2', 'Anwesenheiten pro Lehrveranstaltung')

			// the tab needs the timeline permission of the instance config
			tab(/timeline/i).click()
			cy.get(byCy('anw-timeline'), { timeout: 30000 }).should('be.visible')
			cy.wait(1000)
			shot('studenttimeline', 'Timeline der Anwesenheiten und Entschuldigungen')
		})

		it('Entschuldigungen', () => {
			needsLogin('student')
			visitAs('student', `${ANW}/Profil/Entschuldigung`)
			collapseMenu()
			const TABLE = `${byCy('ent-table')} .tabulator`
			waitRows(byCy('ent-table'))
			shot('entschuldigungen', 'Liste der eigenen Entschuldigungen')

			rowOf(TABLE, d => d.akzeptiert == null).then($r => shotSubject($r, 'entschuldigungstatusoffen', 'Offene Entschuldigung'))
			rowOf(TABLE, d => d.akzeptiert === true || d.akzeptiert === 't').then($r => shotSubject($r, 'entschuldigungstatusakzeptiert', 'Akzeptierte Entschuldigung'))
			rowOf(TABLE, d => d.akzeptiert === false || d.akzeptiert === 'f').then($r => shotSubject($r, 'entschuldigungstatusabgelehnt', 'Abgelehnte Entschuldigung'))

			// the seeded Entschuldigung without document: upload later
			rowOf(TABLE, d => d.akzeptiert == null && !d.dms_id).then($r => cy.wrap($r).find(byCy('ent-upload')).click())
			shotModal('ent-nachreichen-modal', 'entschuldigungnachreichen', 'Dokument nachreichen')
			closeModal('ent-nachreichen-modal')

			clickNew('ent-table')
			cy.get(`${byCy('ent-upload-file')} input[type=file]`).selectFile('fixtures/entschuldigung.pdf', { force: true })
			shotModal('ent-upload-modal', 'entschuldigungupload', 'Entschuldigung hochladen')
		})

		it('Dashboard-Widget', () => {
			needsLogin('student')
			visitAs('student', '/cis.php')
			collapseMenu()
			cy.get(WIDGET, { timeout: 30000 }).should('exist')
			cy.wait(4000)
			shotEl(WIDGET, 'dashboardwidget', 'Dashboard-Widget Anwesenheiten')
		})
	})

	describe('Anwesenheitsprofil Student: Smartphone', () => {
		before(() => setSection('Anwesenheitsprofil Student: Smartphone'))
		beforeEach(() => cy.viewport(...MOBILE))

		it('Kartenlisten und Codeeingabe', () => {
			needsLogin('student')
			visitAs('student', `${ANW}/Profil`)
			cy.get(byCy('studiensemester'), { timeout: 60000 }).select(state.lv.sem_kurzbz)
			// the list of the current semester shows first, the wait lets the chosen semester load
			cy.wait(3000)
			cy.get(byCy('anw-card')).should('have.length.greaterThan', 0)
			shot('mobilanwesenheiten', 'Smartphone: Anwesenheiten als Kartenliste')

			visitAs('student', `${ANW}/Profil/Entschuldigung`)
			cy.get(byCy('ent-card'), { timeout: 30000 }).should('have.length.greaterThan', 0)
			shot('mobilentschuldigungen', 'Smartphone: Entschuldigungen als Kartenliste')

			visitAs('student', `${ANW}/Profil/Scan`)
			cy.get(byCy('scan-form'), { timeout: 30000 }).should('be.visible')
			shot('mobilscan', 'Smartphone: Codeeingabe')
		})
	})

	describe('Entschuldigungsmanagement', () => {
		before(() => setSection('Entschuldigungsmanagement Studiengangsadministration'))

		const TABLE = `${byCy('ent-admin-table')} .tabulator`
		const openAdministration = () => {
			needsLogin('assistenz')
			visitAs('assistenz', `${ANW}/Administration`)
			collapseMenu()
			waitRows(byCy('ent-admin-table'))
		}

		it('Liste und Zeitraum', () => {
			openAdministration()
			shot('admin', 'Entschuldigungsmanagement')

			// every Entschuldigung of the seed is from today: a range from tomorrow on hides the open ones
			pickDate('ent-zeitraum-von', addDays(NOW, 1))
			cy.get(byCy('ent-alle-offenen'), { timeout: 20000 }).should('be.visible')
			cy.wait(1000)
			shot('adminoffeneausserhalb', 'Offene Entschuldigungen außerhalb des Zeitraums')
			cy.get(byCy('ent-alle-offenen')).click()
			cy.wait(3000)
			shot('adminalleoffenen', 'Alle offenen Entschuldigungen geladen')
		})

		it('Prüfen, bearbeiten, Timeline', () => {
			openAdministration()
			const openWithDocument = d => d.akzeptiert == null && d.dms_id
			const rowButton = cyName => rowOf(TABLE, openWithDocument).then($r => cy.wrap($r).find(byCy(cyName)).click())

			rowButton('ent-edit')
			shotModal('ent-edit-modal', 'entschuldigungedit', 'Entschuldigung bearbeiten')
			cy.get(byCy('ent-edit-abbrechen')).click()
			cy.get(`${byCy('ent-edit-modal')}.show`).should('not.exist')

			rowButton('ent-timeline')
			cy.get(`${byCy('ent-timeline-modal')}.show ${byCy('anw-timeline')}`, { timeout: 30000 }).should('be.visible')
			cy.wait(1000)
			shot('admintimeline', 'Timeline der Anwesenheiten und Entschuldigungen einer Person')
			cy.get(byCy('ent-timeline-schliessen')).click()
			cy.get(`${byCy('ent-timeline-modal')}.show`).should('not.exist')

			rowButton('ent-reject')
			cy.get(byCy('ent-status-notiz')).type('Zeitraum passt nicht zum Dokument')
			shotModal('ent-status-modal', 'entschuldigungablehnen', 'Entschuldigung ablehnen mit Begründung')
			cy.get(byCy('ent-status-abbrechen')).click()
			cy.get(`${byCy('ent-status-modal')}.show`).should('not.exist')

			// a single account: the check accepts at once, the row shows the new status
			rowButton('ent-accept')
			acceptConfirm()
			cy.wait(2500)
			clearToasts()
			shot('adminakzeptiert', 'Entschuldigungsmanagement nach dem Akzeptieren')
		})
	})

	describe('Administration', () => {
		before(() => setSection('Administration'))

		it('Alle Karteireiter und Studierendenauswahl', () => {
			needsLogin('admin')
			const lv = state.lv
			visitAs('admin', `${ANW}/?stg_kz=${lv.stg_kz}&sem=${lv.sem}&lvid=${lv.lv_id}&sem_kurzbz=${lv.sem_kurzbz}`)
			cy.get('.nav-tabs .nav-link', { timeout: 60000 }).should('have.length.greaterThan', 1)
			collapseMenu()
			cy.wait(2000)
			shot('adminlanding', 'Ansicht mit allen Karteireitern für Administration')

			tab(/profil/i).click()
			cy.get(byCy('student-dropdown'), { timeout: 30000 }).click()
			cy.contains(`${byCy('student-dropdown-panel')} .p-dropdown-item`, state.lv.student.nachname).click()
			cy.wait(3000)
			shot('adminstudentprofil', 'Anwesenheitsprofil einer Person aus Sicht der Administration')
		})
	})
})
