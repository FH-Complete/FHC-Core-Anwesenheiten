// Requests without parameters. A POST needs a body with its keys: missingParameters. A GET answers with its default
// or with a phrase error. No answer holds the text of a PHP or database error.

import { account } from '../../../support/accounts';
import {
	ADMINISTRATION_ENDPOINTS,
	INFO_ENDPOINTS,
	KONTROLLE_ENDPOINTS,
	PROFIL_ENDPOINTS,
} from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';

// the role passes the permission map of every endpoint of the controller
const CONTROLLERS = [
	['InfoApi', INFO_ENDPOINTS, 'FULL_ASSISTENZ'],
	['KontrolleApi', KONTROLLE_ENDPOINTS, 'LEKTOR'],
	['ProfilApi', PROFIL_ENDPOINTS, 'STUDENT'],
	['AdministrationApi', ADMINISTRATION_ENDPOINTS, 'ENT_ASSISTENZ'],
];

// the endpoints that read a form, not JSON
const FORMS = ['addEntschuldigung', 'editEntschuldigung'];

// the answer of each GET endpoint without query parameters: the phrase of its error, null for its default
const GET_WITHOUT_PARAMETERS = {
	getStudiensemester: null,
	getViewDataStudent: null,
	getViewPermissions: null,
	getLektorLessons: null,
	getStudentInfo: 'wrongParameters',
	getLektorsForLvaInSemester: 'wrongParameters',
	getStudentsForLvaInSemester: 'wrongParameters',
	getLehreinheitenForLehrveranstaltung: 'wrongParameters',
	getLehreinheitenForLehrveranstaltungAndMaUid: 'wrongParameters',
	getAllAnwesenheitenByStudentByLva: 'notAuthorizedForLva',
	getAllAnwByUID: 'noAuthorization',
	getAllAnwQuotasForLvaByUID: 'noAuthorization',
};

describe('security: requests without parameters', () => {
	const ctx = useAnwContext({ resets: [] });

	CONTROLLERS.forEach(([controller, endpoints, role]) => {
		const as = () => account(role);

		it(`${controller}: every POST endpoint with an empty body and without a body → missingParameters`, function () {
			// an Entschuldigung endpoint answers with the config value before it reads the request
			const entschuldigungen = ['ProfilApi', 'AdministrationApi'].includes(controller);
			skipIf(this, entschuldigungen && !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');

			endpoints
				.filter(endpoint => endpoint.method === 'POST')
				.forEach(({ name, url }) => {
					const requests = [cy.fhcPost(url, {}, as()), cy.fhcPost(url, undefined, as())];
					if (FORMS.includes(name)) requests.push(cy.fhcUpload(url, {}, null, as()));

					requests.forEach(request =>
						request.then(res => {
							expectNoDbText(res);
							expectPhraseError(res, 'global/missingParameters', as());
						}),
					);
				});
		});

		it(`${controller}: every GET endpoint without query parameters → its default or its phrase error`, () => {
			endpoints
				.filter(endpoint => endpoint.method === 'GET')
				.forEach(({ name, url }) => {
					expect(GET_WITHOUT_PARAMETERS, 'the expected answer of the endpoint').to.have.property(name);
					const phrase = GET_WITHOUT_PARAMETERS[name];

					cy.fhcGet(url, undefined, as()).then(res => {
						expectNoDbText(res);
						if (phrase) expectPhraseError(res, `global/${phrase}`, as());
						else expect(res.status, name).to.eq(200);
					});
				});
		});
	});
});
