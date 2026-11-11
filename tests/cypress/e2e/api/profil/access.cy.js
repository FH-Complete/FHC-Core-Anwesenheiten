// ProfilApi: who may call which endpoint. The ids of another student: profil/idor.cy.js

import { itFollowsPermissionMap } from '../../../support/anwAccess';
import { PROFIL_ENDPOINTS } from '../../../support/anwApi';

const ALL = PROFIL_ENDPOINTS.map(endpoint => endpoint.name);

// the endpoints with the right anw_stud_ent
const ENTSCHULDIGUNGEN = ['addEntschuldigung', 'editEntschuldigung', 'deleteEntschuldigung', 'getEntschuldigungenByPersonID'];

describe('ProfilApi: access', () => {
	// the permission map of the constructor
	itFollowsPermissionMap(PROFIL_ENDPOINTS, {
		STUDENT: ALL,
		STUDENT_NOENT: ALL.filter(name => !ENTSCHULDIGUNGEN.includes(name)),
		FULL_ASSISTENZ: ALL,
		LEKTOR: ['getAnwesenheitSumByLva'],
		ENT_ASSISTENZ: ['getTimeline'],
		ENT_RO: ['getTimeline'],
		NORIGHT: [],
	});
});
