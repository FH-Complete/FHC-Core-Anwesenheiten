// screenshots, the index of the run and the helpers for the CIS4 page, modals, dialogs and tabulator

// ---------- screenshots and png/index.json ----------

const shots = []
let section = ''

// the section of the following screenshots in png/index.json, it follows the chapters of the wiki
export function setSection(name) {
	section = name
}

function record(name, title) {
	const entry = { file: `${name}.png`, section, title }
	const i = shots.findIndex(s => s.file === entry.file)
	if (i >= 0) shots[i] = entry
	else shots.push(entry)
}

// photos and icons load after the data. Waits until every image in the viewport is complete, at most 10 seconds.
// Images outside the viewport stay out: lazy images there never load
export function waitImages() {
	cy.window({ log: false }).then({ timeout: 11000 }, win => new Cypress.Promise(resolve => {
		const end = Date.now() + 10000
		const inView = img => {
			const r = img.getBoundingClientRect()
			return r.bottom > 0 && r.right > 0 && r.top < win.innerHeight && r.left < win.innerWidth
		}
		const check = () => {
			const pending = [...win.document.images].filter(img => img.src && !img.complete && inView(img))
			if (!pending.length || Date.now() > end) resolve()
			else setTimeout(check, 200)
		}
		check()
	}))
}

// the desktop header bar is fixed. Element shots scroll the page, the bar would cover the top
// of the element. As absolute, the bar stays at the top of the page
function headerScrolls(on) {
	cy.window({ log: false }).then(win => {
		const bar = win.document.getElementById('cis-header-bar')
		if (!bar) return
		if (!on) bar.style.position = ''
		else if (win.getComputedStyle(bar).position === 'fixed') bar.style.position = 'absolute'
	})
}

export function shot(name, title) {
	waitImages()
	cy.wait(600)
	cy.screenshot(name, { capture: 'viewport', overwrite: true }).then(() => record(name, title))
}

export function shotEl(selector, name, title, padding = 8) {
	cy.get(selector).last().should('be.visible')
	waitImages()
	cy.wait(600)
	headerScrolls(true)
	cy.get(selector).last().screenshot(name, { overwrite: true, padding }).then(() => record(name, title))
	headerScrolls(false)
}

// only the own dialog: a modal can hold a hidden modal (the Fehlminuten dialog in the detail view)
export function shotModal(name, title) {
	shotEl('.modal.show > .modal-dialog', name, title)
}

// a subject from cellOf/rowOf
export function shotSubject($el, name, title, padding = 4) {
	waitImages()
	cy.wait(400)
	headerScrolls(true)
	cy.wrap($el).screenshot(name, { overwrite: true, padding }).then(() => record(name, title))
	headerScrolls(false)
}

// inWiki: the wiki uses the file already. wikiWithoutShot: wiki media this run does not produce
export function writeIndex() {
	cy.task('wikiMedia').then(media => {
		const files = shots.map(s => s.file)
		cy.writeFile('png/index.json', {
			shots: shots.map(s => ({ ...s, inWiki: media.includes(s.file) })),
			wikiWithoutShot: media.filter(m => !files.includes(m))
		})
	})
}

// ---------- CIS4 page ----------

// the open CIS4 menu narrows the content, the tables then scroll sideways. Below lg the toggle is hidden
export function collapseMenu() {
	cy.get('#nav-main-toggle', { timeout: 30000 }).should('exist')
	cy.get('body').then($b => {
		const toggle = $b.find('#nav-main-toggle [data-bs-toggle="collapse"]:visible')
		if (!toggle.length || toggle.attr('aria-expanded') === 'false') return
		cy.wrap(toggle).click()
		cy.get('#nav-main-menu').should('not.have.class', 'show')
		// tabulator measures its width on resize
		cy.window().then(win => win.dispatchEvent(new win.Event('resize')))
		cy.wait(800)
	})
}

export function closeModal() {
	cy.get('.modal.show > .modal-dialog > .modal-content > .modal-header .btn-close').last().click({ force: true })
	cy.get('.modal.show').should('not.exist')
}

// a hover tooltip of a table cell opens after its delay, also over the modal that the click on the cell opened.
// A pointerdown outside the anchor closes it
export function closeTooltips() {
	cy.wait(500)
	cy.window({ log: false }).then(win => win.document.body.dispatchEvent(new win.PointerEvent('pointerdown', { bubbles: true })))
	cy.get('.fhc-in-view-tooltip').should('not.exist')
}

// $fhcAlert.confirm opens a PrimeVue ConfirmDialog
export const CONFIRM = '.p-confirm-dialog'

export function acceptConfirm() {
	cy.wait(1000)
	cy.get('body').then($b => {
		const btn = $b.find('.p-confirm-dialog-accept:visible')
		if (btn.length) cy.wrap(btn.first()).click()
	})
}

export function rejectConfirm() {
	cy.get('.p-confirm-dialog-reject:visible').first().click()
	cy.get(CONFIRM).should('not.exist')
}

// toasts of $fhcAlert would cover the next screenshot
export function clearToasts() {
	cy.get('body').then($b => {
		$b.find('.p-toast-icon-close:visible').each((i, el) => el.click())
	})
	cy.wait(300)
}

// a VueDatePicker without text input opens on the month of its value: step from there to the month of
// the date, then click the day. The value of the input has the format dd.MM.yyyy
export function pickDate(inputSelector, date) {
	cy.get(inputSelector).first().invoke('val').then(value => {
		const [, month, year] = String(value).split('.').map(Number)
		const steps = month && year ? (date.getFullYear() * 12 + date.getMonth()) - (year * 12 + month - 1) : 0
		cy.get(inputSelector).first().click()
		cy.get('.dp__menu').should('be.visible')
		const arrow = steps > 0 ? 'Next month' : 'Previous month'
		for (let i = 0; i < Math.abs(steps); i++) cy.get(`.dp__menu [aria-label="${arrow}"]`).first().click()
		cy.get('.dp__menu .dp__cell_inner:not(.dp__cell_offset)').contains(new RegExp(`^\\s*${date.getDate()}\\s*$`)).click()
	})
}

// ---------- tabulator ----------

// the main table is the last one in the container, modals hold more tables before it
export function tabulatorOf(win, selector) {
	const el = [...win.document.querySelectorAll(selector)].pop()
	const table = el && win.Tabulator?.findTable(el)?.[0]
	expect(table, 'tabulator ' + selector).to.exist
	return table
}

// tabulator renders only the visible rows, so find and scroll by the API
export function cellOf(selector, rowPred, fieldStart) {
	return cy.window().then(win => {
		const table = tabulatorOf(win, selector)
		const row = table.getRows().find(r => rowPred(r.getData()))
		const col = table.getColumns().find(c => (c.getField() || '').startsWith(fieldStart))
		expect(row, 'row in ' + selector).to.exist
		expect(col, 'column ' + fieldStart).to.exist
		return table.scrollToRow(row, 'center', false).then(() => {
			// by field, not getCell(col): the core filter keeps tabulator in Vue data. Its setColumns/setData
			// run through the reactive proxy, the cells hold proxies of the columns, never the raw col of findTable
			const cell = row.getCells().find(c => c.getField() === col.getField())
			expect(cell, 'cell ' + col.getField()).to.exist
			return Cypress.$(cell.getElement())
		})
	})
}

export function rowOf(selector, rowPred) {
	return cy.window().then(win => {
		const table = tabulatorOf(win, selector)
		const row = table.getRows().find(r => rowPred(r.getData()))
		expect(row, 'row in ' + selector).to.exist
		return table.scrollToRow(row, 'center', false).then(() => Cypress.$(row.getElement()))
	})
}

export function waitRows(selector, timeout = 60000) {
	cy.get(`${selector} .tabulator-row, ${selector} .tabulator-group`, { timeout }).should('have.length.greaterThan', 0)
	cy.wait(800)
}
