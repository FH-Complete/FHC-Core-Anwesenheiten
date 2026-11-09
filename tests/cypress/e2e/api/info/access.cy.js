// InfoApi: who may call which endpoint

import { account } from '../../../support/accounts';
import { callEndpoint, INFO_ENDPOINTS } from '../../../support/anwApi';

// the endpoints of the staff, from the permission map of the controller
const STAFF_LISTS = ['getLektorsForLvaInSemester', 'getStudentsForLvaInSemester'];

describe('InfoApi: access', () => {
	const forbidden = {
		STUDENT: [...STAFF_LISTS, 'getLektorLessons'],
		LEKTOR: STAFF_LISTS,
		ENT_ASSISTENZ: [],
		FULL_ASSISTENZ: [],
	};

	// the permission check comes before the parameters, so an empty request is enough
	it('every endpoint without login → 401', () => {
		INFO_ENDPOINTS.forEach(endpoint => {
			callEndpoint(endpoint, {}, null).then(res => expect(res.status, endpoint.name).to.eq(401));
		});
	});

	Object.entries(forbidden).forEach(([role, names]) => {
		it(`as ${role} → 403 on ${names.length ? names.join(', ') : 'no endpoint'}, the others pass the permission check`, () => {
			INFO_ENDPOINTS.forEach(endpoint => {
				callEndpoint(endpoint, {}, account(role)).then(res => {
					if (names.includes(endpoint.name)) expect(res.status, endpoint.name).to.eq(403);
					else expect(res.status, endpoint.name).to.not.be.oneOf([401, 403]);
				});
			});
		});
	});
});
