// ProfilApi: a student reads only the own data, whatever ids the request holds

import { account } from '../../../support/accounts';
import { profilApi, PROFIL_ENDPOINTS } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';

describe('ProfilApi: ids of another student', () => {
	let ctx;
	let own;
	let other;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			own = ctx.testStudents.STUDENT;
			other = ctx.testStudents.STUDENT2;
		});
	});

	const as = () => account('STUDENT');
	const noAuthorization = res => expectPhraseError(res, 'global/noAuthorization', as());

	it('every endpoint without login → 401', () => {
		PROFIL_ENDPOINTS.forEach(({ method, name, url }) => {
			(method === 'GET' ? cy.fhcGet(url, {}, null) : cy.fhcPost(url, {}, null)).then(res =>
				expect(res.status, name).to.eq(401),
			);
		});
	});

	it('getProfileViewData with the uid of STUDENT2 → noAuthorization', () => {
		profilApi.getProfileViewData(other.uid, as()).then(noAuthorization);
	});

	it('getAllAnwByUID with the uid of STUDENT2 → noAuthorization', () => {
		profilApi.getAllAnwByUID(ctx.semKurzbz, other.uid, own.personId, as()).then(noAuthorization);
	});

	it('getAllAnwByUID with the own uid and the person_id of STUDENT2 → noAuthorization', () => {
		profilApi.getAllAnwByUID(ctx.semKurzbz, as().username, other.personId, as()).then(noAuthorization);
	});

	it('getAllAnwByUID with the own uid and the person_id "<own id>abc" → noAuthorization', () => {
		profilApi.getAllAnwByUID(ctx.semKurzbz, as().username, `${own.personId}abc`, as()).then(noAuthorization);
	});

	it('getAllAnwQuotasForLvaByUID with the uid of STUDENT2 → noAuthorization', () => {
		profilApi.getAllAnwQuotasForLvaByUID(ctx.semKurzbz, other.uid, as()).then(noAuthorization);
	});

	it('getAllAnwesenheitenByStudentByLva with the own uid and the prestudent_id of STUDENT2 → noAuthorization', () => {
		profilApi
			.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, ctx.lvId, other.prestudentId, as().username, as())
			.then(noAuthorization);
	});

	it('getAnwesenheitSumByLva with the prestudent_id of STUDENT2 → noAuthorization', () => {
		profilApi.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, other.prestudentId, as()).then(noAuthorization);
	});

	it('getEntschuldigungenByPersonID with the person_id of STUDENT2 → noAuthorization', () => {
		profilApi.getEntschuldigungenByPersonID(other.personId, as()).then(noAuthorization);
	});

	it('getEntschuldigungenByPersonID with the person_id "123abc" → wrongParameters', () => {
		profilApi
			.getEntschuldigungenByPersonID('123abc', as())
			.then(res => expectPhraseError(res, 'global/wrongParameters', as()));
	});

	it('getTimeline with the person_id of STUDENT2 → noAuthorization', () => {
		profilApi.getTimeline(other.personId, as()).then(noAuthorization);
	});

	it('LEKTOR reads the quota of a student → allowed', () => {
		profilApi
			.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, own.prestudentId, account('LEKTOR'))
			.fhcData()
			.its('0.sum')
			.should('exist');
	});
});
