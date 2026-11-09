// ProfilApi: who may call which endpoint. The ids of another student: profil/idor.cy.js

import { account } from '../../../support/accounts';
import { callEndpoint, PROFIL_ENDPOINTS } from '../../../support/anwApi';

describe('ProfilApi: access', () => {
	// the permission check comes before the parameters, so an empty request is enough
	it('every endpoint without login → 401', () => {
		PROFIL_ENDPOINTS.forEach(endpoint => {
			callEndpoint(endpoint, {}, null).then(res => expect(res.status, endpoint.name).to.eq(401));
		});
	});

	// the endpoints that the permission map of the controller opens to the role
	[
		['LEKTOR', ['getAnwesenheitSumByLva']],
		['ENT_ASSISTENZ', ['getTimeline']],
	].forEach(([role, allowed]) => {
		it(`as ${role} → 403 on every endpoint except ${allowed.join(', ')}`, () => {
			PROFIL_ENDPOINTS.forEach(endpoint => {
				callEndpoint(endpoint, {}, account(role)).then(res => {
					if (allowed.includes(endpoint.name)) expect(res.status, endpoint.name).to.not.be.oneOf([401, 403]);
					else expect(res.status, endpoint.name).to.eq(403);
				});
			});
		});
	});
});
