// InfoApi: who may call which endpoint

import { itFollowsPermissionMap } from '../../../support/anwAccess';
import { INFO_ENDPOINTS } from '../../../support/anwApi';

const ALL = INFO_ENDPOINTS.map(endpoint => endpoint.name);
const allExcept = (...names) => ALL.filter(name => !names.includes(name));

// the lists of an LV for the staff
const STAFF_LISTS = ['getLektorsForLvaInSemester', 'getStudentsForLvaInSemester'];

describe('InfoApi: access', () => {
	// the permission map of the constructor. Every right of it is a read right, so ENT_RO passes like ENT_ASSISTENZ
	itFollowsPermissionMap(INFO_ENDPOINTS, {
		FULL_ASSISTENZ: ALL,
		ENT_ASSISTENZ: ALL,
		ENT_RO: ALL,
		LEKTOR: allExcept(...STAFF_LISTS),
		STUDENT: allExcept(...STAFF_LISTS, 'getLektorLessons'),
		STUDENT_NOENT: allExcept(...STAFF_LISTS, 'getLektorLessons'),
		NORIGHT: [],
	});
});
