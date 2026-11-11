// The permission map of a controller as tests

import { account } from './accounts';
import { callEndpoint } from './anwApi';

/**
 * One test without login and one test per role. allowed: { ROLE: [the names of the endpoints that pass the permission
 * check of the role] }. Every other endpoint answers 403, without login every endpoint answers 401.
 * The permission check comes before the parameters, so an empty request is enough
 */
export const itFollowsPermissionMap = (endpoints, allowed) => {
	const all = endpoints.map(endpoint => endpoint.name);

	it('every endpoint without login → 401', () => {
		endpoints.forEach(endpoint => {
			callEndpoint(endpoint, {}, null).then(res => expect(res.status, endpoint.name).to.eq(401));
		});
	});

	Object.entries(allowed).forEach(([role, names]) => {
		const passes = names.length === all.length ? 'every endpoint' : names.join(', ') || 'no endpoint';

		it(`as ${role} → ${passes} passes the permission check, the others answer 403`, () => {
			expect(all, 'the endpoints of the controller').to.include.members(names);

			endpoints.forEach(endpoint => {
				callEndpoint(endpoint, {}, account(role)).then(res => {
					if (names.includes(endpoint.name)) expect(res.status, endpoint.name).to.not.be.oneOf([401, 403]);
					else expect(res.status, endpoint.name).to.eq(403);
				});
			});
		});
	});
};
