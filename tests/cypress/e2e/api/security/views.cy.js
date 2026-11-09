// The pages of the extension (not the API): which role opens which page. The page itself is HTML.

import { account } from '../../../support/accounts';

// the roles of the permission map of each page controller
const PAGES = [
	['Anw', ['LEKTOR', 'ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT']],
	['Kontrolle', ['LEKTOR']],
	['Administration', ['ENT_ASSISTENZ', 'FULL_ASSISTENZ']],
	['Profil', ['ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT']],
].map(([name, roles]) => ({ name, roles, path: `extensions/FHC-Core-Anwesenheiten/${name}/index` }));

// one account per kind of right
const TESTED_ROLES = ['LEKTOR', 'ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT'];

describe('security: the pages of the extension', () => {
	it('every page without login → 401', () => {
		PAGES.forEach(({ name, path }) => {
			cy.fhcGet(path, undefined, null).then(res => expect(res.status, name).to.eq(401));
		});
	});

	// the Auth_Controller of core refuses a logged in user without the permission with 401 too
	TESTED_ROLES.forEach(role => {
		it(`as ${role} → the pages of the role open, the others are refused with 401`, () => {
			PAGES.forEach(({ name, path, roles }) => {
				cy.fhcGet(path, undefined, account(role)).then(res => {
					expect(res.status, name).to.eq(roles.includes(role) ? 200 : 401);
				});
			});
		});
	});
});
