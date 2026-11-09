// KontrolleApi: a new Kontrolle with insertAnwWithoutQR and getNewQRCode

import { account } from '../../../support/accounts';
import { kontrolleApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, dateParam, timeParam } from '../../../support/anwDates';
import { countKontrollen, givenKontrolle } from '../../../support/anwScenario';

describe('KontrolleApi: create a Kontrolle', () => {
	const ctx = useAnwContext();

	const create = (date, { von = '08:00', bis = '09:30', le = ctx.le, as = account('LEKTOR') } = {}) =>
		kontrolleApi.insertAnwWithoutQR(le, dateParam(date), timeParam(von), timeParam(bis), as);

	const pastLimit = () => addDays(ctx.today, -ctx.config.kontrolleCreateMaxReachPast);

	it('without QR → one entry per active student, status anwesend, no code', () => {
		givenKontrolle(ctx).then(({ entries, codes }) => {
			expect(entries.map(e => e.prestudent_id)).to.have.members(ctx.students.map(s => s.prestudentId));
			expect([...new Set(entries.map(e => e.status))]).to.deep.equal([ctx.config.anwesend_status]);
			expect(codes).to.be.empty;
		});
	});

	it('with QR → entries abwesend and one code of 8 characters', () => {
		givenKontrolle(ctx, { qr: true }).then(({ entries, codes, code }) => {
			expect(entries.map(e => e.prestudent_id)).to.have.members(ctx.students.map(s => s.prestudentId));
			expect([...new Set(entries.map(e => e.status))]).to.deep.equal([ctx.config.abwesend_status]);
			expect(code).to.match(/^[0-9a-f]{8}$/);
			expect(codes).to.deep.equal([code]);
		});
	});

	it('date KONTROLLE_CREATE_MAX_REACH_PAST days ago → created', () => {
		givenKontrolle(ctx, { date: pastLimit() }).its('kontrolle').should('exist');
	});

	it('date one day before the reach → providedDateTooOld, nothing stored', function () {
		const date = addDays(pastLimit(), -1);
		skipIf(this, ctx.termine.includes(date), `the LE has a Termin on ${date}, the Termin rule allows that date`);

		create(date).then(res => expectPhraseError(res, 'global/providedDateTooOld', account('LEKTOR')));
		countKontrollen(ctx).should('eq', 0);
	});

	it('date on a Termin of the LE before the reach → created', function () {
		const termin = ctx.termine.find(datum => datum < pastLimit());
		skipIf(this, !termin, 'the LE has no Termin before the reach');

		givenKontrolle(ctx, { date: termin }).its('kontrolle').should('exist');
	});

	it('FULL_ASSISTENZ, date before the reach → created', () => {
		givenKontrolle(ctx, { date: addDays(pastLimit(), -30), as: account('FULL_ASSISTENZ') })
			.its('kontrolle')
			.should('exist');
	});

	it('overlapping times on the same day → errorKontrolleTimesCollide, nothing stored', () => {
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' });

		create(ctx.today, { von: '09:00', bis: '10:00' }).then(res =>
			expectPhraseError(res, 'global/errorKontrolleTimesCollide', account('LEKTOR')),
		);
		countKontrollen(ctx).should('eq', 1);
	});

	it('times that touch on the same day → created', () => {
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' });
		givenKontrolle(ctx, { von: '09:30', bis: '10:30' }).its('kontrolle').should('exist');
	});

	it('the same times on another day → created', () => {
		givenKontrolle(ctx);
		givenKontrolle(ctx, { date: addDays(ctx.today, -1) }).its('kontrolle').should('exist');
	});

	it('LE of LEKTOR2 as LEKTOR → notAuthorizedForLe, nothing stored', () => {
		create(ctx.today, { le: ctx.foreignLe }).then(res =>
			expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')),
		);
		countKontrollen(ctx).should('eq', 0);
	});

	it('LE of LEKTOR2 as FULL_ASSISTENZ → created with the students of that LE', () => {
		givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(({ entries }) => {
			expect(entries.map(e => e.prestudent_id)).to.have.members(ctx.foreignStudents.map(s => s.prestudentId));
		});
	});

	it('date KONTROLLE_CREATE_MAX_REACH_FUTURE days ahead → created', () => {
		givenKontrolle(ctx, { date: addDays(ctx.today, ctx.config.kontrolleCreateMaxReachFuture) })
			.its('kontrolle')
			.should('exist');
	});

	[
		['ende before beginn', '10:00', '09:00'],
		['ende equal to beginn', '10:00', '10:00'],
	].forEach(([label, von, bis]) => {
		it(`${label} → errorValidateUhrzeit, nothing stored`, () => {
			create(ctx.today, { von, bis }).then(res => expectPhraseError(res, 'global/errorValidateUhrzeit', account('LEKTOR')));
			countKontrollen(ctx).should('eq', 0);
		});
	});

	// mktime moves an hour like 48 to another day: the reach checks only saw the date
	[
		['beginn.hours 48 (two days later)', { hours: 48, minutes: 0, seconds: 0 }, { hours: 49, minutes: 0, seconds: 0 }],
		['beginn.hours -360 (15 days back)', { hours: -360, minutes: 0, seconds: 0 }, { hours: -359, minutes: 0, seconds: 0 }],
		['minutes 90', { hours: 8, minutes: 90, seconds: 0 }, { hours: 10, minutes: 0, seconds: 0 }],
		['hours "8a"', { hours: '8a', minutes: 0, seconds: 0 }, { hours: 10, minutes: 0, seconds: 0 }],
	].forEach(([label, beginn, ende]) => {
		it(`${label} → wrongParameters, nothing stored`, () => {
			kontrolleApi
				.insertAnwWithoutQR(ctx.le, dateParam(ctx.today), beginn, ende, account('LEKTOR'))
				.then(res => expectPhraseError(res, 'global/wrongParameters', account('LEKTOR')));
			countKontrollen(ctx).should('eq', 0);
		});
	});

	it('a date that does not exist (February 30) → wrongParameters, nothing stored', () => {
		const year = Number(ctx.today.slice(0, 4));
		kontrolleApi
			.getNewQRCode(ctx.le, { year, month: 2, day: 30 }, timeParam('08:00'), timeParam('09:30'), account('LEKTOR'))
			.then(res => expectPhraseError(res, 'global/wrongParameters', account('LEKTOR')));
		countKontrollen(ctx).should('eq', 0);
	});

	it('an LE that does not exist → notAuthorizedForLe', () => {
		create(ctx.today, { le: UNKNOWN_ID }).then(res => expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')));
	});

	['LEKTOR', 'FULL_ASSISTENZ'].forEach(role => {
		it(`${role}, date one day after the future reach → providedDateTooFarInFuture, nothing stored`, () => {
			create(addDays(ctx.today, ctx.config.kontrolleCreateMaxReachFuture + 1), { as: account(role) }).then(res =>
				expectPhraseError(res, 'global/providedDateTooFarInFuture', account(role)),
			);
			countKontrollen(ctx).should('eq', 0);
		});
	});
});
