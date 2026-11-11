// AdministrationApi: the decision and the edit of an Entschuldigung (updateEntschuldigung)

import { account } from '../../../support/accounts';
import { administrationApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText, requireFixture } from '../../../support/anwChecks';
import { loadAssistenzScope, useAnwContext } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import {
	decide,
	entryNow,
	givenEntschuldigung,
	givenKontrolle,
	readEntschuldigung,
	requestDecision,
	seedEntschuldigung,
	statusNow,
} from '../../../support/anwScenario';

describe('AdministrationApi: decide and edit an Entschuldigung', () => {
	const ctx = useAnwContext({ entschuldigungen: true });
	let ent;
	let full;

	before(() => {
		loadAssistenzScope(ctx).then(loaded => {
			ent = loaded;
		});
		loadAssistenzScope(ctx, 'FULL_ASSISTENZ').then(loaded => {
			full = loaded;
		});
	});

	const at = time => `${ctx.today} ${time}:00`;
	// an open Entschuldigung of the test student today
	const givenOpen = ({ von = '07:00', bis = '12:00' } = {}) =>
		givenEntschuldigung(ctx.student, { von: at(von), bis: at(bis) }).its('entschuldigung');

	const update = (entschuldigung, status, options) => requestDecision(entschuldigung.entschuldigung_id, status, options);
	const stored = entschuldigung => readEntschuldigung(entschuldigung.entschuldigung_id);

	it('accept → akzeptiert, statussetvon, version + 1, one history row with the open state before', () => {
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
				expect(history).to.have.length(1);
				expect(history[0]).to.include({ akzeptiert: null, version: entschuldigung.version, von: at('07:00'), bis: at('12:00') });
			});
		});
	});

	it('FULL_ASSISTENZ accepts one of its Studiengaenge → akzeptiert, statussetvon is FULL_ASSISTENZ', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, true, { as: account('FULL_ASSISTENZ') }).fhcData();
			stored(entschuldigung)
				.its('entschuldigung')
				.should('include', { akzeptiert: true, statussetvon: account('FULL_ASSISTENZ').username.toLowerCase() });
		});
	});

	it('accept → the entry of a Kontrolle in the range is entschuldigt, updatevon and statussetvon are the assistenz', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen().then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, true);

				const assistenz = account('ENT_ASSISTENZ').username.toLowerCase();
				entryNow(kontrolle, ctx.student).should('include', {
					status: ctx.config.entschuldigt_status,
					updatevon: assistenz,
					statussetvon: assistenz,
				});
			});
		});
	});

	it('decline with a notiz → akzeptiert false and the notiz', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, false, { notiz: 'Bestätigung fehlt' }).fhcData();
			stored(entschuldigung).its('entschuldigung').should('include', { akzeptiert: false, notiz: 'Bestätigung fehlt' });
		});
	});

	describe('the notiz of a declined one', () => {
		const REASON = 'Bestätigung fehlt';
		const givenDeclined = () =>
			givenOpen().then(entschuldigung =>
				decide(entschuldigung.entschuldigung_id, false, { notiz: REASON }).then(() => entschuldigung),
			);
		const notiz = entschuldigung => stored(entschuldigung).its('entschuldigung.notiz');

		// requestDecision always sends a notiz, so the request without one goes to the API directly
		it('a new range in a request without notiz, and with notiz null → the notiz stays', () => {
			givenDeclined().then(entschuldigung => {
				[undefined, null].forEach(noNotiz => {
					administrationApi
						.updateEntschuldigung(String(entschuldigung.entschuldigung_id), false, noNotiz, account('ENT_ASSISTENZ'), {
							von: at('08:00'),
							bis: at('11:00'),
						})
						.fhcData();
					notiz(entschuldigung).should('eq', REASON);
				});
				stored(entschuldigung).its('entschuldigung.von').should('eq', at('08:00'));
			});
		});

		it('accept with an empty notiz → the notiz is empty', () => {
			givenDeclined().then(entschuldigung => {
				update(entschuldigung, true, { notiz: '' }).fhcData();
				notiz(entschuldigung).should('eq', '');
			});
		});

		it('decline again with another notiz → the new notiz', () => {
			givenDeclined().then(entschuldigung => {
				update(entschuldigung, false, { notiz: 'Zeitraum falsch' }).fhcData();
				notiz(entschuldigung).should('eq', 'Zeitraum falsch');
			});
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
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('an unknown entschuldigung_id → wrongParameters', () => {
		requestDecision(UNKNOWN_ID, true).then(res =>
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

	[
		['bis on a day before von', () => ({ von: at('09:00'), bis: `${addDays(ctx.today, -1)} 11:00:00` }), 'errorValidateTimes'],
		['bis before von on the same day', () => ({ von: at('11:00'), bis: at('09:00') }), 'errorValidateUhrzeit'],
		['von "abc"', () => ({ von: 'abc', bis: at('11:00') }), 'wrongParameters'],
	].forEach(([label, range, phrase]) => {
		it(`a new range with ${label} → ${phrase}, the range stays`, () => {
			givenOpen().then(entschuldigung => {
				update(entschuldigung, null, { range: range() }).then(res =>
					expectPhraseError(res, `global/${phrase}`, account('ENT_ASSISTENZ')),
				);
				stored(entschuldigung).its('entschuldigung').should('include', { von: at('07:00'), bis: at('12:00') });
			});
		});
	});

	it('only bis in the request → bis changes, von stays', () => {
		givenOpen().then(entschuldigung => {
			update(entschuldigung, null, { range: { bis: at('10:00') } }).fhcData();
			stored(entschuldigung).its('entschuldigung').should('include', { von: at('07:00'), bis: at('10:00') });
		});
	});

	it('a new range of a declined one over a Kontrolle → saved, the entry stays abwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen({ bis: '07:30' }).then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, false);
				update(entschuldigung, false, { range: { von: at('07:00'), bis: at('12:00') } }).fhcData();

				stored(entschuldigung).its('entschuldigung').should('include', { akzeptiert: false, bis: at('12:00') });
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('a smaller range of an accepted one, a second accepted one covers the Kontrolle → the entry stays entschuldigt', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen({ von: '08:00', bis: '10:00' }).then(second => decide(second.entschuldigung_id, true));
			givenOpen().then(first => {
				decide(first.entschuldigung_id, true);
				update(first, true, { range: { von: at('10:00'), bis: at('12:00') } }).fhcData();
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('status "x" → the entry and the Entschuldigung stay, wrongParameters', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen().then(entschuldigung => {
				update(entschuldigung, 'x').then(res => {
					// the stored state first: it shows a half done update
					statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
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
				update(entschuldigung, null).then(res => expectPhraseError(res, 'global/wrongParameters', account('ENT_ASSISTENZ')));
				stored(entschuldigung).its('entschuldigung.akzeptiert').should('eq', true);
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('accept with a new range in the same request → the Kontrolle in the new range gets entschuldigt', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen({ bis: '07:30' }).then(entschuldigung => {
				update(entschuldigung, true, { range: { von: at('07:00'), bis: at('12:00') } }).fhcData();
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('a new range of an accepted one, status unchanged → the entries follow the new range', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenOpen({ bis: '10:00' }).then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, true);
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);

				// the edit modal sends the current status with the new range
				update(entschuldigung, true, { range: { von: at('10:00'), bis: at('12:00') } }).fhcData();
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('without entschuldigung_id → wrongParameters', () => {
		requestDecision('', true).then(res => expectPhraseError(res, 'global/wrongParameters', account('ENT_ASSISTENZ')));
	});

	// the entries: entschuldigung/effect.cy.js. Here the stored Entschuldigung
	it('accept → decline → accept → akzeptiert of every step, version + 3', () => {
		givenOpen().then(entschuldigung => {
			[true, false, true].forEach(status => {
				update(entschuldigung, status).fhcData();
				stored(entschuldigung).its('entschuldigung.akzeptiert').should('eq', status);
			});
			stored(entschuldigung).its('entschuldigung.version').should('eq', entschuldigung.version + 3);
		});
	});

	[
		['FULL_ASSISTENZ', () => full],
		['ENT_ASSISTENZ', () => ent],
	].forEach(([role, scopeOf]) => {
		it(`${role} decides one of a Studiengang outside its rights → noAuthorization, it stays open`, () => {
			const { outsider } = scopeOf();
			requireFixture(outsider, `a student outside the Studiengaenge of ${role}`);

			seedEntschuldigung(ctx, outsider, { von: at('07:00'), bis: at('12:00') })
				.its('entschuldigung')
				.then(entschuldigung => {
					update(entschuldigung, true, { as: account(role) }).then(res =>
						expectPhraseError(res, 'global/noAuthorization', account(role)),
					);
					stored(entschuldigung).its('entschuldigung.akzeptiert').should('eq', null);
				});
		});
	});
});
