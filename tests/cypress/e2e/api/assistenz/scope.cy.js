// The Studiengaenge of the staff: an assistenz or an admin sees and changes the data of the students of their
// Studiengaenge only. AdministrationApi::getTimeline and the staff paths of ProfilApi

import { account } from '../../../support/accounts';
import { administrationApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { loadAssistenzScope, useAnwContext } from '../../../support/anwContext';
import {
	addEntschuldigung,
	countEntschuldigungen,
	pdfFile,
	readEntschuldigung,
	seedEntschuldigung,
} from '../../../support/anwScenario';

describe('staff scope: the students of the own Studiengaenge', () => {
	const ctx = useAnwContext({ resets: ['entschuldigungen'], entschuldigungen: true, pdf: true });
	let ent;
	let full;

	before(() => {
		loadAssistenzScope(ctx, 'ENT_ASSISTENZ').then(loaded => {
			ent = loaded;
		});
		loadAssistenzScope(ctx, 'FULL_ASSISTENZ').then(loaded => {
			full = loaded;
		});
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

	it('ENT_ASSISTENZ, AdministrationApi::getTimeline of a student outside its Studiengaenge → noAuthorization', () => {
		requireFixture(ent.outsider, 'a student outside the Studiengaenge of ENT_ASSISTENZ');
		administrationApi
			.getTimeline(ent.outsider.personId, account('ENT_ASSISTENZ'))
			.then(res => noAuthorization(res, 'ENT_ASSISTENZ'));
	});

	it('ENT_ASSISTENZ, ProfilApi::getTimeline of a student outside its Studiengaenge → noAuthorization', () => {
		requireFixture(ent.outsider, 'a student outside the Studiengaenge of ENT_ASSISTENZ');
		profilApi.getTimeline(ent.outsider.personId, account('ENT_ASSISTENZ')).then(res => noAuthorization(res, 'ENT_ASSISTENZ'));
	});

	it('FULL_ASSISTENZ, every ProfilApi read with the ids of the test student → allowed', () => {
		PROFIL_READS.forEach(([name, call]) => {
			call(ctx.testStudents.STUDENT, account('FULL_ASSISTENZ')).then(res => expect(res.status, name).to.eq(200));
		});
	});

	// the reads of the students page. getAnwesenheitSumByLva belongs to the Kontrolle view: security/staff-scope.cy.js
	PROFIL_READS.filter(([name]) => name !== 'getAnwesenheitSumByLva').forEach(([name, call]) => {
		it(`FULL_ASSISTENZ, ${name} for a student outside its Studiengaenge → noAuthorization`, () => {
			requireFixture(full.outsider, 'a student outside the Studiengaenge of FULL_ASSISTENZ');
			call(full.outsider, account('FULL_ASSISTENZ')).then(res => noAuthorization(res, 'FULL_ASSISTENZ'));
		});
	});

	it('FULL_ASSISTENZ, addEntschuldigung for a student outside its Studiengaenge → errorNoRightsToChangeData', () => {
		requireFixture(full.outsider, 'a student outside the Studiengaenge of FULL_ASSISTENZ');

		addEntschuldigung(full.outsider, { ...range(), as: account('FULL_ASSISTENZ') }).then(res =>
			expectPhraseError(res, 'global/errorNoRightsToChangeData', account('FULL_ASSISTENZ')),
		);
		countEntschuldigungen(ctx).should('eq', 0);
	});

	it('FULL_ASSISTENZ, editEntschuldigung of a student outside its Studiengaenge → errorNoRightsToChangeData', () => {
		requireFixture(full.outsider, 'a student outside the Studiengaenge of FULL_ASSISTENZ');

		seedEntschuldigung(ctx, full.outsider, range())
			.its('entschuldigung')
			.then(entschuldigung => {
				profilApi
					.editEntschuldigung(
						{ person_id: full.outsider.personId, entschuldigung_id: entschuldigung.entschuldigung_id },
						pdfFile(ctx.pdf),
						account('FULL_ASSISTENZ'),
					)
					.then(res => expectPhraseError(res, 'global/errorNoRightsToChangeData', account('FULL_ASSISTENZ')));
				readEntschuldigung(entschuldigung.entschuldigung_id).its('entschuldigung.dms_id').should('eq', null);
			});
	});

	it('FULL_ASSISTENZ, deleteEntschuldigung of a student outside its Studiengaenge → noAuthorization, it stays', () => {
		requireFixture(full.outsider, 'a student outside the Studiengaenge of FULL_ASSISTENZ');

		seedEntschuldigung(ctx, full.outsider, range())
			.its('entschuldigung')
			.then(entschuldigung => {
				profilApi
					.deleteEntschuldigung(entschuldigung.entschuldigung_id, full.outsider.personId, account('FULL_ASSISTENZ'))
					.then(res => noAuthorization(res, 'FULL_ASSISTENZ'));
				readEntschuldigung(entschuldigung.entschuldigung_id).its('entschuldigung').should('exist');
			});
	});
});
