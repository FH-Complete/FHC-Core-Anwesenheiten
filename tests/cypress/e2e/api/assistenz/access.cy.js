// AdministrationApi: who may call which endpoint

import { account } from '../../../support/accounts';
import { ADMINISTRATION_ENDPOINTS, callEndpoint } from '../../../support/anwApi';

describe('AdministrationApi: access', () => {
	[
		['without login', null, 401],
		['as LEKTOR', 'LEKTOR', 403],
		['as STUDENT', 'STUDENT', 403],
	].forEach(([label, role, status]) => {
		it(`every endpoint ${label} → ${status}`, () => {
			// the permission check comes before the parameters, so an empty request is enough
			ADMINISTRATION_ENDPOINTS.forEach(endpoint => {
				callEndpoint(endpoint, {}, role && account(role)).then(res => expect(res.status, endpoint.name).to.eq(status));
			});
		});
	});
});
