// The pages of the extension (not the API): which role opens which page. The page itself is HTML.

import { account } from '../../../support/accounts';

const BASE = 'extensions/FHC-Core-Anwesenheiten';

// the page controllers with the routes of config/routes.php and the roles of their permission map.
// Every right of a page except anw_r_full_assistenz on Anw is a write right, so ENT_RO opens no page
const PAGES = [
	{ name: 'Anw', routes: ['Anw/index'], roles: ['LEKTOR', 'ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT', 'STUDENT_NOENT'] },
	{ name: 'Kontrolle', routes: ['Kontrolle/index', 'Kontrolle/x', 'kontrolle/x', 'Lektor/x', 'lektor/x'], roles: ['LEKTOR'] },
	{
		name: 'Administration',
		routes: ['Administration/index', 'Administration/x', 'administration/x', 'Assistenz/x', 'assistenz/x'],
		roles: ['ENT_ASSISTENZ', 'FULL_ASSISTENZ'],
	},
	{
		name: 'Profil',
		routes: ['Profil/index', 'Profil/x', 'profil/x', 'Student/x', 'student/x', 'Profil/Scan/00000000'],
		roles: ['ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT', 'STUDENT_NOENT'],
	},
];

// the download of a document has the permission map of the Profil page. Without a dms_id it answers with an error page
const FILE = { route: 'Profil/getEntschuldigungFile', roles: ['ENT_ASSISTENZ', 'FULL_ASSISTENZ', 'STUDENT', 'STUDENT_NOENT'] };

// one account per kind of right
const TESTED_ROLES = ['LEKTOR', 'ENT_ASSISTENZ', 'ENT_RO', 'FULL_ASSISTENZ', 'STUDENT', 'STUDENT_NOENT', 'NORIGHT'];

describe('security: the pages of the extension', () => {
	const open = (route, as) => cy.fhcGet(`${BASE}/${route}`, undefined, as);

	it('every page without login → 401', () => {
		[...PAGES.flatMap(page => page.routes), FILE.route].forEach(route => {
			open(route, null).then(res => expect(res.status, route).to.eq(401));
		});
	});

	// the Auth_Controller of core refuses a logged in user without the permission with 401 too
	TESTED_ROLES.forEach(role => {
		const opens = PAGES.filter(page => page.roles.includes(role)).map(page => page.name);

		it(`as ${role} → ${opens.join(', ') || 'no page'} opens on every route, the others are refused with 401`, () => {
			PAGES.forEach(({ routes, roles }) => {
				routes.forEach(route => {
					open(route, account(role)).then(res => expect(res.status, route).to.eq(roles.includes(role) ? 200 : 401));
				});
			});

			open(FILE.route, account(role)).then(res => {
				if (FILE.roles.includes(role)) expect(res.status, FILE.route).to.not.eq(401);
				else expect(res.status, FILE.route).to.eq(401);
			});
		});
	});
});
