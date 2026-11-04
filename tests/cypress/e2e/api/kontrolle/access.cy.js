// KontrolleApi: who may call which endpoint

import { account } from '../../../support/accounts';
import { infoApi, kontrolleApi, KONTROLLE_ENDPOINTS } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { givenKontrolle, readKontrolle, resetEntschuldigungen, resetKontrollen } from '../../../support/anwScenario';

describe('KontrolleApi: access', () => {
	let ctx;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			resetEntschuldigungen(ctx);
		});
	});

	beforeEach(() => resetKontrollen(ctx));

	// the permission check comes before the parameters, so an empty request is enough
	const call = ({ method, url }, acc) => (method === 'GET' ? cy.fhcGet(url, {}, acc) : cy.fhcPost(url, {}, acc));

	[
		['without login', null, 401],
		['as STUDENT', 'STUDENT', 403],
		['as ENT_ASSISTENZ', 'ENT_ASSISTENZ', 403],
	].forEach(([label, role, status]) => {
		it(`every endpoint ${label} → ${status}`, () => {
			KONTROLLE_ENDPOINTS.forEach(endpoint => {
				call(endpoint, role && account(role)).then(res => expect(res.status, endpoint.name).to.eq(status));
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

	it('LEKTOR2 without anw_supplierung changes an entry of the LE of LEKTOR → notAuthorizedForLe, nothing saved', function () {
		infoApi
			.getViewPermissions(account('LEKTOR2'))
			.fhcData()
			.then(permissions => {
				skipIf(this, permissions.supplierung && !permissions.legacy_le_selection, 'LEKTOR2 has anw_supplierung');

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

	it('fetchAllAnwesenheitenByLva with an LE of another LV → notAuthorizedForLva', function () {
		skipIf(this, !ctx.otherLe, 'LEKTOR teaches no other LV');

		kontrolleApi
			.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, [ctx.otherLe], account('LEKTOR'))
			.then(res => expectPhraseError(res, 'global/notAuthorizedForLva', account('LEKTOR')));
	});

	it('fetchAllAnwesenheitenByLvaAssigned with an LE of another LV → rejected', function () {
		skipIf(this, !ctx.otherLe, 'LEKTOR teaches no other LV');

		kontrolleApi
			.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.otherLe, account('LEKTOR').username, account('LEKTOR'))
			.fhcErrors();
	});

	it('getLehreinheitenForLehrveranstaltungAndMaUid for an LV that LEKTOR2 does not teach → notAuthorizedForLva', function () {
		skipIf(this, !ctx.otherLv, 'LEKTOR teaches no LV without LEKTOR2');

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
