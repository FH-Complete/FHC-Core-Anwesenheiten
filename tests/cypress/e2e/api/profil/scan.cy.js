// ProfilApi: a student checks in with the code of a Kontrolle (checkInAnwesenheit)

import { account } from '../../../support/accounts';
import { infoApi, kontrolleApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { studentOutsideLe, useAnwContext } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import { entryNow, entryOf, givenKontrolle, givenStatus, statusNow } from '../../../support/anwScenario';

describe('ProfilApi: check in with a code', () => {
	const ctx = useAnwContext();

	const scan = (code, role = ctx.student.role) => profilApi.checkInAnwesenheit(code, account(role));

	it('a valid code → status anwesend, updatevon and statussetvon are the student', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			scan(code).fhcData().should('have.all.keys', 'viewData', 'von', 'bis');
			entryNow(kontrolle, ctx.student).should('include', {
				status: ctx.config.anwesend_status,
				updatevon: ctx.student.uid,
				statussetvon: ctx.student.uid,
			});
		});
	});

	// the server does not compare the time of the scan with the times of the Kontrolle: check 4 of the endpoint is off
	it('the new code of a Kontrolle of yesterday → status anwesend', () => {
		givenKontrolle(ctx, { qr: true, date: addDays(ctx.today, -1) }).then(({ kontrolle, code }) => {
			scan(code).fhcData();
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.anwesend_status);
		});
	});

	it('two QR Kontrollen of the LE on one day, the code of the second → only the entry of the second is anwesend', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(first => {
			givenKontrolle(ctx, { qr: true, von: '10:00', bis: '11:30' }).then(second => {
				scan(second.code).fhcData();
				statusNow(first.kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
				statusNow(second.kontrolle, ctx.student).should('eq', ctx.config.anwesend_status);
			});
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

	// a code is lower case hex: the comparison is exact
	it('the code in upper case → errorInvalidCode, still abwesend', () => {
		// a code of digits only has no upper case form: take a new code until it has a letter
		const codeWithLetter = (kontrolle, code) =>
			/[a-f]/.test(code)
				? cy.wrap(code)
				: kontrolleApi
						.regenerateQRCode(kontrolle.anwesenheit_id, account('LEKTOR'))
						.fhcData()
						.then(({ code: next }) => codeWithLetter(kontrolle, next));

		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			codeWithLetter(kontrolle, code).then(lower => {
				scan(lower.toUpperCase()).then(res => expectPhraseError(res, 'global/errorInvalidCode', account(ctx.student.role)));
				statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
			});
		});
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

	it('a code 30 seconds younger than 2 × REGENERATE_QR_TIMER → status anwesend', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			cy.task('anw:db:backdateCode', {
				anwesenheitId: kontrolle.anwesenheit_id,
				leIds: [ctx.le],
				seconds: Math.max((2 * ctx.config.regenerateQRTimer) / 1000 - 30, 0),
			});

			scan(code).fhcData();
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.anwesend_status);
		});
	});

	// a student who joined the LE after the start of the Kontrolle has no entry in it
	it('a student of the LE without an entry in the Kontrolle → errorNoUserEntriesForAttendanceCheckFound', () => {
		givenKontrolle(ctx, { qr: true }).then(state => {
			cy.task('anw:db:deleteEntry', { anwesenheitUserId: entryOf(state, ctx.student).anwesenheit_user_id, leIds: [ctx.le] });

			scan(state.code).then(res =>
				expectPhraseError(res, 'global/errorNoUserEntriesForAttendanceCheckFound', account(ctx.student.role)),
			);
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

	it('the response of a valid scan → the times of the Kontrolle, the LV and the name of the student', () => {
		givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ code }) => {
			scan(code)
				.fhcData()
				.then(data => {
					expect(JSON.parse(data.von)).to.eq(`${ctx.today} 08:00:00`);
					expect(JSON.parse(data.bis)).to.eq(`${ctx.today} 09:30:00`);

					const [view] = JSON.parse(data.viewData).retval;
					infoApi
						.getLvViewDataInfo(ctx.lvId, account('LEKTOR'))
						.fhcData()
						.its(0)
						.then(lv => expect(view).to.include({ kurzbz: lv.kurzbz, bezeichnung: lv.bezeichnung }));
					infoApi
						.getStudentInfo(ctx.student.prestudentId, ctx.lvId, ctx.semKurzbz, account('LEKTOR'))
						.fhcData()
						.its(0)
						.then(student => expect(view).to.include({ vorname: student.vorname, nachname: student.nachname }));
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
