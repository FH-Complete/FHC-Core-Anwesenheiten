// accounts, requests and the session handling of the screenshot run

export const ANW = '/cis.php/extensions/FHC-Core-Anwesenheiten'
export const API = '/index.ci.php/extensions/FHC-Core-Anwesenheiten/api'
export const CORE_API = '/index.ci.php/api/frontend/v1'

export const LEKTOREN = Cypress.env('lektoren')

// lektor and student: the preflight sets them to the accounts of the chosen LV
export const users = {
	lektor: null,
	student: null,
	assistenz: Cypress.env('assistenz'),
	admin: Cypress.env('admin'),
	student1: Cypress.env('student1'),
	student2: Cypress.env('student2'),
}

// shared between the tests: logins, the LV, the seed data and the Zugangscode of the live Kontrolle
export const state = {}

export const accountOf = who => typeof who === 'string' ? users[who] : who

// terminateWithSuccess($result) wraps the rows in retval, terminateWithSuccess(getData($result)) does not
export const dataOf = body => body?.data?.retval ?? body?.data

// the server takes the PHP session before the Basic Auth header, so a user switch must drop the session
let currentUser = null
export function switchTo(account) {
	if (currentUser === account.username) return
	cy.clearAllCookies()
	currentUser = account.username
}

// who: a key of users or an account object
export function requestAs(who, method, url, params, options = {}) {
	const account = accountOf(who)
	switchTo(account)
	const opts = { method, url, auth: account, failOnStatusCode: false, ...options }
	if (method === 'GET') opts.qs = params
	else if (params !== undefined) opts.body = params
	return cy.request(opts)
}

// a short reason of a failed API call: the PHP warning or the error of the response
export function failReason(res) {
	const text = typeof res.body === 'string' ? res.body : JSON.stringify(res.body)
	return `${res.status}: ${(text.match(/ERROR:[^<"\\]*/) || [text])[0].slice(0, 300)}`
}

const succeeded = res => res.status === 200 && res.body?.meta?.status !== 'error'

export function api(who, method, url, params, options) {
	return requestAs(who, method, url, params, options).then(res => {
		if (!succeeded(res)) throw new Error(`${method} ${url} as ${accountOf(who).username}: ${failReason(res)}`)
		return res.body
	})
}

// calls with an admin or assistenz permission: the first staff account with the permission answers.
// The endpoint remembers the account, the next call starts with it
const staffFor = {}
export function apiStaff(method, url, params, roles) {
	const endpoint = url.replace(/\/getByEmp\/.*/, '/getByEmp')
	roles = roles || [...new Set([staffFor[endpoint], ...state.staff].filter(Boolean))]
	return requestAs(roles[0], method, url, params).then(res => {
		if (succeeded(res)) {
			staffFor[endpoint] = roles[0]
			return res.body
		}
		if (roles.length > 1) return apiStaff(method, url, params, roles.slice(1))
		throw new Error(`${method} ${url} as ${state.staff.join(' / ')}: ${failReason(res)}`)
	})
}

// cy.request sends no FormData, so the multipart body is built by hand. The fixture PDF is plain ASCII
export function postMultipart(who, url, fields, file) {
	const boundary = '----wikirun' + Date.now()
	const parts = Object.entries(fields).map(([name, value]) =>
		`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
	if (file) parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${file.name}"\r\n`
		+ `Content-Type: ${file.type}\r\n\r\n${file.content}\r\n`)
	const body = parts.join('') + `--${boundary}--\r\n`
	return api(who, 'POST', url, body, { headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } })
}

// login: getAuthUID answers 401 when LDAP rejects the Basic Auth credentials.
// anw: getStudiensemester answers 403 without any Anwesenheiten permission.
// cis: the CIS4 router answers 401 without basis/cis (prepare_cy_db.sql)
export function checkAccount(account) {
	const entry = { username: account.username }
	return requestAs(account, 'GET', `${CORE_API}/AuthInfo/getAuthUID`).then(res => {
		entry.login = res.status
		entry.uid = res.body?.data?.uid ?? null
		if (res.status !== 200) return entry

		requestAs(account, 'GET', `${API}/InfoApi/getStudiensemester`).then(anw => {
			entry.anw = anw.status
			if (anw.status === 200) state.semesterData = anw.body.data
		})
		requestAs(account, 'GET', '/cis.php').then(cis => { entry.cis = cis.status })
		return cy.wrap(entry)
	})
}

export function needsLogin(...roles) {
	roles.forEach(role => expect(state.loggedIn?.[role], `login and permissions of ${role}, see png/preflight.json`).to.eq(true))
}

export function visitAs(who, url) {
	const account = accountOf(who)
	switchTo(account)
	cy.visit(url, { auth: account })
}
