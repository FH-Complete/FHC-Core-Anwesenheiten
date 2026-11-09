// ProfilApi: a student checks in with the code of a Kontrolle (checkInAnwesenheit)

import { account } from '../../../support/accounts';
import { kontrolleApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { studentOutsideLe, useAnwContext } from '../../../support/anwContext';
import { entryNow, entryOf, givenKontrolle, givenStatus } from '../../../support/anwScenario';

describe('ProfilApi: check in with a code', () => {
	const ctx = useAnwContext();

	const scan = (code, role = ctx.student.role) => profilApi.checkInAnwesenheit(code, account(role));

	it('a valid code → status anwesend', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			scan(code).fhcData().should('have.all.keys', 'viewData', 'von', 'bis');
			entryNow(kontrolle, ctx.student).its('status').should('eq', ctx.config.anwesend_status);
		});
	});

	it('the same code a second time → success, still anwesend', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			scan(code).fhcData();
			scan(code).fhcData();
			entryNow(kontrolle, ctx.student).its('status').should('eq', ctx.config.anwesend_status);
		});
	});

	it('an unknown code → errorInvalidCode', () => {
		scan('00000000').then(res => expectPhraseError(res, 'global/errorInvalidCode', account(ctx.student.role)));
	});

	it('the old code after regenerateQRCode and degenerateQRCode → errorInvalidCode, still abwesend', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			kontrolleApi.regenerateQRCode(kontrolle.anwesenheit_id, account('LEKTOR')).fhcData();
			kontrolleApi.degenerateQRCode(kontrolle.anwesenheit_id, code, account('LEKTOR')).fhcData();

			scan(code).then(res => expectPhraseError(res, 'global/errorInvalidCode', account(ctx.student.role)));
			entryNow(kontrolle, ctx.student).its('status').should('eq', ctx.config.abwesend_status);
		});
	});

	it('a code older than 2 × REGENERATE_QR_TIMER → errorCodeTooOld, still abwesend', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			cy.task('anw:db:backdateCode', {
				anwesenheitId: kontrolle.anwesenheit_id,
				leIds: [ctx.le],
				seconds: (2 * ctx.config.regenerateQRTimer) / 1000 + 60,
			});

			scan(code).then(res => expectPhraseError(res, 'global/errorCodeTooOld', account(ctx.student.role)));
			entryNow(kontrolle, ctx.student).its('status').should('eq', ctx.config.abwesend_status);
		});
	});

	it('a student who is not in the LE → errorNotParticipantOfLE', () => {
		const outsider = studentOutsideLe(ctx);
		requireFixture(outsider, 'a test student outside the test LE');

		givenKontrolle(ctx, { qr: true }).then(({ code }) => {
			scan(code, outsider.role).then(res =>
				expectPhraseError(res, 'global/errorNotParticipantOfLE', account(outsider.role)),
			);
		});
	});

	it('an entry with Fehlminuten → the status and the Fehlminuten stay', () => {
		givenKontrolle(ctx, { qr: true }).then(state => {
			givenStatus(ctx, [
				{
					anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id,
					status: ctx.config.fehlminuten_status,
					fehlminuten: 30,
				},
			]);

			scan(state.code).fhcData();
			entryNow(state.kontrolle, ctx.student).should('include', { status: ctx.config.fehlminuten_status, fehlminuten: 30 });
		});
	});

	it('an entry entschuldigt → the status stays, the history gets anwesend', () => {
		givenKontrolle(ctx, { qr: true }).then(state => {
			const id = entryOf(state, ctx.student).anwesenheit_user_id;
			givenStatus(ctx, [{ anwesenheit_user_id: id, status: ctx.config.entschuldigt_status }], { as: account('FULL_ASSISTENZ') });

			scan(state.code).fhcData();
			entryNow(state.kontrolle, ctx.student).its('status').should('eq', ctx.config.entschuldigt_status);
			cy.task('anw:db:readHistory', { anwesenheitUserIds: [id] })
				.then(history => history.map(row => row.status))
				.should('deep.equal', [ctx.config.abwesend_status, ctx.config.anwesend_status]);
		});
	});

	it('the response of a valid scan → the times of the Kontrolle', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ code }) => {
			scan(code)
				.fhcData()
				.then(data => {
					expect(JSON.parse(data.von)).to.eq(`${ctx.today} 08:00:00`);
					expect(JSON.parse(data.bis)).to.eq(`${ctx.today} 09:30:00`);
				});
		});
	});

	it('FULL_ASSISTENZ scans a code (it has the permission) → errorNotParticipantOfLE', () => {
		givenKontrolle(ctx, { qr: true }).then(({ code }) => {
			scan(code, 'FULL_ASSISTENZ').then(res => expectPhraseError(res, 'global/errorNotParticipantOfLE', account('FULL_ASSISTENZ')));
		});
	});

	it('LEKTOR scans a code → 403', () => {
		givenKontrolle(ctx, { qr: true }).then(({ code }) => {
			scan(code, 'LEKTOR').fhcErrors(403);
		});
	});
});
