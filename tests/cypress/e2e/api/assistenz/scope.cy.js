// The Studiengaenge of the staff: an assistenz or an admin sees and changes the data of the students of their
// Studiengaenge only. AdministrationApi::getTimeline and the staff paths of ProfilApi

import { account } from '../../../support/accounts';
import { administrationApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { loadAnwContext, loadAssistenzScope } from '../../../support/anwContext';
import {
	addEntschuldigung,
	countEntschuldigungen,
	pdfFile,
	readEntschuldigung,
	resetEntschuldigungen,
	seedEntschuldigung,
} from '../../../support/anwScenario';

describe('staff scope: the students of the own Studiengaenge', () => {
	let ctx;
	let pdf;
	let ent;
	let full;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			loadAssistenzScope(ctx, 'ENT_ASSISTENZ').then(scope => {
				ent = scope;
			});
			loadAssistenzScope(ctx, 'FULL_ASSISTENZ').then(scope => {
				full = scope;
			});
		});
		cy.fixture('entschuldigung.pdf', 'utf8').then(content => {
			pdf = content;
		});
	});

	beforeEach(function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		resetEntschuldigungen(ctx);
	});

	const range = () => ({ von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00` });
	const noAuthorization = (res, role) => expectPhraseError(res, 'global/noAuthorization', account(role));

	// the ProfilApi endpoints that the admin calls with the ids of a student
	const PROFIL_READS = [
		['getProfileViewData', (s, as) => profilApi.getProfileViewData(s.uid, as)],
		['getAllAnwByUID', (s, as) => profilApi.getAllAnwByUID(ctx.semKurzbz, s.uid, s.personId, as)],
		['getAllAnwQuotasForLvaByUID', (s, as) => profilApi.getAllAnwQuotasForLvaByUID(ctx.semKurzbz, s.uid, as)],
		[
			'getAllAnwesenheitenByStudentByLva',
			(s, as) => profilApi.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, ctx.lvId, s.prestudentId, s.uid, as),
		],
		['getAnwesenheitSumByLva', (s, as) => profilApi.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, s.prestudentId, as)],
		['getEntschuldigungenByPersonID', (s, as) => profilApi.getEntschuldigungenByPersonID(s.personId, as)],
		['getTimeline', (s, as) => profilApi.getTimeline(s.personId, as)],
	];

	it('ENT_ASSISTENZ, AdministrationApi::getTimeline of the test student → allowed', () => {
		administrationApi.getTimeline(ctx.testStudents.STUDENT.personId, account('ENT_ASSISTENZ')).fhcData();
	});

	it('ENT_ASSISTENZ, AdministrationApi::getTimeline of a student outside its Studiengaenge → noAuthorization', function () {
		skipIf(this, !ent.outsider, 'ENT_ASSISTENZ has a right on every Studiengang');
		administrationApi
			.getTimeline(ent.outsider.personId, account('ENT_ASSISTENZ'))
			.then(res => noAuthorization(res, 'ENT_ASSISTENZ'));
	});

	it('ENT_ASSISTENZ, ProfilApi::getTimeline of a student outside its Studiengaenge → noAuthorization', function () {
		skipIf(this, !ent.outsider, 'ENT_ASSISTENZ has a right on every Studiengang');
		profilApi.getTimeline(ent.outsider.personId, account('ENT_ASSISTENZ')).then(res => noAuthorization(res, 'ENT_ASSISTENZ'));
	});

	it('FULL_ASSISTENZ, every ProfilApi read with the ids of the test student → allowed', () => {
		PROFIL_READS.forEach(([name, call]) => {
			call(ctx.testStudents.STUDENT, account('FULL_ASSISTENZ')).then(res => expect(res.status, name).to.eq(200));
		});
	});

	PROFIL_READS.forEach(([name, call]) => {
		it(`FULL_ASSISTENZ, ${name} for a student outside its Studiengaenge → noAuthorization`, function () {
			skipIf(this, !full.outsider, 'FULL_ASSISTENZ has a right on every Studiengang');
			call(full.outsider, account('FULL_ASSISTENZ')).then(res => noAuthorization(res, 'FULL_ASSISTENZ'));
		});
	});

	it('FULL_ASSISTENZ, addEntschuldigung for a student outside its Studiengaenge → errorNoRightsToChangeData, nothing stored', function () {
		skipIf(this, !full.outsider, 'FULL_ASSISTENZ has a right on every Studiengang');

		addEntschuldigung(full.outsider, { ...range(), as: account('FULL_ASSISTENZ') }).then(res =>
			expectPhraseError(res, 'global/errorNoRightsToChangeData', account('FULL_ASSISTENZ')),
		);
		countEntschuldigungen(ctx).should('eq', 0);
	});

	it('FULL_ASSISTENZ, editEntschuldigung of a student outside its Studiengaenge → errorNoRightsToChangeData, no document', function () {
		skipIf(this, !full.outsider, 'FULL_ASSISTENZ has a right on every Studiengang');

		seedEntschuldigung(ctx, full.outsider, range())
			.its('entschuldigung')
			.then(entschuldigung => {
				profilApi
					.editEntschuldigung(
						{ person_id: full.outsider.personId, entschuldigung_id: entschuldigung.entschuldigung_id },
						pdfFile(pdf),
						account('FULL_ASSISTENZ'),
					)
					.then(res => expectPhraseError(res, 'global/errorNoRightsToChangeData', account('FULL_ASSISTENZ')));
				readEntschuldigung(entschuldigung.entschuldigung_id, full.outsider).its('entschuldigung.dms_id').should('eq', null);
			});
	});

	it('FULL_ASSISTENZ, deleteEntschuldigung of a student outside its Studiengaenge → noAuthorization, it stays', function () {
		skipIf(this, !full.outsider, 'FULL_ASSISTENZ has a right on every Studiengang');

		seedEntschuldigung(ctx, full.outsider, range())
			.its('entschuldigung')
			.then(entschuldigung => {
				profilApi
					.deleteEntschuldigung(entschuldigung.entschuldigung_id, full.outsider.personId, account('FULL_ASSISTENZ'))
					.then(res => noAuthorization(res, 'FULL_ASSISTENZ'));
				readEntschuldigung(entschuldigung.entschuldigung_id, full.outsider).its('entschuldigung').should('exist');
			});
	});
});
