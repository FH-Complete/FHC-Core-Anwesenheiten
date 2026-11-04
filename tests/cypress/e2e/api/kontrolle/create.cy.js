// KontrolleApi: a new Kontrolle with insertAnwWithoutQR and getNewQRCode

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { addDays, dateParam, timeParam } from '../../../support/anwDates';
import { countKontrollen, givenKontrolle, resetEntschuldigungen, resetKontrollen } from '../../../support/anwScenario';

describe('KontrolleApi: create a Kontrolle', () => {
	let ctx;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			// an accepted Entschuldigung would set an entry to entschuldigt
			resetEntschuldigungen(ctx);
		});
	});

	beforeEach(() => resetKontrollen(ctx));

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

	['LEKTOR', 'FULL_ASSISTENZ'].forEach(role => {
		it(`${role}, date one day after the future reach → providedDateTooFarInFuture, nothing stored`, () => {
			create(addDays(ctx.today, ctx.config.kontrolleCreateMaxReachFuture + 1), { as: account(role) }).then(res =>
				expectPhraseError(res, 'global/providedDateTooFarInFuture', account(role)),
			);
			countKontrollen(ctx).should('eq', 0);
		});
	});
});
