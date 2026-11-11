// KontrolleApi: new times for a Kontrolle with updateKontrolle

import { account } from '../../../support/accounts';
import { kontrolleApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { timeParam } from '../../../support/anwDates';
import {
	countedMinutes,
	decide,
	entryNow,
	entryOf,
	givenEntschuldigung,
	givenKontrolle,
	givenStatus,
	readKontrolle,
} from '../../../support/anwScenario';

describe('KontrolleApi: change the times of a Kontrolle', () => {
	const ctx = useAnwContext();

	const update = (anwesenheitId, von, bis, { le = ctx.le, as = account('LEKTOR') } = {}) =>
		kontrolleApi.updateKontrolle(le, anwesenheitId, timeParam(von), timeParam(bis), as);

	it('new times → saved, updatevon is LEKTOR, the entries stay', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			update(kontrolle.anwesenheit_id, '10:00', '11:15').fhcData();

			readKontrolle(kontrolle.anwesenheit_id).then(after => {
				expect(after.kontrolle).to.include({
					von: `${ctx.today} 10:00:00`,
					bis: `${ctx.today} 11:15:00`,
					updatevon: account('LEKTOR').username.toLowerCase(),
				});
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

	it('new times that touch another Kontrolle → saved', () => {
		givenKontrolle(ctx, { von: '10:00', bis: '11:00' });
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			update(kontrolle.anwesenheit_id, '08:30', '10:00').fhcData();
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle.bis').should('eq', `${ctx.today} 10:00:00`);
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

	// an entschuldigt entry does not count for the Fehlminuten rule. When the Kontrolle leaves the Entschuldigung,
	// the entry gets its Fehlminuten back only if they fit the new duration, else it is abwesend
	// (Anwesenheit_User_model::revertEntschuldigt)
	it('Fehlminuten longer than the new times → saved inside an accepted Entschuldigung, abwesend outside of it', function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		const [inside, outside] = [['08:00', '08:45'], ['09:15', '10:00']];

		countedMinutes(ctx.today, ...inside).then(short => {
			givenKontrolle(ctx, { von: '08:00', bis: '10:00' }).then(state => {
				expect(short, 'counted minutes of the short times').to.be.within(1, state.kontrolle.dauer - 1);
				givenStatus(ctx, [
					{
						anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id,
						status: ctx.config.fehlminuten_status,
						fehlminuten: short,
					},
				]);
				givenEntschuldigung(ctx.student, { von: `${ctx.today} 07:00:00`, bis: `${ctx.today} 09:00:00` }).then(
					({ entschuldigung }) => decide(entschuldigung.entschuldigung_id, true),
				);
				entryNow(state.kontrolle, ctx.student).its('status').should('eq', ctx.config.fehlminuten_status);

				update(state.kontrolle.anwesenheit_id, ...inside).fhcData();
				entryNow(state.kontrolle, ctx.student).its('status').should('eq', ctx.config.entschuldigt_status);

				update(state.kontrolle.anwesenheit_id, ...outside).fhcData();
				entryNow(state.kontrolle, ctx.student).should('include', { status: ctx.config.abwesend_status, fehlminuten: 0 });
			});
		});
	});

	it('bis before von → errorValidateUhrzeit, the old times stay', () => {
		givenKontrolle(ctx).then(({ kontrolle }) => {
			update(kontrolle.anwesenheit_id, '10:00', '09:00').then(res =>
				expectPhraseError(res, 'global/errorValidateUhrzeit', account('LEKTOR')),
			);
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('deep.equal', kontrolle);
		});
	});

	// setTime moves an hour like 48 or a minute like 60 to another time, without any date check
	[
		['von.hours 48', { hours: 48, minutes: 0, seconds: 0 }, { hours: 49, minutes: 0, seconds: 0 }],
		['bis.minutes 60', { hours: 10, minutes: 0, seconds: 0 }, { hours: 10, minutes: 60, seconds: 0 }],
	].forEach(([label, von, bis]) => {
		it(`${label} → wrongParameters, the Kontrolle keeps its times`, () => {
			givenKontrolle(ctx).then(({ kontrolle }) => {
				kontrolleApi
					.updateKontrolle(ctx.le, kontrolle.anwesenheit_id, von, bis, account('LEKTOR'))
					.then(res => expectPhraseError(res, 'global/wrongParameters', account('LEKTOR')));
				readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('deep.equal', kontrolle);
			});
		});
	});

	it('an unknown anwesenheit_id → errorKontrolleDoesNotExist', () => {
		update(UNKNOWN_ID, '10:00', '11:00').then(res =>
			expectPhraseError(res, 'global/errorKontrolleDoesNotExist', account('LEKTOR')),
		);
	});

	it('FULL_ASSISTENZ, a Kontrolle of the LE of LEKTOR2 → saved', () => {
		givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(({ kontrolle }) => {
			update(kontrolle.anwesenheit_id, '10:00', '11:00', { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).fhcData();
			readKontrolle(kontrolle.anwesenheit_id).its('kontrolle.von').should('eq', `${ctx.today} 10:00:00`);
		});
	});

	it('new times → one webservicelog row with the old and the new times and the user', () => {
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			update(kontrolle.anwesenheit_id, '10:00', '11:15').fhcData();

			cy.task('anw:db:readKontrolleLog', { beschreibung: 'AnwKontrolle Update', anwesenheitId: kontrolle.anwesenheit_id }).then(
				rows => {
					expect(rows).to.have.length(1);
					expect(rows[0].executeUser).to.eq(account('LEKTOR').username);
					expect(JSON.parse(rows[0].requestData)).to.include({
						oldVon: `${ctx.today} 08:00:00`,
						oldBis: `${ctx.today} 09:30:00`,
						newVon: `${ctx.today} 10:00:00`,
						newBis: `${ctx.today} 11:15:00`,
					});
				},
			);
		});
	});

	describe('the reach: a lektor changes the times up to KONTROLLE_UPDATE_MAX_REACH days after the creation', () => {
		// the API cannot create an old Kontrolle: the reach counts from insertamum, like the delete reach
		const givenCreatedDaysAgo = (days, le) =>
			givenKontrolle(ctx, { le, as: account('FULL_ASSISTENZ') }).then(({ kontrolle }) =>
				cy
					.task('anw:db:backdateKontrolle', { anwesenheitId: kontrolle.anwesenheit_id, leIds: [ctx.le, ctx.foreignLe], days })
					.then(() => readKontrolle(kontrolle.anwesenheit_id).its('kontrolle')),
			);

		// SUPPL_LEKTOR teaches the LE of LEKTOR2: the substitute right is no admin right
		[
			['LEKTOR', 0, () => ctx.le, true],
			['LEKTOR', 1, () => ctx.le, false],
			['SUPPL_LEKTOR', 1, () => ctx.foreignLe, false],
			['FULL_ASSISTENZ', 1, () => ctx.le, true],
		].forEach(([role, daysOver, le, saved]) => {
			const created = daysOver ? 'one day before the reach' : 'on the last day of the reach';

			it(`${role}, a Kontrolle created ${created} → ${saved ? 'saved' : 'providedDateTooOld, the times stay'}`, () => {
				givenCreatedDaysAgo(ctx.config.kontrolleUpdateMaxReach + daysOver, le()).then(kontrolle => {
					const request = update(kontrolle.anwesenheit_id, '10:00', '11:00', { le: le(), as: account(role) });

					if (saved) {
						request.fhcData();
						readKontrolle(kontrolle.anwesenheit_id).its('kontrolle.von').should('eq', `${ctx.today} 10:00:00`);
					} else {
						request.then(res => expectPhraseError(res, 'global/providedDateTooOld', account(role)));
						readKontrolle(kontrolle.anwesenheit_id).its('kontrolle').should('deep.equal', kontrolle);
					}
				});
			});
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
