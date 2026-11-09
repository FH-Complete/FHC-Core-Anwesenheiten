// ProfilApi: a document for an open Entschuldigung with editEntschuldigung

import { account } from '../../../support/accounts';
import { profilApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { decide, givenEntschuldigung, pdfFile, readEntschuldigung } from '../../../support/anwScenario';

describe('ProfilApi: hand in a document later', () => {
	const ctx = useAnwContext({ resets: ['entschuldigungen'], entschuldigungen: true, pdf: true });

	const student = () => ctx.testStudents.STUDENT;

	const givenOpen = (owner = student()) =>
		givenEntschuldigung(owner, { von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00` }).its('entschuldigung');

	// the person_id of the request is the one of student(), the Entschuldigung can be another one
	const edit = (entschuldigung, as = account(student().role)) =>
		profilApi.editEntschuldigung(
			{ person_id: student().personId, entschuldigung_id: entschuldigung.entschuldigung_id },
			pdfFile(ctx.pdf),
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
			readEntschuldigung(entschuldigung.entschuldigung_id).then(state => {
				expect(state.entschuldigung.version).to.eq(2);
				expect(state.entschuldigung.dms_id).to.be.a('number');
				expect(state.document).to.eq(true);
				expect(state.history).to.eq(1);
			});
		});
	});

	it('a second document → version 3, two history rows, a new dms_id', () => {
		givenOpen().then(entschuldigung => {
			edit(entschuldigung)
				.fhcData()
				.then(({ dms_id: firstDms }) => {
					edit(entschuldigung).fhcData();
					readEntschuldigung(entschuldigung.entschuldigung_id).then(state => {
						expect(state.entschuldigung.version).to.eq(3);
						expect(state.history).to.eq(2);
						expect(state.entschuldigung.dms_id).to.not.eq(Number(firstDms));
						expect(state.document).to.eq(true);
					});
				});
		});
	});

	it('an unknown entschuldigung_id → errorNoEntschuldigungFound', () => {
		edit({ entschuldigung_id: UNKNOWN_ID }).then(res =>
			expectPhraseError(res, 'global/errorNoEntschuldigungFound', account(student().role)),
		);
	});

	it('a .txt file → errorEntUploadFiletype, no document, version 1', () => {
		givenOpen().then(entschuldigung => {
			profilApi
				.editEntschuldigung(
					{ person_id: student().personId, entschuldigung_id: entschuldigung.entschuldigung_id },
					{ field: 'files', name: 'bestaetigung.txt', type: 'text/plain', content: 'Text' },
					account(student().role),
				)
				.then(res => expectPhraseError(res, 'global/errorEntUploadFiletype', account(student().role)));
			readEntschuldigung(entschuldigung.entschuldigung_id)
				.its('entschuldigung')
				.should('include', { dms_id: null, version: 1 });
		});
	});

	it('after the upload deadline → errorEntUploadDeadlinePassed, no document', () => {
		givenOpen().then(entschuldigung => {
			backdate(entschuldigung);
			edit(entschuldigung).then(res =>
				expectPhraseError(res, 'global/errorEntUploadDeadlinePassed', account(student().role)),
			);
			readEntschuldigung(entschuldigung.entschuldigung_id)
				.its('entschuldigung')
				.should('include', { dms_id: null, version: 1 });
		});
	});

	it('FULL_ASSISTENZ after the upload deadline → the document is added', () => {
		givenOpen().then(entschuldigung => {
			backdate(entschuldigung);
			edit(entschuldigung, account('FULL_ASSISTENZ')).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id).its('document').should('eq', true);
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
				readEntschuldigung(entschuldigung.entschuldigung_id).its('entschuldigung.dms_id').should('eq', null);
			});
		});
	});

	it('the Entschuldigung of STUDENT2 with the own person_id → noAuthorization, no document', () => {
		givenOpen(ctx.testStudents.STUDENT2).then(entschuldigung => {
			edit(entschuldigung).then(res => expectPhraseError(res, 'global/noAuthorization', account(student().role)));
			readEntschuldigung(entschuldigung.entschuldigung_id)
				.its('entschuldigung.dms_id')
				.should('eq', null);
		});
	});
});
