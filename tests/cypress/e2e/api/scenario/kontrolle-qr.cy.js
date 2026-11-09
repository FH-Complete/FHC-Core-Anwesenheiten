// Scenario S1: a Kontrolle with a QR code from the start to the delete, and the quota in every view.
// The only test that compares the quota of all four endpoints: they share extension.get_anwesenheiten_by_time

import { account } from '../../../support/accounts';
import { infoApi, kontrolleApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { dateParam } from '../../../support/anwDates';
import { entryOf, expectedQuota, givenKontrolle, readKontrolle, statusNow } from '../../../support/anwScenario';
import { step } from '../../../support/anwSteps';

describe('scenario: a Kontrolle with a QR code from start to end', () => {
	const ctx = useAnwContext();

	it('start, scan, new code, end, correction, quota in every view, delete', () => {
		const lektor = account('LEKTOR');
		const as = account(ctx.student.role);
		let kontrolle;
		let code;
		const poll = () => kontrolleApi.pollAnwesenheiten(kontrolle.anwesenheit_id, ctx.lvId, lektor).fhcData();
		const scan = scanned => profilApi.checkInAnwesenheit(scanned, as);
		const sumOf = request => request.fhcData().its('0.sum').then(Number);
		const todayInLv = rows => (rows || []).filter(row => row.lehrveranstaltung_id === ctx.lvId && row.datum === ctx.today);

		step('the lektor opens the LV: the LE, no Kontrolle', () => {
			kontrolleApi
				.getLehreinheitenForLehrveranstaltungAndMaUid(ctx.lvId, lektor.username, ctx.semKurzbz, lektor)
				.fhcData()
				.then(([les]) => expect(les.map(le => le.lehreinheit_id)).to.include(ctx.le));
			kontrolleApi
				.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.le, lektor.username, lektor)
				.fhcData()
				.its('kontrollen')
				.should('eq', null);
		});

		step('start with a QR code: everybody abwesend', () => {
			givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(state => {
				kontrolle = state.kontrolle;
				code = state.code;
				expect([...new Set(state.entries.map(e => e.status))]).to.deep.equal([ctx.config.abwesend_status]);
				poll().its('anwesend').then(Number).should('eq', 0);
			});
		});

		step('the student scans: anwesend, the poll counts 1', () => {
			scan(code).fhcData();
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.anwesend_status);
			poll().its('anwesend').then(Number).should('eq', 1);
		});

		step('a new code: the new one works, the old one stops working', () => {
			kontrolleApi
				.regenerateQRCode(kontrolle.anwesenheit_id, lektor)
				.fhcData()
				.then(({ code: newCode }) => {
					kontrolleApi.degenerateQRCode(kontrolle.anwesenheit_id, code, lektor).fhcData();
					scan(newCode).fhcData();
					scan(code).then(res => expectPhraseError(res, 'global/errorInvalidCode', as));
					code = newCode;
				});
		});

		step('a reload of the lektor page: the same code', () => {
			kontrolleApi.getExistingQRCode(ctx.le, lektor).fhcData().its('code').should('eq', code);
			kontrolleApi
				.restartKontrolle(ctx.le, dateParam(ctx.today), kontrolle.anwesenheit_id, lektor)
				.fhcData()
				.its('code')
				.should('eq', code);
		});

		step('the end: no code, a late scan fails', () => {
			kontrolleApi.deleteQRCode(kontrolle.anwesenheit_id, ctx.lvId, lektor).fhcData();
			scan(code).then(res => expectPhraseError(res, 'global/errorInvalidCode', as));
		});

		step('the lektor corrects: the student came 20 minutes late', () => {
			readKontrolle(kontrolle.anwesenheit_id).then(state => {
				const entry = {
					anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id,
					status: ctx.config.fehlminuten_status,
					fehlminuten: 20,
					notiz: 'kam später',
				};
				kontrolleApi.updateAnwesenheiten(ctx.le, [entry], lektor).fhcData();
			});
		});

		step('every view shows the same quota', () => {
			const expected = expectedQuota(ctx.config, [
				{ dauer: kontrolle.dauer, status: ctx.config.fehlminuten_status, fehlminuten: 20 },
			]);

			sumOf(profilApi.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, ctx.student.prestudentId, as)).should('eq', expected);
			sumOf(kontrolleApi.getAnwQuoteForPrestudentIds([ctx.student.prestudentId], ctx.lvId, ctx.semKurzbz, lektor)).should(
				'eq',
				expected,
			);
			sumOf(infoApi.getStudentInfo(ctx.student.prestudentId, ctx.lvId, ctx.semKurzbz, lektor)).should('eq', expected);
			profilApi
				.getAllAnwQuotasForLvaByUID(ctx.semKurzbz, as.username, as)
				.fhcData()
				.then(rows => expect(Number(rows.find(r => r.lehrveranstaltung_id === ctx.lvId).anwesenheit)).to.eq(expected));
		});

		step('the student sees the entry without the note of the lektor', () => {
			profilApi
				.getAllAnwByUID(ctx.semKurzbz, as.username, ctx.student.personId, as)
				.fhcData()
				.then(([anw]) => {
					const rows = todayInLv(anw.retval).map(row => [row.student_status, row.fehlminuten]);
					expect(rows).to.deep.equal([[ctx.config.fehlminuten_status, 20]]);
				});
			profilApi
				.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, ctx.lvId, ctx.student.prestudentId, as.username, as)
				.fhcData()
				.then(rows => rows.forEach(row => expect(row).to.not.have.property('notiz')));
		});

		step('the delete: quota 100, no entry left', () => {
			kontrolleApi.deleteAnwesenheitskontrolle(ctx.le, dateParam(ctx.today), kontrolle.anwesenheit_id, lektor).fhcData();
			sumOf(profilApi.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, ctx.student.prestudentId, as)).should('eq', 100);
			profilApi
				.getAllAnwByUID(ctx.semKurzbz, as.username, ctx.student.personId, as)
				.fhcData()
				.then(([anw]) => expect(todayInLv(anw.retval)).to.be.empty);
		});
	});
});
