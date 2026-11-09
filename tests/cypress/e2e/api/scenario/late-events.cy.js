// Scenario S5: late events on one entry. Each step keeps the state before the Entschuldigung

import { account } from '../../../support/accounts';
import { kontrolleApi, profilApi } from '../../../support/anwApi';
import { useAnwContext } from '../../../support/anwContext';
import { timeParam } from '../../../support/anwDates';
import {
	decide,
	entryNow,
	entryOf,
	givenEntschuldigung,
	givenKontrolle,
	givenStatus,
	statusNow,
} from '../../../support/anwScenario';
import { step } from '../../../support/anwSteps';

describe('scenario: late events on one entry', () => {
	const ctx = useAnwContext({ entschuldigungen: true });

	it('scan, Fehlminuten, accept, move out, move in, decline', () => {
		const lektor = account('LEKTOR');
		const fehlminuten = { status: ctx.config.fehlminuten_status, fehlminuten: 15 };
		let kontrolle;
		let entschuldigungId;
		const move = (von, bis) =>
			kontrolleApi.updateKontrolle(ctx.le, kontrolle.anwesenheit_id, timeParam(von), timeParam(bis), lektor).fhcData();

		step('a QR Kontrolle, the student scans late: anwesend, then 15 Fehlminuten', () => {
			givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(state => {
				kontrolle = state.kontrolle;
				profilApi.checkInAnwesenheit(state.code, account(ctx.student.role)).fhcData();
				givenStatus(ctx, [{ anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id, ...fehlminuten }]);
				entryNow(kontrolle, ctx.student).should('include', fehlminuten);
			});
		});

		step('an Entschuldigung from 07:00 to 10:00 accepted: entschuldigt', () => {
			givenEntschuldigung(ctx.student, { von: `${ctx.today} 07:00:00`, bis: `${ctx.today} 10:00:00` })
				.its('entschuldigung.entschuldigung_id')
				.then(id => {
					entschuldigungId = id;
					decide(id, true);
				});
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
		});

		step('the lektor moves the Kontrolle out of the range: back to 15 Fehlminuten', () => {
			move('10:30', '11:30');
			entryNow(kontrolle, ctx.student).should('include', fehlminuten);
		});

		step('back into the range: entschuldigt', () => {
			move('08:00', '09:00');
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.entschuldigt_status);
		});

		step('the decline: 15 Fehlminuten again', () => {
			decide(entschuldigungId, false);
			entryNow(kontrolle, ctx.student).should('include', fehlminuten);
		});
	});
});
