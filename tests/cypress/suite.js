// The Anwesenheiten suite for the Cypress runner of core (cypress.config.js, CY_SUITE).
// The contract is in tests/cypress/suites/readme_suites.txt of core, the suite rules in readme.md.

// the accounts per role; support/accounts.js reads them
const ROLES = ['LEKTOR', 'LEKTOR2', 'ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT', 'STUDENT2'];

module.exports = {
	specPattern: 'e2e/**/*.cy.js',

	registerTasks(on, core) {
		require('./tasks/anwDb').registerAnwDbTasks(on, core.db);
	},

	env: Object.fromEntries(
		ROLES.flatMap(role => [`ANW_${role}_USER`, `ANW_${role}_PASSWORD`]).map(key => [key, process.env[key] || null])
	),
};
