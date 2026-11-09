// Scenario S3: an Entschuldigung from the request to the decision, with the views of student, assistenz and lektor

import { account } from '../../../support/accounts';
import { administrationApi, entschuldigungFile, kontrolleApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import {
	addEntschuldigung,
	decide,
	givenKontrolle,
	pdfFile,
	readEntschuldigung,
	statusNow,
} from '../../../support/anwScenario';
import { step } from '../../../support/anwSteps';

describe('scenario: an Entschuldigung from the request to the decision', () => {
	const ctx = useAnwContext({ entschuldigungen: true, pdf: true });

	it('absent, request without document, document later, accept, new Kontrolle, decline', () => {
		const as = account(ctx.student.role);
		const ent = account('ENT_ASSISTENZ');
		const yesterday = addDays(ctx.today, -1);
		const quota = () =>
			profilApi.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, ctx.student.prestudentId, as).fhcData().its('0.sum').then(Number);
		const listed = (nurOffene = false) =>
			administrationApi
				.getEntschuldigungen([ctx.student.studiengangKz], ctx.today, ctx.today, nurOffene, ent)
				.fhcData()
				.then(rows => rows || []);
		let first;
		let second;
		let entschuldigungId;
		let offeneBefore;

		step('a QR Kontrolle, the student does not scan: abwesend, quota 0', () => {
			givenKontrolle(ctx, { qr: true, von: '08:00', bis: '09:30' }).then(({ kontrolle }) => {
				first = kontrolle;
				statusNow(first, ctx.student).should('eq', ctx.config.abwesend_status);
				quota().should('eq', 0);
			});
			administrationApi.getOffeneTimespan([ctx.student.studiengangKz], yesterday, yesterday, ent).fhcData().then(offene => {
				offeneBefore = offene.anzahl;
			});
		});

		step('the student asks without a document: open, in the list of the assistenz, the entry stays abwesend', () => {
			addEntschuldigung(ctx.student, { von: `${ctx.today} 07:00:00`, bis: `${ctx.today} 12:00:00` })
				.fhcData()
				.then(({ entschuldigung_id: id }) => {
					entschuldigungId = id;
					listed(true).then(rows => expect(rows.map(r => r.entschuldigung_id)).to.include(id));
				});
			administrationApi
				.getOffeneTimespan([ctx.student.studiengangKz], yesterday, yesterday, ent)
				.fhcData()
				.its('anzahl')
				.should('eq', offeneBefore + 1);
			statusNow(first, ctx.student).should('eq', ctx.config.abwesend_status);
		});

		step('the student hands in the PDF: version 2, the assistenz downloads it', () => {
			const fields = { person_id: ctx.student.personId, entschuldigung_id: entschuldigungId };
			profilApi.editEntschuldigung(fields, pdfFile(ctx.pdf), as).fhcData();
			readEntschuldigung(entschuldigungId).its('entschuldigung').should('include', { version: 2 });
			listed().then(rows => {
				const row = rows.find(r => r.entschuldigung_id === entschuldigungId);
				expect(row.dms_id, 'the document in the list').to.be.a('number');
				entschuldigungFile(row.dms_id, ent).its('body').should('eq', ctx.pdf);
				entschuldigungFile(row.dms_id, as).its('body').should('eq', ctx.pdf);
			});
		});

		step('the assistenz accepts: entschuldigt, quota 100, the student sees the decision', () => {
			decide(entschuldigungId, true);
			statusNow(first, ctx.student).should('eq', ctx.config.entschuldigt_status);
			quota().should('eq', 100);
			profilApi
				.getEntschuldigungenByPersonID(ctx.student.personId, as)
				.fhcData()
				.then(rows => expect(rows.find(r => r.entschuldigung_id === entschuldigungId).akzeptiert).to.eq(true));
		});

		step('the lektor starts a second Kontrolle in the range: entschuldigt from the start', () => {
			givenKontrolle(ctx, { von: '10:00', bis: '11:00' }).then(({ kontrolle }) => {
				second = kontrolle;
				statusNow(second, ctx.student).should('eq', ctx.config.entschuldigt_status);
			});
		});

		step('the student cannot delete or change the accepted one', () => {
			profilApi
				.deleteEntschuldigung(entschuldigungId, ctx.student.personId, as)
				.then(res => expectPhraseError(res, 'global/noAuthorization', as));
			profilApi
				.editEntschuldigung({ person_id: ctx.student.personId, entschuldigung_id: entschuldigungId }, pdfFile(ctx.pdf), as)
				.then(res => expectPhraseError(res, 'global/errorEntAlreadyAccepted', as));
			readEntschuldigung(entschuldigungId).its('entschuldigung').should('include', { akzeptiert: true, version: 3 });
		});

		// an entry that started entschuldigt has no state before it: abwesend
		step('the assistenz declines: both Kontrollen abwesend, quota 0, the lektor table shows the decision', () => {
			decide(entschuldigungId, false, { notiz: 'Bestätigung ungültig' });
			statusNow(first, ctx.student).should('eq', ctx.config.abwesend_status);
			statusNow(second, ctx.student).should('eq', ctx.config.abwesend_status);
			quota().should('eq', 0);
			kontrolleApi
				.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.le, account('LEKTOR').username, account('LEKTOR'))
				.fhcData()
				.then(({ entschuldigtStati }) => {
					const ofStudent = (entschuldigtStati || []).filter(s => Number(s.person_id) === ctx.student.personId);
					expect(ofStudent.map(s => s.akzeptiert)).to.deep.equal([false]);
				});
		});
	});
});
