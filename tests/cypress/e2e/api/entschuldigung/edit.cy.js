// ProfilApi: a document for an open Entschuldigung with editEntschuldigung

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import {
	decide,
	givenEntschuldigung,
	pdfFile,
	readEntschuldigung,
	resetEntschuldigungen,
} from '../../../support/anwScenario';

describe('ProfilApi: hand in a document later', () => {
	let ctx;
	let pdf;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
		});
		cy.fixture('entschuldigung.pdf', 'utf8').then(content => {
			pdf = content;
		});
	});

	beforeEach(function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		resetEntschuldigungen(ctx);
	});

	const student = () => ctx.testStudents.STUDENT;

	const givenOpen = (owner = student()) =>
		givenEntschuldigung(owner, { von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00` }).its('entschuldigung');

	// the person_id of the request is the one of student(), the Entschuldigung can be another one
	const edit = (entschuldigung, as = account(student().role)) =>
		profilApi.editEntschuldigung(
			{ person_id: student().personId, entschuldigung_id: entschuldigung.entschuldigung_id },
			pdfFile(pdf),
			as,
		);

	// the upload deadline: ENTSCHULDIGUNG_MAX_REACH workdays after insertamum, so this is always after it
	const afterDeadline = () => ctx.config.entschuldigungMaxReach * 2 + 7;

	const backdate = entschuldigung =>
		cy.task('anw:db:backdateEntschuldigung', {
			entschuldigungId: entschuldigung.entschuldigung_id,
			personIds: [student().personId],
			days: afterDeadline(),
		});

	it('an open one without a document → the document is added, version 2, one history row', () => {
		givenOpen().then(entschuldigung => {
			edit(entschuldigung).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id, student()).then(state => {
				expect(state.entschuldigung.version).to.eq(2);
				expect(state.entschuldigung.dms_id).to.be.a('number');
				expect(state.document).to.eq(true);
				expect(state.history).to.eq(1);
			});
		});
	});

	it('after the upload deadline → errorEntUploadDeadlinePassed, no document', () => {
		givenOpen().then(entschuldigung => {
			backdate(entschuldigung);
			edit(entschuldigung).then(res =>
				expectPhraseError(res, 'global/errorEntUploadDeadlinePassed', account(student().role)),
			);
			readEntschuldigung(entschuldigung.entschuldigung_id, student())
				.its('entschuldigung')
				.should('include', { dms_id: null, version: 1 });
		});
	});

	it('FULL_ASSISTENZ after the upload deadline → the document is added', () => {
		givenOpen().then(entschuldigung => {
			backdate(entschuldigung);
			edit(entschuldigung, account('FULL_ASSISTENZ')).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id, student()).its('document').should('eq', true);
		});
	});

	[
		[true, 'errorEntAlreadyAccepted'],
		[false, 'errorEntAlreadyDeclined'],
	].forEach(([status, phrase]) => {
		it(`${status ? 'accepted' : 'declined'} → ${phrase}, no document`, () => {
			givenOpen().then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, status);
				edit(entschuldigung).then(res => expectPhraseError(res, `global/${phrase}`, account(student().role)));
				readEntschuldigung(entschuldigung.entschuldigung_id, student()).its('entschuldigung.dms_id').should('eq', null);
			});
		});
	});

	it('the Entschuldigung of STUDENT2 with the own person_id → noAuthorization, no document', () => {
		givenOpen(ctx.testStudents.STUDENT2).then(entschuldigung => {
			edit(entschuldigung).then(res => expectPhraseError(res, 'global/noAuthorization', account(student().role)));
			readEntschuldigung(entschuldigung.entschuldigung_id, ctx.testStudents.STUDENT2)
				.its('entschuldigung.dms_id')
				.should('eq', null);
		});
	});
});
