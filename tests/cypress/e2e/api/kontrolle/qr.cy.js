// KontrolleApi: the QR code of a Kontrolle from start to end

import { account } from '../../../support/accounts';
import { kontrolleApi, profilApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText, requireFixture, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, dateParam } from '../../../support/anwDates';
import { givenKontrolle, givenStatus, readKontrolle } from '../../../support/anwScenario';

describe('KontrolleApi: the QR code of a Kontrolle', () => {
	const ctx = useAnwContext();

	const restart = kontrolle =>
		kontrolleApi.restartKontrolle(ctx.le, dateParam(ctx.today), kontrolle.anwesenheit_id, account('LEKTOR')).fhcData();

	it('getExistingQRCode as the creator → the code of the Kontrolle', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			kontrolleApi
				.getExistingQRCode(ctx.le, account('LEKTOR'))
				.fhcData()
				.should('include', { code, anwesenheit_id: kontrolle.anwesenheit_id });
		});
	});

	it('getExistingQRCode as LEKTOR2 → noExistingKontrolleFound', () => {
		givenKontrolle(ctx, { qr: true });
		kontrolleApi
			.getExistingQRCode(ctx.le, account('LEKTOR2'))
			.then(res => expectPhraseText(res, 'global/noExistingKontrolleFound', account('LEKTOR2')));
	});

	it('regenerateQRCode → a new code; degenerateQRCode of the old code → only the new code stays', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			kontrolleApi
				.regenerateQRCode(kontrolle.anwesenheit_id, account('LEKTOR'))
				.fhcData()
				.then(({ code: newCode }) => {
					expect(newCode).to.match(/^[0-9a-f]{8}$/).and.not.eq(code);
					readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [code, newCode]);

					kontrolleApi.degenerateQRCode(kontrolle.anwesenheit_id, code, account('LEKTOR')).fhcData();
					readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [newCode]);
				});
		});
	});

	it('restartKontrolle with a code → the same code', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			restart(kontrolle).its('code').should('eq', code);
		});
	});

	it('deleteQRCode → no code, the Kontrolle stays; restartKontrolle → a new code', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			kontrolleApi.deleteQRCode(kontrolle.anwesenheit_id, ctx.lvId, account('LEKTOR')).fhcData();
			readKontrolle(kontrolle.anwesenheit_id).then(state => {
				expect(state.codes).to.be.empty;
				expect(state.kontrolle).to.exist;
			});

			restart(kontrolle).then(({ code: newCode }) => {
				expect(newCode).to.not.eq(code);
				readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [newCode]);
			});
		});
	});

	it('pollAnwesenheiten → the counts of the Kontrolle', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, entries }) => {
			kontrolleApi
				.pollAnwesenheiten(kontrolle.anwesenheit_id, ctx.lvId, account('LEKTOR'))
				.fhcData()
				.then(counts => {
					expect(Number(counts.anwesend), 'anwesend').to.eq(0);
					expect(Number(counts.abwesend), 'abwesend').to.eq(entries.length);
				});
		});
	});

	it('pollAnwesenheiten with the lv_id of another LV of LEKTOR → notAuthorizedForLva', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle }) => {
			kontrolleApi
				.pollAnwesenheiten(kontrolle.anwesenheit_id, ctx.otherLv, account('LEKTOR'))
				.then(res => expectPhraseError(res, 'global/notAuthorizedForLva', account('LEKTOR')));
		});
	});

	describe('restartKontrolle of an old Kontrolle: the date rules of a new one', () => {
		const pastLimit = () => addDays(ctx.today, -ctx.config.kontrolleCreateMaxReachPast);

		// only the admin creates a Kontrolle before the reach; without a code it waits for a restart
		const givenOldWithoutCode = date =>
			givenKontrolle(ctx, { qr: true, date, as: account('FULL_ASSISTENZ') }).then(({ kontrolle }) =>
				kontrolleApi
					.deleteQRCode(kontrolle.anwesenheit_id, ctx.lvId, account('FULL_ASSISTENZ'))
					.fhcData()
					.then(() => kontrolle),
			);

		const restartAs = (kontrolle, role) =>
			kontrolleApi.restartKontrolle(ctx.le, dateParam(kontrolle.von.slice(0, 10)), kontrolle.anwesenheit_id, account(role));

		it('LEKTOR, a Kontrolle one day before the reach → providedDateTooOld, no code', function () {
			const date = addDays(pastLimit(), -1);
			skipIf(this, ctx.termine.includes(date), `the LE has a Termin on ${date}, the Termin rule allows that date`);

			givenOldWithoutCode(date).then(kontrolle => {
				restartAs(kontrolle, 'LEKTOR').then(res => expectPhraseError(res, 'global/providedDateTooOld', account('LEKTOR')));
				readKontrolle(kontrolle.anwesenheit_id).its('codes').should('be.empty');
			});
		});

		it('LEKTOR, a Kontrolle on a Termin before the reach → a new code', function () {
			const termin = ctx.termine.find(datum => datum < pastLimit());
			skipIf(this, !termin, 'the LE has no Termin before the reach');

			givenOldWithoutCode(termin).then(kontrolle => {
				restartAs(kontrolle, 'LEKTOR').fhcData().its('code').should('match', /^[0-9a-f]{8}$/);
			});
		});

		it('FULL_ASSISTENZ, a Kontrolle one day before the reach → a new code', () => {
			givenOldWithoutCode(addDays(pastLimit(), -1)).then(kontrolle => {
				restartAs(kontrolle, 'FULL_ASSISTENZ').fhcData().its('code').should('match', /^[0-9a-f]{8}$/);
			});
		});
	});

	[
		['regenerateQRCode', k => kontrolleApi.regenerateQRCode(k.anwesenheit_id, account('LEKTOR'))],
		['restartKontrolle', k => kontrolleApi.restartKontrolle(ctx.le, dateParam(ctx.today), k.anwesenheit_id, account('LEKTOR'))],
		['degenerateQRCode', (k, code) => kontrolleApi.degenerateQRCode(k.anwesenheit_id, code, account('LEKTOR'))],
		['deleteQRCode', k => kontrolleApi.deleteQRCode(k.anwesenheit_id, ctx.lvId, account('LEKTOR'))],
	].forEach(([name, call]) => {
		it(`${name} for a Kontrolle of the LE of LEKTOR2 → notAuthorizedForLe, the code stays`, () => {
			givenKontrolle(ctx, { qr: true, le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(({ kontrolle, code }) => {
				call(kontrolle, code).then(res => expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')));
				readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [code]);
			});
		});
	});

	it('regenerateQRCode with an unknown anwesenheit_id → errorKontrolleDoesNotExist', () => {
		kontrolleApi
			.regenerateQRCode(UNKNOWN_ID, account('LEKTOR'))
			.then(res => expectPhraseError(res, 'global/errorKontrolleDoesNotExist', account('LEKTOR')));
	});

	it('getExistingQRCode without a Kontrolle, and after deleteQRCode → noExistingKontrolleFound', () => {
		kontrolleApi
			.getExistingQRCode(ctx.le, account('LEKTOR'))
			.then(res => expectPhraseText(res, 'global/noExistingKontrolleFound', account('LEKTOR')));

		givenKontrolle(ctx, { qr: true }).then(({ kontrolle }) => {
			kontrolleApi.deleteQRCode(kontrolle.anwesenheit_id, ctx.lvId, account('LEKTOR')).fhcData();
			kontrolleApi
				.getExistingQRCode(ctx.le, account('LEKTOR'))
				.then(res => expectPhraseText(res, 'global/noExistingKontrolleFound', account('LEKTOR')));
		});
	});

	it('pollAnwesenheiten after a scan, Fehlminuten and entschuldigt → Fehlminuten count as anwesend', () => {
		const { student } = ctx;
		givenKontrolle(ctx, { qr: true }).then(state => {
			const others = state.entries.filter(e => e.prestudent_id !== student.prestudentId);
			requireFixture(others.length >= 2, 'three students in the test LE');

			profilApi.checkInAnwesenheit(state.code, account(student.role)).fhcData();
			givenStatus(ctx, [
				{ anwesenheit_user_id: others[0].anwesenheit_user_id, status: ctx.config.fehlminuten_status, fehlminuten: 10 },
			]);
			givenStatus(ctx, [{ anwesenheit_user_id: others[1].anwesenheit_user_id, status: ctx.config.entschuldigt_status }], {
				as: account('FULL_ASSISTENZ'),
			});

			kontrolleApi
				.pollAnwesenheiten(state.kontrolle.anwesenheit_id, ctx.lvId, account('LEKTOR'))
				.fhcData()
				.then(counts => {
					expect(Number(counts.anwesend), 'anwesend').to.eq(2);
					expect(Number(counts.entschuldigt), 'entschuldigt').to.eq(1);
					expect(Number(counts.abwesend), 'abwesend').to.eq(state.entries.length - 3);
				});
		});
	});

});
