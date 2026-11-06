// The Anwesenheiten suite for the Cypress project of core (tests/cypress, CY_SUITE).
// The contract is in tests/cypress/suites/readme_suites.txt of core, the suite rules in readme.md.

// the accounts per role; support/accounts.js reads them
const ROLES = ['LEKTOR', 'LEKTOR2', 'ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT', 'STUDENT2'];

// the keys of .env.example that the specs read
const env = () =>
	Object.fromEntries(
		ROLES.flatMap(role => [`ANW_${role}_USER`, `ANW_${role}_PASSWORD`]).map(key => [key, process.env[key] || null])
	);

module.exports = {
	specPattern: 'e2e/**/*.cy.js',

	setupNodeEvents(on, config, core) {
		require('./tasks/anwDb').registerAnwDbTasks(on, core.db);

		// a value from --env wins over the .env of the suite
		config.env = { ...env(), ...config.env };
		return config;
	},
};
