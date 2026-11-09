// KontrolleApi: who may call which endpoint

import { account } from '../../../support/accounts';
import { callEndpoint, infoApi, KONTROLLE_ENDPOINTS, kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { givenKontrolle, readKontrolle } from '../../../support/anwScenario';

describe('KontrolleApi: access', () => {
	const ctx = useAnwContext();

	// the permission check comes before the parameters, so an empty request is enough
	[
		['without login', null, 401],
		['as STUDENT', 'STUDENT', 403],
		['as ENT_ASSISTENZ', 'ENT_ASSISTENZ', 403],
	].forEach(([label, role, status]) => {
		it(`every endpoint ${label} → ${status}`, () => {
			KONTROLLE_ENDPOINTS.forEach(endpoint => {
				callEndpoint(endpoint, {}, role && account(role)).then(res => expect(res.status, endpoint.name).to.eq(status));
			});
		});
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

	it('LEKTOR2 without anw_supplierung changes an entry of the LE of LEKTOR → notAuthorizedForLe, nothing saved', () => {
		infoApi
			.getViewPermissions(account('LEKTOR2'))
			.fhcData()
			.then(permissions => {
				requireFixture(!permissions.supplierung || permissions.legacy_le_selection, 'LEKTOR2 without anw_supplierung');

				givenKontrolle(ctx).then(({ kontrolle, entries }) => {
					kontrolleApi
						.updateAnwesenheiten(
							ctx.le,
							[{ anwesenheit_user_id: entries[0].anwesenheit_user_id, status: ctx.config.abwesend_status }],
							account('LEKTOR2'),
						)
						.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR2')));
					readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
				});
			});
	});

	it('fetchAllAnwesenheitenByLva with an LE of another LV → notAuthorizedForLva', () => {
		kontrolleApi
			.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, [ctx.otherLe], account('LEKTOR'))
			.then(res => expectPhraseError(res, 'global/notAuthorizedForLva', account('LEKTOR')));
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
