// Scenario S4: the assistenz changes the range of an Entschuldigung over two days, a second one takes over

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { useAnwContext } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import {
	decide,
	givenEntschuldigung,
	givenKontrolle,
	readEntschuldigung,
	statusNow,
} from '../../../support/anwScenario';
import { step } from '../../../support/anwSteps';

describe('scenario: the range of an Entschuldigung over two days', () => {
	const ctx = useAnwContext({ entschuldigungen: true, pdf: true });

	it('accept two days, narrow to one, a second one for the other day, decline the first, delete a third', () => {
		const ent = account('ENT_ASSISTENZ');
		const day1 = addDays(ctx.today, -1);
		const day2 = ctx.today;
		const k = {};
		let first;

		step('QR Kontrollen on both days, the student does not scan', () => {
			givenKontrolle(ctx, { qr: true, date: day1 }).then(({ kontrolle }) => {
				k.day1 = kontrolle;
			});
			givenKontrolle(ctx, { qr: true, date: day2 }).then(({ kontrolle }) => {
				k.day2 = kontrolle;
			});
		});

		step('one Entschuldigung over both days, accepted: both entschuldigt', () => {
			givenEntschuldigung(ctx.student, { von: `${day1} 07:00:00`, bis: `${day2} 12:00:00` })
				.its('entschuldigung')
				.then(entschuldigung => {
					first = entschuldigung;
					decide(first.entschuldigung_id, true);
					statusNow(k.day1, ctx.student).should('eq', ctx.config.entschuldigt_status);
					statusNow(k.day2, ctx.student).should('eq', ctx.config.entschuldigt_status);
				});
		});

		step('the assistenz narrows it to the first day: the second day goes back', () => {
			decide(first.entschuldigung_id, true, { range: { von: `${day1} 07:00:00`, bis: `${day1} 12:00:00` } });
			statusNow(k.day1, ctx.student).should('eq', ctx.config.entschuldigt_status);
			statusNow(k.day2, ctx.student).should('eq', ctx.config.abwesend_status);
		});

		step('a second Entschuldigung for the second day, accepted', () => {
			givenEntschuldigung(ctx.student, { von: `${day2} 07:00:00`, bis: `${day2} 12:00:00` })
				.its('entschuldigung')
				.then(second => decide(second.entschuldigung_id, true));
			statusNow(k.day2, ctx.student).should('eq', ctx.config.entschuldigt_status);
		});

		step('the first one declined: the first day goes back, the second day stays', () => {
			decide(first.entschuldigung_id, false);
			statusNow(k.day1, ctx.student).should('eq', ctx.config.abwesend_status);
			statusNow(k.day2, ctx.student).should('eq', ctx.config.entschuldigt_status);
		});

		step('a third one with a document, deleted while open: nothing changes, the document is gone', () => {
			givenEntschuldigung(ctx.student, { von: `${day1} 07:00:00`, bis: `${day2} 12:00:00`, pdf: ctx.pdf })
				.its('entschuldigung')
				.then(third => {
					profilApi.deleteEntschuldigung(third.entschuldigung_id, ctx.student.personId, account(ctx.student.role)).fhcData();
					readEntschuldigung(third.entschuldigung_id).its('entschuldigung').should('eq', null);
					cy.task('anw:db:dmsExists', { dmsId: third.dms_id }).should('eq', false);
				});
			statusNow(k.day1, ctx.student).should('eq', ctx.config.abwesend_status);
			statusNow(k.day2, ctx.student).should('eq', ctx.config.entschuldigt_status);
		});
	});
});
