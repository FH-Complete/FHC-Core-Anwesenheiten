// The scope of the staff outside the own data. The Kontrolle view (student detail too): the admin of the LV (OE) and
// its lektors, whatever the Studiengang of the student. Documents and the students page: the own Studiengaenge only.

import { account } from '../../../support/accounts';
import { entschuldigungFile, infoApi, kontrolleApi, profilApi } from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError, phraseText, requireFixture, skipIf } from '../../../support/anwChecks';
import { loadAdminForeignLv, loadAssistenzScope, useAnwContext } from '../../../support/anwContext';
import { dateParam, timeParam } from '../../../support/anwDates';
import { givenEntschuldigung, givenKontrolle, readKontrolle, resetEntschuldigungen } from '../../../support/anwScenario';

describe('security: the scope of the staff', () => {
	const ctx = useAnwContext({ pdf: true });
	let ent;
	let full;
	// an LV of LEKTOR where FULL_ASSISTENZ is not the admin: { lvId, semKurzbz, le }
	let foreign;

	before(() => {
		loadAssistenzScope(ctx, 'ENT_ASSISTENZ').then(loaded => {
			ent = loaded;
		});
		loadAssistenzScope(ctx, 'FULL_ASSISTENZ').then(loaded => {
			full = loaded;
		});
		loadAdminForeignLv(ctx).then(loaded => {
			foreign = loaded;
		});
	});

	const student = () => ctx.testStudents.STUDENT;

	describe('InfoApi::getStudentInfo', () => {
		// the quota of all endpoints: scenario/kontrolle-qr.cy.js
		it('LEKTOR, a student of the own LV → the data of the student', () => {
			infoApi
				.getStudentInfo(student().prestudentId, ctx.lvId, ctx.semKurzbz, account('LEKTOR'))
				.fhcData()
				.its(0)
				.should('include', { person_id: student().personId, prestudent_id: student().prestudentId });
		});

		it('LEKTOR2 with an LV it does not teach → noAuthorization', () => {

			infoApi
				.getStudentInfo(student().prestudentId, ctx.otherLv, ctx.otherSemKurzbz, account('LEKTOR2'))
				.then(res => expectPhraseError(res, 'global/noAuthorization', account('LEKTOR2')));
		});

		it('ENT_ASSISTENZ (no Kontrolle view) → noAuthorization', () => {
			infoApi
				.getStudentInfo(student().prestudentId, ctx.lvId, ctx.semKurzbz, account('ENT_ASSISTENZ'))
				.then(res => expectPhraseError(res, 'global/noAuthorization', account('ENT_ASSISTENZ')));
		});
	});

	describe('the student detail of the Kontrolle view: the rule of the LV, not the Studiengang of the student', () => {
		const admin = () => account('FULL_ASSISTENZ');

		it('FULL_ASSISTENZ, admin of the test LV, a student outside its Studiengaenge → the data and the quota', () => {
			requireFixture(full.outsider, 'a student outside the Studiengaenge of FULL_ASSISTENZ');

			infoApi
				.getStudentInfo(full.outsider.prestudentId, ctx.lvId, ctx.semKurzbz, admin())
				.fhcData()
				.its('0.person_id')
				.should('eq', full.outsider.personId);
			profilApi
				.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, full.outsider.prestudentId, admin())
				.fhcData()
				.then(([row]) => expect(Number(row.sum)).to.eq(100));
		});

		// both endpoints answer like KontrolleApi for the same account and LV
		['FULL_ASSISTENZ', 'LEKTOR2'].forEach(role => {
			it(`${role}: getStudentInfo and getAnwesenheitSumByLva are allowed exactly where KontrolleApi allows the LV`, () => {
				const lvs = [
					[ctx.lvId, ctx.semKurzbz],
					[ctx.otherLv, ctx.otherSemKurzbz],
				];
				lvs.forEach(([lvId, sem]) => {
					kontrolleApi.getLehreinheitenForLehrveranstaltung(lvId, sem, account(role)).then(kontrolle => {
						const allowed = kontrolle.status === 200;
						infoApi
							.getStudentInfo(student().prestudentId, lvId, sem, account(role))
							.its('status')
							.should(allowed ? 'eq' : 'not.eq', 200);
						profilApi
							.getAnwesenheitSumByLva(lvId, sem, student().prestudentId, account(role))
							.its('status')
							.should(allowed ? 'eq' : 'not.eq', 200);
					});
				});
			});
		});
	});

	// FULL_ASSISTENZ has the admin right on the OEs of the test LV and of the Studiengaenge of the test students
	describe('FULL_ASSISTENZ in an LV outside its OEs: no admin there', () => {
		const admin = () => account('FULL_ASSISTENZ');
		const kontrollenThere = () => cy.task('anw:db:countKontrollen', { leIds: [foreign.le] });
		const resetThere = () => cy.task('anw:db:resetKontrollen', { leIds: [foreign.le] });

		// the reset of the context covers the test LEs only
		beforeEach(() => {
			requireFixture(foreign, 'an LV of LEKTOR where FULL_ASSISTENZ is not the admin');
			resetThere();
		});
		after(() => {
			if (foreign) resetThere();
		});

		it('insertAnwWithoutQR in an LE of it → notAuthorizedForLe, nothing stored', () => {
			kontrolleApi
				.insertAnwWithoutQR(foreign.le, dateParam(ctx.today), timeParam('08:00'), timeParam('09:30'), admin())
				.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', admin()));
			kontrollenThere().should('eq', 0);
		});

		// the reads of the Kontrolle view. The student is in the Studiengaenge of FULL_ASSISTENZ: that does not count here
		[
			[
				'fetchAllAnwesenheitenByLva',
				'notAuthorizedForLva',
				() => kontrolleApi.fetchAllAnwesenheitenByLva(foreign.lvId, foreign.semKurzbz, [foreign.le], admin()),
			],
			[
				'InfoApi::getLektorsForLvaInSemester',
				'noAuthorization',
				() => infoApi.getLektorsForLvaInSemester(foreign.lvId, foreign.semKurzbz, admin()),
			],
			[
				'InfoApi::getStudentInfo',
				'noAuthorization',
				() => infoApi.getStudentInfo(student().prestudentId, foreign.lvId, foreign.semKurzbz, admin()),
			],
			[
				'ProfilApi::getAnwesenheitSumByLva',
				'noAuthorization',
				() => profilApi.getAnwesenheitSumByLva(foreign.lvId, foreign.semKurzbz, student().prestudentId, admin()),
			],
		].forEach(([name, phrase, call]) => {
			it(`${name} → ${phrase}`, () => {
				call().then(res => expectPhraseError(res, `global/${phrase}`, admin()));
			});
		});

		// the writes on a Kontrolle of LEKTOR there. id: the anwesenheit_id
		[
			[
				'updateAnwesenheiten',
				() => kontrolleApi.updateAnwesenheiten(foreign.le, [{ anwesenheit_user_id: 1, status: ctx.config.abwesend_status }], admin()),
			],
			['updateKontrolle', id => kontrolleApi.updateKontrolle(foreign.le, id, timeParam('10:00'), timeParam('11:00'), admin())],
			[
				'deleteAnwesenheitskontrolle',
				id => kontrolleApi.deleteAnwesenheitskontrolle(foreign.le, dateParam(ctx.today), id, admin()),
			],
		].forEach(([name, call]) => {
			it(`${name} on a Kontrolle of LEKTOR there → notAuthorizedForLe, nothing changed`, () => {
				givenKontrolle(ctx, { le: foreign.le }).then(({ code, ...state }) => {
					call(state.kontrolle.anwesenheit_id).then(res => expectPhraseError(res, 'global/notAuthorizedForLe', admin()));
					readKontrolle(state.kontrolle.anwesenheit_id).should('deep.equal', state);
				});
			});
		});
	});

	describe('ProfilApi::getAnwesenheitSumByLva', () => {
		it('LEKTOR2, a student of the LV it teaches → the quota, 100 without a Kontrolle', () => {
			profilApi
				.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, student().prestudentId, account('LEKTOR2'))
				.fhcData()
				.then(([row]) => expect(Number(row.sum)).to.eq(100));
		});

		it('LEKTOR2 with an LV it does not teach → noAuthorization', () => {

			profilApi
				.getAnwesenheitSumByLva(ctx.otherLv, ctx.otherSemKurzbz, student().prestudentId, account('LEKTOR2'))
				.then(res => expectPhraseError(res, 'global/noAuthorization', account('LEKTOR2')));
		});
	});

	describe('the document of an Entschuldigung', () => {
		beforeEach(function () {
			skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		});

		const givenDocument = () =>
			givenEntschuldigung(student(), { von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00`, pdf: ctx.pdf }).its(
				'entschuldigung',
			);

		const expectNoFile = res => {
			expect(res.headers['content-disposition'], 'a file').to.be.undefined;
			expect(String(res.body)).to.not.include('%PDF');
		};

		[
			['ENT_ASSISTENZ', () => ent],
			['FULL_ASSISTENZ', () => full],
		].forEach(([role, scopeOf]) => {
			it(`${role}, a student of its Studiengaenge → the PDF`, () => {
				givenDocument().then(({ dms_id: dmsId }) => {
					entschuldigungFile(dmsId, account(role)).then(res => {
						expect(res.headers['content-disposition']).to.match(/^attachment;/);
						expect(res.body).to.eq(ctx.pdf);
					});
				});
			});

			it(`${role}, a student outside its Studiengaenge → no file`, () => {
				const { outsider } = scopeOf();
				requireFixture(outsider, `a student outside the Studiengaenge of ${role}`);

				givenDocument().then(entschuldigung => {
					cy.task('anw:db:moveEntschuldigung', {
						entschuldigungId: entschuldigung.entschuldigung_id,
						personId: outsider.personId,
						personIds: [student().personId, outsider.personId],
					});
					entschuldigungFile(entschuldigung.dms_id, account(role)).then(expectNoFile);
				});
			});
		});

		// the reset deletes the Entschuldigung, its DMS document stays
		it('a DMS document that no Entschuldigung links → no file, for the student and for FULL_ASSISTENZ', () => {
			givenDocument().then(({ dms_id: dmsId }) => {
				resetEntschuldigungen(ctx);
				cy.task('anw:db:dmsExists', { dmsId }).should('eq', true);

				['STUDENT', 'FULL_ASSISTENZ'].forEach(role => entschuldigungFile(dmsId, account(role)).then(expectNoFile));
			});
		});

		it('a dms_id "abc" → no file, no database text', () => {
			['STUDENT', 'FULL_ASSISTENZ'].forEach(role => {
				entschuldigungFile('abc', account(role)).then(res => {
					expectNoDbText(res);
					expectNoFile(res);
				});
			});
		});

		// a page, not the API: the error is an error page with the text of the phrase
		it('without a dms_id → the error page with wrongParameters, no file', () => {
			phraseText('global/wrongParameters', account('STUDENT')).then(text => {
				entschuldigungFile('', account('STUDENT')).then(res => {
					expect(res.status).to.eq(500);
					expect(String(res.body)).to.include(text);
					expectNoFile(res);
				});
			});
		});
	});
});
