// KontrolleApi: delete a Kontrolle with deleteAnwesenheitskontrolle

import { account } from '../../../support/accounts';
import { kontrolleApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { dateParam } from '../../../support/anwDates';
import { givenKontrolle, givenStatus, readKontrolle } from '../../../support/anwScenario';

describe('KontrolleApi: delete a Kontrolle', () => {
	const ctx = useAnwContext();

	const remove = (kontrolle, { le = ctx.le, as = account('LEKTOR') } = {}) =>
		kontrolleApi.deleteAnwesenheitskontrolle(le, dateParam(kontrolle.von.slice(0, 10)), kontrolle.anwesenheit_id, as);

	// the API cannot create an old Kontrolle: the delete reach counts from insertamum
	const backdate = (kontrolle, days) =>
		cy.task('anw:db:backdateKontrolle', { anwesenheitId: kontrolle.anwesenheit_id, leIds: [ctx.le, ctx.foreignLe], days });

	const expectGone = anwesenheitId =>
		readKontrolle(anwesenheitId).should('deep.equal', { kontrolle: null, entries: [], history: 0, codes: [] });

	it('a new Kontrolle with a code and a history row → deleted with its entries, history and code', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, entries }) => {
			givenStatus(ctx, [{ anwesenheit_user_id: entries[0].anwesenheit_user_id, status: ctx.config.anwesend_status }]);
			readKontrolle(kontrolle.anwesenheit_id).its('history').should('eq', 1);

			remove(kontrolle).then(res =>
				expectPhraseText(res, 'global/successDeleteKontrolleEntryAnDatumV2', account('LEKTOR')),
			);
			expectGone(kontrolle.anwesenheit_id);
		});
	});

	it('insertamum KONTROLLE_DELETE_MAX_REACH days ago, LEKTOR → deleted', () => {
		givenKontrolle(ctx).then(({ kontrolle }) => {
			backdate(kontrolle, ctx.config.kontrolleDeleteMaxReach);
			remove(kontrolle).fhcData();
			expectGone(kontrolle.anwesenheit_id);
		});
	});

	it('insertamum one day before the delete reach, LEKTOR → providedDateTooOld, the Kontrolle stays', () => {
		givenKontrolle(ctx).then(({ kontrolle }) => {
			backdate(kontrolle, ctx.config.kontrolleDeleteMaxReach + 1);
			remove(kontrolle).then(res => expectPhraseError(res, 'global/providedDateTooOld', account('LEKTOR')));
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('exist');
		});
	});

	it('insertamum one day before the delete reach, FULL_ASSISTENZ → deleted', () => {
		givenKontrolle(ctx).then(({ kontrolle }) => {
			backdate(kontrolle, ctx.config.kontrolleDeleteMaxReach + 1);
			remove(kontrolle, { as: account('FULL_ASSISTENZ') }).fhcData();
			expectGone(kontrolle.anwesenheit_id);
		});
	});

	it('own le_id with a Kontrolle of the LE of LEKTOR2 → notAuthorizedForLe, the Kontrolle stays', () => {
		givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(({ kontrolle }) => {
			remove(kontrolle, { le: ctx.le }).then(res => expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')));
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('exist');
		});
	});

	it('a delete → one webservicelog row with the deleted Kontrolle, its entries and the user', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			remove(kontrolle).fhcData();

			cy.task('anw:db:readKontrolleLog', { beschreibung: 'AnwKontrolle Delete', anwesenheitId: kontrolle.anwesenheit_id }).then(
				rows => {
					expect(rows).to.have.length(1);
					expect(rows[0].executeUser).to.eq(account('LEKTOR').username);
					const [loggedKontrolle, loggedEntries] = JSON.parse(rows[0].requestData);
					expect(Number(loggedKontrolle.anwesenheit_id)).to.eq(kontrolle.anwesenheit_id);
					expect(loggedEntries.map(e => Number(e.anwesenheit_user_id))).to.have.members(
						entries.map(e => e.anwesenheit_user_id),
					);
				},
			);
		});
	});

	it('unknown anwesenheit_id → errorDeleteKontrolleKeineLEAnDatum', () => {
		kontrolleApi
			.deleteAnwesenheitskontrolle(ctx.le, dateParam(ctx.today), UNKNOWN_ID, account('LEKTOR'))
			.then(res => expectPhraseError(res, 'global/errorDeleteKontrolleKeineLEAnDatum', account('LEKTOR')));
	});
});
