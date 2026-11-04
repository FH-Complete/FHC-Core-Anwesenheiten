// ProfilApi: delete an open Entschuldigung with deleteEntschuldigung

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { expectPhraseText, skipIf } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { decide, givenEntschuldigung, readEntschuldigung, resetEntschuldigungen } from '../../../support/anwScenario';

describe('ProfilApi: delete an Entschuldigung', () => {
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

	const givenOpen = (owner = student(), options = {}) =>
		givenEntschuldigung(owner, { von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00`, ...options }).its(
			'entschuldigung',
		);

	const remove = (entschuldigung, as) =>
		profilApi.deleteEntschuldigung(entschuldigung.entschuldigung_id, entschuldigung.person_id, as);

	const expectStored = (entschuldigung, owner = student()) =>
		readEntschuldigung(entschuldigung.entschuldigung_id, owner).its('entschuldigung').should('exist');

	it('STUDENT, the own open one with a document → deleted with its document, one history row', () => {
		givenOpen(student(), { pdf }).then(entschuldigung => {
			remove(entschuldigung, account(student().role)).then(res =>
				expectPhraseText(res, 'global/successDeleteEnschuldigung', account(student().role)),
			);
			readEntschuldigung(entschuldigung.entschuldigung_id, student()).then(({ entschuldigung: gone, history }) => {
				expect(gone).to.eq(null);
				expect(history).to.eq(1);
			});
			cy.task('anw:db:dmsExists', { dmsId: entschuldigung.dms_id }).should('eq', false);
		});
	});

	it('STUDENT, the own accepted one → not deleted', () => {
		givenOpen().then(entschuldigung => {
			decide(entschuldigung.entschuldigung_id, true);
			remove(entschuldigung, account(student().role)).fhcErrors();
			expectStored(entschuldigung);
		});
	});

	it('STUDENT, the open one of STUDENT2 → not deleted', () => {
		givenOpen(ctx.testStudents.STUDENT2).then(entschuldigung => {
			remove(entschuldigung, account(student().role)).fhcErrors();
			expectStored(entschuldigung, ctx.testStudents.STUDENT2);
		});
	});

	it('FULL_ASSISTENZ with the person_id of the student → deleted', () => {
		givenOpen().then(entschuldigung => {
			remove(entschuldigung, account('FULL_ASSISTENZ')).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id, student()).its('entschuldigung').should('eq', null);
		});
	});
});
