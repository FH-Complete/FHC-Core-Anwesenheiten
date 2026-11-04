// KontrolleApi: new times for a Kontrolle with updateKontrolle

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { timeParam } from '../../../support/anwDates';
import {
	countedMinutes,
	givenKontrolle,
	givenStatus,
	readKontrolle,
	resetEntschuldigungen,
	resetKontrollen,
} from '../../../support/anwScenario';

describe('KontrolleApi: change the times of a Kontrolle', () => {
	let ctx;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			resetEntschuldigungen(ctx);
		});
	});

	beforeEach(() => resetKontrollen(ctx));

	const update = (anwesenheitId, von, bis, { le = ctx.le, as = account('LEKTOR') } = {}) =>
		kontrolleApi.updateKontrolle(le, anwesenheitId, timeParam(von), timeParam(bis), as);

	it('new times → saved, the entries stay', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			update(kontrolle.anwesenheit_id, '10:00', '11:15').fhcData();

			readKontrolle(kontrolle.anwesenheit_id).then(after => {
				expect(after.kontrolle).to.include({ von: `${ctx.today} 10:00:00`, bis: `${ctx.today} 11:15:00` });
				expect(after.entries).to.deep.equal(entries);
			});
		});
	});

	it('new times that overlap only the old times of the same Kontrolle → saved', () => {
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			update(kontrolle.anwesenheit_id, '08:30', '10:00').fhcData();
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle.von').should('eq', `${ctx.today} 08:30:00`);
		});
	});

	it('new times that overlap another Kontrolle → errorKontrolleTimesCollide, the old times stay', () => {
		givenKontrolle(ctx, { von: '10:00', bis: '11:00' });
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			update(kontrolle.anwesenheit_id, '09:00', '10:30').then(res =>
				expectPhraseError(res, 'global/errorKontrolleTimesCollide', account('LEKTOR')),
			);
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('deep.equal', kontrolle);
		});
	});

	// Fehlminuten for a Kontrolle from 08:00 to 09:30 that then gets 08:00 to 09:00: shorter is the counted duration of
	// the new times plus delta. The counted minutes depend on the Stunden raster of the instance.
	const givenFehlminutenThenShorten = delta =>
		countedMinutes(ctx.today, '08:00', '09:00').then(shorter =>
			givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(state => {
				expect(shorter, 'counted minutes of 08:00 - 09:00').to.be.within(2, state.kontrolle.dauer - 1);
				givenStatus(ctx, [
					{
						anwesenheit_user_id: state.entries[0].anwesenheit_user_id,
						status: ctx.config.fehlminuten_status,
						fehlminuten: shorter + delta,
					},
				]);
				return update(state.kontrolle.anwesenheit_id, '08:00', '09:00').then(res => ({ res, kontrolle: state.kontrolle }));
			}),
		);

	it('new duration one minute longer than the Fehlminuten of an entry → saved', () => {
		givenFehlminutenThenShorten(-1).then(({ res, kontrolle }) => {
			cy.wrap(res).fhcData();
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle.bis').should('eq', `${ctx.today} 09:00:00`);
		});
	});

	it('new duration equal to the Fehlminuten of an entry → anwKontrolleKuerzerAlsFehlminutenV2, the old times stay', () => {
		givenFehlminutenThenShorten(0).then(({ res, kontrolle }) => {
			expectPhraseError(res, 'global/anwKontrolleKuerzerAlsFehlminutenV2', account('LEKTOR'));
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('deep.equal', kontrolle);
		});
	});

	it('Kontrolle of the LE of LEKTOR2, own le_id in the request → notAuthorizedForLe, the old times stay', () => {
		givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(({ kontrolle }) => {
			update(kontrolle.anwesenheit_id, '10:00', '11:00', { le: ctx.le }).then(res =>
				expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')),
			);
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('deep.equal', kontrolle);
		});
	});
});
