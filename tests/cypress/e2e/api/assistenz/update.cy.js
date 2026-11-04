// AdministrationApi: the decision and the edit of an Entschuldigung (updateEntschuldigung)

import { account } from '../../../support/accounts';
import { administrationApi } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText, skipIf } from '../../../support/anwChecks';
import { loadAnwContext, loadAssistenzScope, studentInLe } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import {
	decide,
	entryOf,
	givenEntschuldigung,
	givenKontrolle,
	readEntschuldigung,
	readKontrolle,
	resetEntschuldigungen,
	resetKontrollen,
	seedEntschuldigung,
} from '../../../support/anwScenario';

describe('AdministrationApi: decide and edit an Entschuldigung', () => {
	let ctx;
	let student;
	let scope;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			student = studentInLe(ctx);
			expect(student, 'a test student in the test LE').to.exist;
			loadAssistenzScope(ctx).then(loadedScope => {
				scope = loadedScope;
			});
		});
	});

	beforeEach(function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		resetKontrollen(ctx);
		resetEntschuldigungen(ctx);
	});

	const at = time => `${ctx.today} ${time}:00`;
	const givenOpen = (von = '07:00', bis = '12:00', owner = student, as = undefined) =>
		givenEntschuldigung(owner, { von: at(von), bis: at(bis), as }).its('entschuldigung');

	// the id as a string, like AssistenzComponent
	const update = (entschuldigung, status, { notiz = '', range, as = account('ENT_ASSISTENZ') } = {}) =>
		administrationApi.updateEntschuldigung(String(entschuldigung.entschuldigung_id), status, notiz, as, range);

	const stored = (entschuldigung, owner = student) => readEntschuldigung(entschuldigung.entschuldigung_id, owner);
	const statusNow = kontrolle => readKontrolle(kontrolle.anwesenheit_id).then(state => entryOf(state, student).status);

	it('accept → akzeptiert, statussetvon, version + 1, one history row', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, true).then(res =>
				expectPhraseText(res, 'global/successUpdateEntschuldigung', account('ENT_ASSISTENZ')),
			);
			stored(entschuldigung).then(({ entschuldigung: after, history }) => {
				expect(after).to.include({
					akzeptiert: true,
					statussetvon: account('ENT_ASSISTENZ').username.toLowerCase(),
					version: entschuldigung.version + 1,
				});
				expect(history).to.eq(1);
			});
		});
	});

	it('decline with a notiz → akzeptiert false and the notiz', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, false, { notiz: 'Bestätigung fehlt' }).fhcData();
			stored(entschuldigung).its('entschuldigung').should('include', { akzeptiert: false, notiz: 'Bestätigung fehlt' });
		});
	});

	it('a notiz with 300 characters → stored with 255', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, false, { notiz: 'x'.repeat(300) }).fhcData();
			stored(entschuldigung).its('entschuldigung.notiz').should('have.length', 255);
		});
	});

	it('the same decision a second time → it stays accepted, the entry stays entschuldigt', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen().then(entschuldigung => {
				update(entschuldigung, true).fhcData();
				update(entschuldigung, true).fhcData();
				stored(entschuldigung).its('entschuldigung.akzeptiert').should('eq', true);
				statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('an unknown entschuldigung_id → wrongParameters', () => {
		update({ entschuldigung_id: 999999999 }, true).then(res =>
			expectPhraseError(res, 'global/wrongParameters', account('ENT_ASSISTENZ')),
		);
	});

	it('a new range of an open one without a decision → saved, it stays open', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, null, { range: { von: at('09:00'), bis: at('11:00') } }).fhcData();
			stored(entschuldigung)
				.its('entschuldigung')
				.should('include', { von: at('09:00'), bis: at('11:00'), akzeptiert: null });
		});
	});

	it('a new range with bis on a day before von → errorValidateTimes, the range stays', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, null, { range: { von: at('09:00'), bis: `${addDays(ctx.today, -1)} 11:00:00` } }).then(res =>
				expectPhraseError(res, 'global/errorValidateTimes', account('ENT_ASSISTENZ')),
			);
			stored(entschuldigung).its('entschuldigung').should('include', { von: at('07:00'), bis: at('12:00') });
		});
	});

	it('status "x" → the entry and the Entschuldigung stay, wrongParameters', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen().then(entschuldigung => {
				update(entschuldigung, 'x').then(res => {
					// the stored state first: it shows a half done update
					statusNow(kontrolle).should('eq', ctx.config.abwesend_status);
					stored(entschuldigung).its('entschuldigung.akzeptiert').should('eq', null);
					expectPhraseError(res, 'global/wrongParameters', account('ENT_ASSISTENZ'));
				});
			});
		});
	});

	it('status null on an accepted one → rejected, it stays accepted and the entry entschuldigt', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen().then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, true);
				update(entschuldigung, null).fhcErrors();
				stored(entschuldigung).its('entschuldigung.akzeptiert').should('eq', true);
				statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('accept with a new range in the same request → the Kontrolle in the new range gets entschuldigt', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen('07:00', '07:30').then(entschuldigung => {
				update(entschuldigung, true, { range: { von: at('07:00'), bis: at('12:00') } }).fhcData();
				statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('a new range of an accepted one, status unchanged → the entries follow the new range', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen('07:00', '10:00').then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, true);
				statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);

				// the edit modal sends the current status with the new range
				update(entschuldigung, true, { range: { von: at('10:00'), bis: at('12:00') } }).fhcData();
				statusNow(kontrolle).should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('ENT_ASSISTENZ decides one of a Studiengang outside its rights → rejected, it stays open', function () {
		skipIf(this, !scope.outsider, 'ENT_ASSISTENZ has a right on every Studiengang');

		seedEntschuldigung(ctx, scope.outsider, { von: at('07:00'), bis: at('12:00') }).its('entschuldigung').then(entschuldigung => {
			update(entschuldigung, true).fhcErrors();
			stored(entschuldigung, scope.outsider).its('entschuldigung.akzeptiert').should('eq', null);
		});
	});
});
