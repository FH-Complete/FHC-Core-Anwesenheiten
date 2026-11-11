// ProfilApi: delete an open Entschuldigung with deleteEntschuldigung

import { account } from '../../../support/accounts';
import { profilApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { decide, givenEntschuldigung, readEntschuldigung } from '../../../support/anwScenario';

describe('ProfilApi: delete an Entschuldigung', () => {
	const ctx = useAnwContext({ resets: ['entschuldigungen'], entschuldigungen: true, pdf: true });

	const student = () => ctx.testStudents.STUDENT;

	const givenOpen = (owner = student(), options = {}) =>
		givenEntschuldigung(owner, { von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00`, ...options }).its(
			'entschuldigung',
		);

	const remove = (entschuldigung, as) =>
		profilApi.deleteEntschuldigung(entschuldigung.entschuldigung_id, entschuldigung.person_id, as);

	const expectStored = entschuldigung =>
		readEntschuldigung(entschuldigung.entschuldigung_id).its('entschuldigung').should('exist');

	// an unknown id and the id of another person get the same answer: a student cannot test which ids exist
	const notFound = (res, as) => expectPhraseError(res, 'global/errorNoEntschuldigungFound', as);

	it('STUDENT, the own open one with a document → deleted with its document, one history row', () => {
		givenOpen(student(), { pdf: ctx.pdf }).then(entschuldigung => {
			remove(entschuldigung, account(student().role)).then(res =>
				expectPhraseText(res, 'global/successDeleteEnschuldigung', account(student().role)),
			);
			readEntschuldigung(entschuldigung.entschuldigung_id).then(({ entschuldigung: gone, history }) => {
				expect(gone).to.eq(null);
				expect(history).to.have.length(1);
			});
			cy.task('anw:db:dmsExists', { dmsId: entschuldigung.dms_id }).should('eq', false);
		});
	});

	[
		[true, 'accepted'],
		[false, 'declined'],
	].forEach(([status, label]) => {
		it(`STUDENT, the own ${label} one → noAuthorization, not deleted`, () => {
			givenOpen().then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, status);
				remove(entschuldigung, account(student().role)).then(res =>
					expectPhraseError(res, 'global/noAuthorization', account(student().role)),
				);
				expectStored(entschuldigung);
			});
		});
	});

	it('STUDENT, the open one of STUDENT2 → errorNoEntschuldigungFound, not deleted', () => {
		givenOpen(ctx.testStudents.STUDENT2).then(entschuldigung => {
			remove(entschuldigung, account(student().role)).then(res => notFound(res, account(student().role)));
			expectStored(entschuldigung);
		});
	});

	[
		['an unknown entschuldigung_id', UNKNOWN_ID, 'errorNoEntschuldigungFound'],
		['entschuldigung_id "abc"', 'abc', 'errorNoEntschuldigungFound'],
		['no entschuldigung_id', undefined, 'missingParameters'],
	].forEach(([label, id, phrase]) => {
		it(`${label} → ${phrase}`, () => {
			profilApi
				.deleteEntschuldigung(id, student().personId, account(student().role))
				.then(res => expectPhraseError(res, `global/${phrase}`, account(student().role)));
		});
	});

	it('FULL_ASSISTENZ, an accepted one → noAuthorization, not deleted', () => {
		givenOpen().then(entschuldigung => {
			decide(entschuldigung.entschuldigung_id, true);
			remove(entschuldigung, account('FULL_ASSISTENZ')).then(res =>
				expectPhraseError(res, 'global/noAuthorization', account('FULL_ASSISTENZ')),
			);
			expectStored(entschuldigung);
		});
	});

	it('FULL_ASSISTENZ without person_id → noAuthorization, not deleted', () => {
		givenOpen().then(entschuldigung => {
			profilApi
				.deleteEntschuldigung(entschuldigung.entschuldigung_id, undefined, account('FULL_ASSISTENZ'))
				.then(res => expectPhraseError(res, 'global/noAuthorization', account('FULL_ASSISTENZ')));
			expectStored(entschuldigung);
		});
	});

	it('FULL_ASSISTENZ with the person_id of another student → errorNoEntschuldigungFound, not deleted', () => {
		givenOpen().then(entschuldigung => {
			profilApi
				.deleteEntschuldigung(entschuldigung.entschuldigung_id, ctx.testStudents.STUDENT2.personId, account('FULL_ASSISTENZ'))
				.then(res => notFound(res, account('FULL_ASSISTENZ')));
			expectStored(entschuldigung);
		});
	});

	it('FULL_ASSISTENZ with the person_id of the student → deleted', () => {
		givenOpen().then(entschuldigung => {
			remove(entschuldigung, account('FULL_ASSISTENZ')).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id).its('entschuldigung').should('eq', null);
		});
	});
});
