// The decision of an Entschuldigung and the attendance entries of the student:
// AdministrationApi::updateEntschuldigung, new Kontrollen, KontrolleApi::updateKontrolle and the scan

import { account } from '../../../support/accounts';
import { kontrolleApi, profilApi } from '../../../support/anwApi';
import { skipIf } from '../../../support/anwChecks';
import { loadAnwContext, studentInLe } from '../../../support/anwContext';
import { timeParam } from '../../../support/anwDates';
import {
	decide,
	entryOf,
	givenEntschuldigung,
	givenKontrolle,
	givenStatus,
	readKontrolle,
	resetEntschuldigungen,
	resetKontrollen,
} from '../../../support/anwScenario';

describe('Entschuldigung: the effect of the decision on the entries', () => {
	let ctx;
	let student;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			student = studentInLe(ctx);
			expect(student, 'a test student in the test LE').to.exist;
		});
	});

	beforeEach(function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		resetKontrollen(ctx);
		resetEntschuldigungen(ctx);
	});

	const range = (von, bis) => ({ von: `${ctx.today} ${von}:00`, bis: `${ctx.today} ${bis}:00` });

	/** an Entschuldigung of the student today, open or decided. Yields the stored row */
	const givenDecided = (von, bis, status) =>
		givenEntschuldigung(student, range(von, bis))
			.its('entschuldigung')
			.then(entschuldigung =>
				status === undefined ? entschuldigung : decide(entschuldigung.entschuldigung_id, status).then(() => entschuldigung),
			);

	const entryNow = kontrolle => readKontrolle(kontrolle.anwesenheit_id).then(state => entryOf(state, student));
	const statusNow = kontrolle => entryNow(kontrolle).its('status');
	const scan = code => profilApi.checkInAnwesenheit(code, account(student.role)).fhcData();

	it('an open Entschuldigung → no change, still abwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenDecided('07:00', '12:00');
			statusNow(kontrolle).should('eq', ctx.config.abwesend_status);
		});
	});

	it('accept → a Kontrolle inside von - bis gets entschuldigt, a Kontrolle partly outside stays abwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(inside => {
			givenKontrolle(ctx, { qr: true, von: '11:00', bis: '13:00' }).then(partly => {
				givenDecided('07:00', '12:00', true);
				statusNow(inside.kontrolle).should('eq', ctx.config.entschuldigt_status);
				statusNow(partly.kontrolle).should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('decline after accept → abwesend again', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenDecided('07:00', '12:00', true).then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, false);
				statusNow(kontrolle).should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('a scan before the acceptance, then decline → anwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle, code }) => {
			scan(code);
			givenDecided('07:00', '12:00', true).then(entschuldigung => {
				statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
				decide(entschuldigung.entschuldigung_id, false);
				statusNow(kontrolle).should('eq', ctx.config.anwesend_status);
			});
		});
	});

	it('a scan while entschuldigt, then decline → anwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle, code }) => {
			givenDecided('07:00', '12:00', true).then(entschuldigung => {
				scan(code);
				statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
				decide(entschuldigung.entschuldigung_id, false);
				statusNow(kontrolle).should('eq', ctx.config.anwesend_status);
			});
		});
	});

	it('Fehlminuten before the acceptance, then decline → the status fehlminuten with the minutes', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(state => {
			givenStatus(ctx, [
				{ anwesenheit_user_id: entryOf(state, student).anwesenheit_user_id, status: ctx.config.fehlminuten_status, fehlminuten: 30 },
			]);
			givenDecided('07:00', '12:00', true).then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, false);
				entryNow(state.kontrolle).should('include', { status: ctx.config.fehlminuten_status, fehlminuten: 30 });
			});
		});
	});

	it('a new Kontrolle inside an accepted Entschuldigung → entschuldigt from the start', () => {
		givenDecided('07:00', '12:00', true);
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
		});
	});

	it('two accepted Entschuldigungen, decline one → the other still covers the entry', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			givenDecided('07:00', '12:00', true).then(wide => {
				givenDecided('08:00', '10:00', true);
				decide(wide.entschuldigung_id, false);
				statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
			});
		});
	});

	it('updateKontrolle moves the Kontrolle out of the accepted range → abwesend; back in → entschuldigt', () => {
		givenDecided('07:00', '10:00', true);
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
			statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);

			const move = (von, bis) =>
				kontrolleApi
					.updateKontrolle(ctx.le, kontrolle.anwesenheit_id, timeParam(von), timeParam(bis), account('LEKTOR'))
					.fhcData();

			move('10:30', '11:30');
			statusNow(kontrolle).should('eq', ctx.config.abwesend_status);

			move('08:00', '09:00');
			statusNow(kontrolle).should('eq', ctx.config.entschuldigt_status);
		});
	});
});
