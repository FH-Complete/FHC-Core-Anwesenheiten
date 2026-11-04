// Checks the setup of the suite on the instance: the accounts and the database.

import { account, ROLES } from '../../support/accounts';

describe('suite setup', () => {
	ROLES.forEach(role => {
		it(`login as ${role} → session`, () => {
			const { username, password } = account(role);
			cy.login(username, password);
		});
	});

	it('database of the instance → reachable, writes allowed', () => {
		cy.task('anw:db:available').should('deep.equal', { available: true });
	});
});
