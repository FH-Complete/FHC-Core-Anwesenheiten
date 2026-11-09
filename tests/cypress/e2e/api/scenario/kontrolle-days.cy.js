// Scenario S2: Kontrollen without a QR code on two days and in two LEs, by the lektor and the admin

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, dateParam, timeParam } from '../../../support/anwDates';
import { entryOf, expectedQuota, givenKontrolle, givenStatus, readKontrolle } from '../../../support/anwScenario';
import { step } from '../../../support/anwSteps';

describe('scenario: Kontrollen on two days and in two LEs', () => {
	const ctx = useAnwContext();

	it('lektor and admin create, change and delete; the quota of the LV follows', () => {
		const lektor = account('LEKTOR');
		const admin = account('FULL_ASSISTENZ');
		const pastLimit = addDays(ctx.today, -ctx.config.kontrolleCreateMaxReachPast);
		// a Termin before the reach if the LE has one, else a day inside the reach
		const earlier = ctx.termine.find(datum => datum < pastLimit) || addDays(ctx.today, -1);
		const own = ctx.students[0];
		const foreign = ctx.foreignStudents.find(f => !ctx.students.some(s => s.prestudentId === f.prestudentId));
		const quotaOf = student =>
			kontrolleApi
				.getAnwQuoteForPrestudentIds([student.prestudentId], ctx.lvId, ctx.semKurzbz, admin)
				.fhcData()
				.then(rows => Number(rows.find(r => r.prestudent_id === student.prestudentId).sum));
		const k = {};

		requireFixture(foreign, 'a student only in the LE of LEKTOR2');

		step('LEKTOR: a Kontrolle today and one on an earlier day, everybody anwesend', () => {
			givenKontrolle(ctx).then(state => {
				k.today = state;
			});
			givenKontrolle(ctx, { date: earlier }).then(state => {
				k.earlier = state;
			});
			quotaOf(own).should('eq', 100);
		});

		step('FULL_ASSISTENZ: a Kontrolle in the LE of LEKTOR2 before the reach', () => {
			givenKontrolle(ctx, { le: ctx.foreignLe, date: addDays(pastLimit, -5), as: admin }).then(state => {
				k.foreign = state;
			});
		});

		step('the status: abwesend on the earlier day, abwesend in the LE of LEKTOR2', () => {
			givenStatus(ctx, [{ anwesenheit_user_id: entryOf(k.earlier, own).anwesenheit_user_id, status: ctx.config.abwesend_status }]);
			const foreignEntry = entryOf(k.foreign, foreign).anwesenheit_user_id;
			givenStatus(ctx, [{ anwesenheit_user_id: foreignEntry, status: ctx.config.abwesend_status }], {
				le: ctx.foreignLe,
				as: admin,
			});
			const attendances = [
				{ dauer: k.today.kontrolle.dauer, status: ctx.config.anwesend_status },
				{ dauer: k.earlier.kontrolle.dauer, status: ctx.config.abwesend_status },
			];
			quotaOf(own).should('eq', expectedQuota(ctx.config, attendances));
			quotaOf(foreign).should('eq', 0);
		});

		step('LEKTOR changes and deletes the Kontrolle of LEKTOR2: refused, it stays', () => {
			const id = k.foreign.kontrolle.anwesenheit_id;
			kontrolleApi
				.updateKontrolle(ctx.le, id, timeParam('10:00'), timeParam('11:00'), lektor)
				.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', lektor));
			kontrolleApi
				.deleteAnwesenheitskontrolle(ctx.le, dateParam(k.foreign.kontrolle.von.slice(0, 10)), id, lektor)
				.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', lektor));
			readKontrolle(id).its('kontrolle').should('deep.equal', k.foreign.kontrolle);
		});

		step('LEKTOR deletes the earlier Kontrolle: quota 100 again', () => {
			kontrolleApi
				.deleteAnwesenheitskontrolle(ctx.le, dateParam(earlier), k.earlier.kontrolle.anwesenheit_id, lektor)
				.fhcData();
			quotaOf(own).should('eq', 100);
		});
	});
});
