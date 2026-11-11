// The decision of an Entschuldigung and the attendance entries of the student:
// AdministrationApi::updateEntschuldigung, new Kontrollen, KontrolleApi::updateKontrolle and the scan

import { account } from '../../../support/accounts';
import { kontrolleApi, profilApi } from '../../../support/anwApi';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, timeParam } from '../../../support/anwDates';
import {
	decide,
	entryNow,
	entryOf,
	givenEntschuldigung,
	givenKontrolle,
	givenStatus,
	statusNow,
} from '../../../support/anwScenario';

describe('Entschuldigung: the effect of the decision on the entries', () => {
	const ctx = useAnwContext({ entschuldigungen: true });

	const range = (von, bis) => ({ von: `${ctx.today} ${von}:00`, bis: `${ctx.today} ${bis}:00` });

	/** an Entschuldigung of the student today, open without a decision, else decided. Yields the stored row */
	const givenToday = (von, bis, { decision } = {}) =>
		givenEntschuldigung(ctx.student, range(von, bis))
			.its('entschuldigung')
			.then(entschuldigung =>
				decision === undefined ? entschuldigung : decide(entschuldigung.entschuldigung_id, decision).then(() => entschuldigung),
			);

	const scan = code => profilApi.checkInAnwesenheit(code, account(ctx.student.role)).fhcData();

	it('an open Entschuldigung → no change, still abwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenToday('07:00', '12:00');
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
		});
	});

	it('accept → a Kontrolle inside von - bis gets entschuldigt, a Kontrolle partly outside stays abwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(inside => {
			givenKontrolle(ctx, { qr: true, von: '11:00', bis: '13:00' }).then(partly => {
				givenToday('07:00', '12:00', { decision: true });
				statusNow(inside.kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
				statusNow(partly.kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('decline after accept → abwesend again', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenToday('07:00', '12:00', { decision: true }).then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, false);
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('a scan before the acceptance, then decline → anwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle, code }) => {
			scan(code);
			givenToday('07:00', '12:00', { decision: true }).then(entschuldigung => {
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
				decide(entschuldigung.entschuldigung_id, false);
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.anwesend_status);
			});
		});
	});

	it('a scan while entschuldigt, then decline → anwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle, code }) => {
			givenToday('07:00', '12:00', { decision: true }).then(entschuldigung => {
				scan(code);
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
				decide(entschuldigung.entschuldigung_id, false);
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.anwesend_status);
			});
		});
	});

	it('Fehlminuten before the acceptance, then decline → the status fehlminuten with the minutes', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(state => {
			givenStatus(ctx, [
				{
					anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id,
					status: ctx.config.fehlminuten_status,
					fehlminuten: 30,
				},
			]);
			givenToday('07:00', '12:00', { decision: true }).then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, false);
				entryNow(state.kontrolle, ctx.student).should('include', { status: ctx.config.fehlminuten_status, fehlminuten: 30 });
			});
		});
	});

	it('a new Kontrolle inside an accepted Entschuldigung → entschuldigt from the start', () => {
		givenToday('07:00', '12:00', { decision: true });
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
		});
	});

	[
		['an open', undefined],
		['a declined', false],
	].forEach(([label, decision]) => {
		it(`a new Kontrolle inside ${label} Entschuldigung → the default status: abwesend with QR, anwesend without`, () => {
			givenToday('07:00', '12:00', { decision });

			givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:00' }).then(({ kontrolle }) => {
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
			});
			givenKontrolle(ctx, { von: '10:00', bis: '11:00' }).then(({ kontrolle }) => {
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.anwesend_status);
			});
		});
	});

	// three queries decide the same question: the accept (Entschuldigung_model::getAllUncoveredAnwesenheitenInTimespan),
	// a new Kontrolle (Anwesenheit_User_model::createNewUserAnwesenheitenEntries) and new times of a Kontrolle
	// (Entschuldigung_model::compareStatusZeitenForLE)
	describe('the cover rule: an accepted Entschuldigung covers a Kontrolle from von to bis, both limits included', () => {
		const lektor = () => account('LEKTOR');

		// each path ends with a QR Kontrolle from 08:00 to 09:30 and an accepted Entschuldigung von - bis. Yields the Kontrolle
		const PATHS = {
			'the accept after the Kontrolle': (von, bis) =>
				givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) =>
					givenToday(von, bis, { decision: true }).then(() => kontrolle),
				),
			'a new Kontrolle after the accept': (von, bis) =>
				givenToday(von, bis, { decision: true })
					.then(() => givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }))
					.its('kontrolle'),
			'new times of a Kontrolle after the accept': (von, bis) =>
				givenToday(von, bis, { decision: true })
					.then(() => givenKontrolle(ctx, { qr: true, von: '13:00', bis: '14:00' }))
					.then(({ kontrolle }) =>
						kontrolleApi
							.updateKontrolle(ctx.le, kontrolle.anwesenheit_id, timeParam('08:00'), timeParam('09:30'), lektor())
							.fhcData()
							.then(() => kontrolle),
					),
		};

		const RANGES = [
			['equal to the Kontrolle', '08:00', '09:30', true],
			['one minute later than the Kontrolle', '08:01', '09:30', false],
			['one minute shorter than the Kontrolle', '08:00', '09:29', false],
		];

		Object.entries(PATHS).forEach(([path, given]) => {
			RANGES.forEach(([label, von, bis, covered]) => {
				it(`${path}, a range ${label} → ${covered ? 'entschuldigt' : 'abwesend'}`, () => {
					given(von, bis).then(kontrolle => {
						statusNow(kontrolle, ctx.student).should(
							'eq',
							covered ? ctx.config.entschuldigt_status : ctx.config.abwesend_status,
						);
					});
				});
			});
		});
	});

	it('two accepted Entschuldigungen, decline one → the other still covers the entry', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenToday('07:00', '12:00', { decision: true }).then(wide => {
				givenToday('08:00', '10:00', { decision: true });
				decide(wide.entschuldigung_id, false);
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('accept a range over two days → the Kontrollen of both days entschuldigt', () => {
		const yesterday = addDays(ctx.today, -1);
		givenKontrolle(ctx, { qr: true, date: yesterday }).then(({ kontrolle: first }) => {
			givenKontrolle(ctx, { qr: true }).then(({ kontrolle: second }) => {
				givenEntschuldigung(ctx.student, { von: `${yesterday} 07:00:00`, bis: `${ctx.today} 12:00:00` })
					.its('entschuldigung.entschuldigung_id')
					.then(id => decide(id, true));
				statusNow(first, ctx.student).should('eq', ctx.config.entschuldigt_status);
				statusNow(second, ctx.student).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('updateKontrolle moves the Kontrolle out of the accepted range → abwesend; back in → entschuldigt', () => {
		givenToday('07:00', '10:00', { decision: true });
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);

			const move = (von, bis) =>
				kontrolleApi
					.updateKontrolle(ctx.le, kontrolle.anwesenheit_id, timeParam(von), timeParam(bis), account('LEKTOR'))
					.fhcData();

			move('10:30', '11:30');
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);

			move('08:00', '09:00');
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
		});
	});
});
