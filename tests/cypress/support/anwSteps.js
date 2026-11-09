// The steps of a scenario chain: one it per chain, a failure names its step

let current = '';

Cypress.on('test:before:run', () => {
	current = '';
});

Cypress.on('fail', err => {
	if (current) err.message = `[step: ${current}] ${err.message}`;
	throw err;
});

/** Runs fn as the step name of the chain. fn queues Cypress commands like a test body */
export const step = (name, fn) =>
	cy.then(() => {
		current = name;
		Cypress.log({ name: 'step', message: name });
	}).then(fn);
