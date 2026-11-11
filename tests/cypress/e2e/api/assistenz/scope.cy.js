// The Studiengaenge of the staff: an assistenz or an admin sees and changes the data of the students of their
// Studiengaenge only. AdministrationApi, the staff paths of ProfilApi and the student list of InfoApi

import { account } from '../../../support/accounts';
import { administrationApi, infoApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { loadAssistenzScope, useAnwContext } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import {
	addEntschuldigung,
	countEntschuldigungen,
	decide,
	givenEntschuldigung,
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

	it('FULL_ASSISTENZ, getEntschuldigungenByPersonID of a student of its Studiengaenge → also the uids of the staff', () => {
		const student = ctx.testStudents.STUDENT;

		givenEntschuldigung(student, range())
			.its('entschuldigung')
			.then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, true);

				profilApi
					.getEntschuldigungenByPersonID(student.personId, account('FULL_ASSISTENZ'))
					.fhcData()
					.then(rows => {
						expect(rows.find(row => row.entschuldigung_id === entschuldigung.entschuldigung_id)).to.include({
							insertvon: student.uid,
							statussetvon: account('ENT_ASSISTENZ').username.toLowerCase(),
						});
					});
			});
	});

	[
		['FULL_ASSISTENZ', () => full],
		['ENT_ASSISTENZ', () => ent],
	].forEach(([role, scopeOf]) => {
		it(`${role}, the student list of an LV with a student outside its Studiengaenge → without that student`, () => {
			const { outsider } = scopeOf();
			requireFixture(outsider, `a student outside the Studiengaenge of ${role}`);

			cy.task('anw:db:lvOfStudent', { uid: outsider.uid }).then(lv => {
				requireFixture(lv, 'an LV of the student outside the Studiengaenge');

				infoApi
					.getStudentsForLvaInSemester(lv.lvId, lv.semKurzbz, account(role))
					.fhcData()
					.then(rows => expect(rows.map(row => row.prestudent_id)).to.not.include(outsider.prestudentId));
			});
		});
	});

	// the list holds only the names of the Studiengaenge: the server does not check the rights of the caller here
	it('ENT_ASSISTENZ, InfoApi::getStudiengaenge with a Studiengang outside its rights → the name of that Studiengang', () => {
		const kzOf = rows => rows.map(row => Number(row.studiengang_kz));

		infoApi
			.getStudiengaenge([], account('FULL_ASSISTENZ'))
			.fhcData()
			.then(all => {
				const outside = kzOf(all).find(kz => !ent.entitled.includes(kz));
				requireFixture(outside, 'a Studiengang with a Studienplan outside the rights of ENT_ASSISTENZ');

				infoApi
					.getStudiengaenge([outside], account('ENT_ASSISTENZ'))
					.fhcData()
					.then(rows => expect(kzOf(rows)).to.deep.equal([outside]));
			});
	});

	// own: a student of the Studiengaenge of the caller. outside: a student of another Studiengang
	describe('ids of an own student mixed with ids of an outside student', () => {
		const own = () => ctx.testStudents.STUDENT;
		const admin = () => account('FULL_ASSISTENZ');
		const assistenz = () => account('ENT_ASSISTENZ');

		beforeEach(() => {
			requireFixture(full.outsider, 'a student outside the Studiengaenge of FULL_ASSISTENZ');
			requireFixture(ent.outsider, 'a student outside the Studiengaenge of ENT_ASSISTENZ');
		});

		it('FULL_ASSISTENZ, getAllAnwByUID: the own uid, the outside person_id → noAuthorization', () => {
			profilApi
				.getAllAnwByUID(ctx.semKurzbz, own().uid, full.outsider.personId, admin())
				.then(res => noAuthorization(res, 'FULL_ASSISTENZ'));
		});

		it('FULL_ASSISTENZ, getAllAnwesenheitenByStudentByLva: the own uid, the outside prestudent_id → noAuthorization', () => {
			profilApi
				.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, ctx.lvId, full.outsider.prestudentId, own().uid, admin())
				.then(res => noAuthorization(res, 'FULL_ASSISTENZ'));
		});

		it('FULL_ASSISTENZ, editEntschuldigung: the own person_id, the outside Entschuldigung → noAuthorization, no document', () => {
			seedEntschuldigung(ctx, full.outsider, range())
				.its('entschuldigung.entschuldigung_id')
				.then(id => {
					profilApi
						.editEntschuldigung({ person_id: own().personId, entschuldigung_id: id }, pdfFile(ctx.pdf), admin())
						.then(res => noAuthorization(res, 'FULL_ASSISTENZ'));
					readEntschuldigung(id).its('entschuldigung.dms_id').should('eq', null);
				});
		});

		it('FULL_ASSISTENZ, deleteEntschuldigung: the same ids → errorNoEntschuldigungFound, it stays', () => {
			seedEntschuldigung(ctx, full.outsider, range())
				.its('entschuldigung.entschuldigung_id')
				.then(id => {
					profilApi
						.deleteEntschuldigung(id, own().personId, admin())
						.then(res => expectPhraseError(res, 'global/errorNoEntschuldigungFound', admin()));
					readEntschuldigung(id).its('entschuldigung').should('exist');
				});
		});

		// a filter that takes all or nothing of the list passes the test with the outside Studiengang alone
		it('ENT_ASSISTENZ, getEntschuldigungen: an own and an outside Studiengang → only the own Entschuldigung', () => {
			givenEntschuldigung(own(), range())
				.its('entschuldigung.entschuldigung_id')
				.then(ownId => {
					seedEntschuldigung(ctx, ent.outsider, range())
						.its('entschuldigung.entschuldigung_id')
						.then(outsideId => {
							administrationApi
								.getEntschuldigungen([own().studiengangKz, ent.outsider.studiengangKz], ctx.today, ctx.today, false, assistenz())
								.fhcData()
								.then(rows => {
									const ids = rows.map(row => row.entschuldigung_id);
									expect(ids).to.include(ownId);
									expect(ids).to.not.include(outsideId);
								});
						});
				});
		});

		it('ENT_ASSISTENZ, getOffeneTimespan: an own and an outside Studiengang → the count of the own one', () => {
			const yesterday = addDays(ctx.today, -1);
			const offene = stgs => administrationApi.getOffeneTimespan(stgs, yesterday, yesterday, assistenz()).fhcData();

			givenEntschuldigung(own(), range());
			seedEntschuldigung(ctx, ent.outsider, range());

			offene([own().studiengangKz]).then(ownOnly => {
				expect(ownOnly.anzahl).to.be.greaterThan(0);
				offene([own().studiengangKz, ent.outsider.studiengangKz]).should('deep.equal', ownOnly);
			});
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
