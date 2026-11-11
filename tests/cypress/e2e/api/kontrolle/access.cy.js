// KontrolleApi: who may call which endpoint. The substitute and a colleague without the right: kontrolle/supplierung.cy.js

import { account } from '../../../support/accounts';
import { itFollowsPermissionMap } from '../../../support/anwAccess';
import { KONTROLLE_ENDPOINTS, kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { givenKontrolle } from '../../../support/anwScenario';

const ALL = KONTROLLE_ENDPOINTS.map(endpoint => endpoint.name);

describe('KontrolleApi: access', () => {
	const ctx = useAnwContext();

	// the permission map of the constructor: anw_r_lektor or anw_r_full_assistenz on every endpoint
	itFollowsPermissionMap(KONTROLLE_ENDPOINTS, {
		LEKTOR: ALL,
		SUPPL_LEKTOR: ALL,
		FULL_ASSISTENZ: ALL,
		ENT_ASSISTENZ: [],
		ENT_RO: [],
		STUDENT: [],
		NORIGHT: [],
	});

	it('LEKTOR2 reads the LV with the LE of LEKTOR → its students and Kontrollen', () => {
		givenKontrolle(ctx);
		kontrolleApi
			.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, [ctx.le], account('LEKTOR2'))
			.fhcData()
			.then(data => {
				expect(data.students.map(s => s.prestudent_id)).to.include.members(ctx.students.map(s => s.prestudentId));
				expect(data.kontrollen).to.have.length(1);
			});
	});

	[
		['an LE of another LV', () => [ctx.otherLe]],
		['an LE of the LV and an LE of another LV', () => [ctx.le, ctx.otherLe]],
	].forEach(([label, leIds]) => {
		it(`fetchAllAnwesenheitenByLva with ${label} → notAuthorizedForLva`, () => {
			kontrolleApi
				.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, leIds(), account('LEKTOR'))
				.then(res => expectPhraseError(res, 'global/notAuthorizedForLva', account('LEKTOR')));
		});
	});

	it('fetchAllAnwesenheitenByLvaAssigned with an LE of another LV → notAuthorizedForLva', () => {
		kontrolleApi
			.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.otherLe, account('LEKTOR').username, account('LEKTOR'))
			.then(res => expectPhraseError(res, 'global/notAuthorizedForLva', account('LEKTOR')));
	});

	it('getLehreinheitenForLehrveranstaltungAndMaUid for an LV that LEKTOR2 does not teach → notAuthorizedForLva', () => {
		kontrolleApi
			.getLehreinheitenForLehrveranstaltungAndMaUid(
				ctx.otherLv,
				account('LEKTOR').username,
				ctx.otherSemKurzbz,
				account('LEKTOR2'),
			)
			.then(res => expectPhraseError(res, 'global/notAuthorizedForLva', account('LEKTOR2')));
	});

	it('getLehreinheitenForLehrveranstaltungAndMaUid for the LV as LEKTOR2 → the LEs of LEKTOR', () => {
		kontrolleApi
			.getLehreinheitenForLehrveranstaltungAndMaUid(ctx.lvId, account('LEKTOR').username, ctx.semKurzbz, account('LEKTOR2'))
			.fhcData()
			.then(([les]) => expect(les.map(le => le.lehreinheit_id)).to.include(ctx.le));
	});
});
