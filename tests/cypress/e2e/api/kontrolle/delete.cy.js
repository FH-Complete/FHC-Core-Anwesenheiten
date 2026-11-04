// KontrolleApi: delete a Kontrolle with deleteAnwesenheitskontrolle

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { dateParam } from '../../../support/anwDates';
import {
	givenKontrolle,
	givenStatus,
	readKontrolle,
	resetEntschuldigungen,
	resetKontrollen,
} from '../../../support/anwScenario';

describe('KontrolleApi: delete a Kontrolle', () => {
	let ctx;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			resetEntschuldigungen(ctx);
		});
	});

	beforeEach(() => resetKontrollen(ctx));

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

	it('unknown anwesenheit_id → errorDeleteKontrolleKeineLEAnDatum', () => {
		kontrolleApi
			.deleteAnwesenheitskontrolle(ctx.le, dateParam(ctx.today), 0, account('LEKTOR'))
			.then(res => expectPhraseError(res, 'global/errorDeleteKontrolleKeineLEAnDatum', account('LEKTOR')));
	});
});
