// Screenshot run for ../wiki_anwesenheit.dokuwiki.txt, see README.md.
// Run from a folder that holds the cypress package:
//   npx cypress run --project <extension>/wiki_screenshots
const fs = require('fs');
const path = require('path');

function readEnv(file) {
	const out = {};
	if (!fs.existsSync(file)) return out;
	for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (m) out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
	}
	return out;
}

// base url and accounts from .env in this folder (template: .env.example)
const ENV_FILE = path.join(__dirname, '.env');
const env = readEnv(ENV_FILE);

const account = (user, pass) => (env[user] && env[pass]) ? { username: env[user], password: env[pass] } : null;

// the spec takes the first lektor that logs in and teaches a test student
const lektoren = [account('USER_NAME', 'USER_PASSWORD')].filter(Boolean);

const accounts = {
	assistenz: account('ASSISTENZ_NAME', 'ASSISTENZ_PASSWORD'),
	admin: account('ADMIN_NAME', 'ADMIN_PASSWORD'),
	student1: account('STUDENT1_NAME', 'STUDENT1_PASSWORD'),
	student2: account('STUDENT2_NAME', 'STUDENT2_PASSWORD'),
};

const missing = [
	!env.BASE_URL && 'BASE_URL',
	!lektoren.length && 'USER_NAME/USER_PASSWORD',
	!accounts.assistenz && 'ASSISTENZ_NAME/ASSISTENZ_PASSWORD',
	!accounts.admin && 'ADMIN_NAME/ADMIN_PASSWORD (the seed runs as admin)',
	!accounts.student1 && 'STUDENT1_NAME/STUDENT1_PASSWORD',
	!accounts.student2 && 'STUDENT2_NAME/STUDENT2_PASSWORD',
].filter(Boolean);
if (missing.length) throw new Error('Missing in ' + ENV_FILE + ' (see .env.example): ' + missing.join(', '));

// browser window of the run: viewport 1440x900 plus the Cypress side panel and header
const WINDOW = [2400, 1300];

// the phrase keys of the extension code, per category: $p.t('cat/key'), $p.t('cat', 'key'), $this->p->t('cat', 'key').
// Keys built at runtime stay out
const EXTENSION = path.resolve(__dirname, '..');
const PHRASE_DIRS = ['public/js', 'controllers', 'libraries', 'views', 'widgets', 'config'];
const PHRASE_PATTERNS = [
	/\$?\bp\.t\(\s*['"`]([A-Za-z0-9_]+)\/([A-Za-z0-9_]+)['"`]/g,
	/\$?\bp(?:\.|->)t\(\s*['"]([A-Za-z0-9_]+)['"]\s*,\s*['"]([A-Za-z0-9_]+)['"]/g,
];

function usedPhrases() {
	const found = {};
	const walk = dir => {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (/\.(js|php)$/.test(entry.name)) {
				const text = fs.readFileSync(full, 'utf8');
				for (const pattern of PHRASE_PATTERNS) {
					for (const m of text.matchAll(pattern)) (found[m[1]] = found[m[1]] || new Set()).add(m[2]);
				}
			}
		}
	};
	PHRASE_DIRS.forEach(dir => walk(path.join(EXTENSION, dir)));
	return Object.fromEntries(Object.entries(found).map(([cat, keys]) => [cat, [...keys].sort()]));
}

// the media files the wiki text uses, {{ :extension:<name>.png }}
function wikiMedia() {
	const wiki = path.join(EXTENSION, 'wiki_anwesenheit.dokuwiki.txt');
	if (!fs.existsSync(wiki)) return [];
	return [...new Set([...fs.readFileSync(wiki, 'utf8').matchAll(/:extension:([A-Za-z0-9_-]+\.png)/g)].map(m => m[1]))];
}

module.exports = {
	allowCypressEnv: true,
	screenshotsFolder: 'png',
	fixturesFolder: 'fixtures',
	video: false,
	trashAssetsBeforeRuns: false,
	viewportWidth: 1440,
	viewportHeight: 900,
	defaultCommandTimeout: 20000,
	pageLoadTimeout: 60000,

	e2e: {
		baseUrl: env.BASE_URL.replace(/\/+$/, ''),
		specPattern: '*.cy.js',
		supportFile: false,

		setupNodeEvents(on, config) {
			// png/<name>.png instead of png/<spec>/<name>.png, the names match the wiki media names
			on('after:screenshot', (details) => {
				const target = path.join(config.screenshotsFolder, path.basename(details.path));
				if (details.path === target) return;
				fs.renameSync(details.path, target);
				try { fs.rmdirSync(path.dirname(details.path)); } catch (e) { /* folder not empty yet */ }
				return { path: target };
			});

			// the failure screenshots and reports of the last run would mix with the new ones
			on('before:run', () => {
				if (!fs.existsSync(config.screenshotsFolder)) return;
				for (const file of fs.readdirSync(config.screenshotsFolder)) {
					if (file.endsWith('(failed).png') || file.endsWith('.json')) fs.unlinkSync(path.join(config.screenshotsFolder, file));
				}
			});

			// headless browsers start with a 1280x720 window. The viewport and the Cypress side panel do not fit,
			// Cypress scales the page down and a viewport screenshot cuts it at the window edge
			on('before:browser:launch', (browser, launchOptions) => {
				if (browser.name === 'electron') {
					launchOptions.preferences.width = WINDOW[0];
					launchOptions.preferences.height = WINDOW[1];
				} else if (browser.family === 'chromium') {
					launchOptions.args.push(`--window-size=${WINDOW.join(',')}`, '--force-device-scale-factor=1');
				} else if (browser.family === 'firefox') {
					launchOptions.args.push(`--width=${WINDOW[0]}`, `--height=${WINDOW[1]}`);
				}
				return launchOptions;
			});

			on('task', { usedPhrases, wikiMedia });
			return config;
		},
	},

	// the server checks the password with LDAP and lowercases the uid itself, so pass the names as they are
	env: { lektoren, ...accounts },
};
