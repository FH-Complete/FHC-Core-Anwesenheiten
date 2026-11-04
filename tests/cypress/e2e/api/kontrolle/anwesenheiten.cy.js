// KontrolleApi: the status of entries with updateAnwesenheiten

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { givenKontrolle, readKontrolle, resetEntschuldigungen, resetKontrollen } from '../../../support/anwScenario';

describe('KontrolleApi: change the status of entries', () => {
	let ctx;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			resetEntschuldigungen(ctx);
		});
	});

	beforeEach(() => resetKontrollen(ctx));

	const update = (entries, { le = ctx.le, as = account('LEKTOR') } = {}) =>
		kontrolleApi.updateAnwesenheiten(le, entries, as);

	const entryOf = (anwesenheitId, anwesenheitUserId) =>
		readKontrolle(anwesenheitId).then(({ entries }) => entries.find(e => e.anwesenheit_user_id === anwesenheitUserId));

	it('anwesend → abwesend → saved, version + 1, a history row with anwesend', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			update([{ anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.abwesend_status }]).fhcData();

			entryOf(kontrolle.anwesenheit_id, entry.anwesenheit_user_id).then(changed => {
				expect(changed.status).to.eq(ctx.config.abwesend_status);
				expect(changed.version).to.eq(entry.version + 1);
			});
			cy.task('anw:db:readHistory', { anwesenheitUserIds: [entry.anwesenheit_user_id] })
				.then(history => history.map(row => row.status))
				.should('deep.equal', [ctx.config.anwesend_status]);
		});
	});

	it('status fehlminuten with 1 and with the counted duration − 1 → saved', () => {
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			const fehlminuten = ctx.config.fehlminuten_status;
			expect(kontrolle.dauer, 'counted minutes of 08:00 - 09:30').to.be.greaterThan(2);

			update([{ anwesenheit_user_id: id, status: fehlminuten, fehlminuten: 1 }]).fhcData();
			entryOf(kontrolle.anwesenheit_id, id).should('include', { status: fehlminuten, fehlminuten: 1 });

			const max = kontrolle.dauer - 1;
			update([{ anwesenheit_user_id: id, status: fehlminuten, fehlminuten: max }]).fhcData();
			entryOf(kontrolle.anwesenheit_id, id).should('include', { status: fehlminuten, fehlminuten: max });
		});
	});

	[
		['0', () => 0],
		['the counted duration', kontrolle => kontrolle.dauer],
		['"abc"', () => 'abc'],
	].forEach(([label, value]) => {
		it(`status fehlminuten with ${label} → anwFehlminutenUngueltig, nothing saved`, () => {
			givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle, entries }) => {
				update([
					{ anwesenheit_user_id: entries[0].anwesenheit_user_id, status: ctx.config.fehlminuten_status, fehlminuten: value(kontrolle) },
				]).then(res => expectPhraseError(res, 'global/anwFehlminutenUngueltig', account('LEKTOR')));
				readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
			});
		});
	});

	it('status fehlminuten → anwesend → the Fehlminuten are 0', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			update([{ anwesenheit_user_id: id, status: ctx.config.fehlminuten_status, fehlminuten: 30 }]).fhcData();
			update([{ anwesenheit_user_id: id, status: ctx.config.anwesend_status }]).fhcData();

			entryOf(kontrolle.anwesenheit_id, id).should('include', { status: ctx.config.anwesend_status, fehlminuten: 0 });
		});
	});

	it('an entry of the LE of LEKTOR2 in the list → notAuthorizedForLe, nothing saved', () => {
		givenKontrolle(ctx).then(own => {
			givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(foreign => {
				update([
					{ anwesenheit_user_id: own.entries[0].anwesenheit_user_id, status: ctx.config.abwesend_status },
					{ anwesenheit_user_id: foreign.entries[0].anwesenheit_user_id, status: ctx.config.abwesend_status },
				]).then(res => expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')));

				readKontrolle(own.kontrolle.anwesenheit_id).its('entries').should('deep.equal', own.entries);
				readKontrolle(foreign.kontrolle.anwesenheit_id).its('entries').should('deep.equal', foreign.entries);
			});
		});
	});

	it('an entry without anwesenheit_user_id → wrongParameters, nothing saved', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			update([{ status: ctx.config.abwesend_status }]).then(res =>
				expectPhraseError(res, 'global/wrongParameters', account('LEKTOR')),
			);
			readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
		});
	});

	it('an empty list → success, nothing changed', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			update([]).fhcData().should('deep.equal', []);
			readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
		});
	});
});
