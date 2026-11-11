// AdministrationApi: who may call which endpoint

import { itFollowsPermissionMap } from '../../../support/anwAccess';
import { ADMINISTRATION_ENDPOINTS } from '../../../support/anwApi';

const ALL = ADMINISTRATION_ENDPOINTS.map(endpoint => endpoint.name);

describe('AdministrationApi: access', () => {
	// the permission map of the constructor. Only updateEntschuldigung needs a write right
	itFollowsPermissionMap(ADMINISTRATION_ENDPOINTS, {
		ENT_ASSISTENZ: ALL,
		FULL_ASSISTENZ: ALL,
		ENT_RO: ALL.filter(name => name !== 'updateEntschuldigung'),
		LEKTOR: [],
		STUDENT: [],
		NORIGHT: [],
	});
});
