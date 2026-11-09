// The scope of the staff outside the own data. The Kontrolle view (student detail too): the admin of the LV (OE) and
// its lektors, whatever the Studiengang of the student. Documents and the students page: the own Studiengaenge only.

import { account } from '../../../support/accounts';
import { entschuldigungFile, infoApi, kontrolleApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture, skipIf } from '../../../support/anwChecks';
import { loadAssistenzScope, useAnwContext } from '../../../support/anwContext';
import { givenEntschuldigung } from '../../../support/anwScenario';

describe('security: the scope of the staff', () => {
	const ctx = useAnwContext({ resets: ['entschuldigungen'], pdf: true });
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
				.its('0.sum')
				.should('exist');
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

	describe('ProfilApi::getAnwesenheitSumByLva', () => {
		it('LEKTOR2, a student of the LV it teaches → the quota', () => {
			profilApi
				.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, student().prestudentId, account('LEKTOR2'))
				.fhcData()
				.its('0.sum')
				.should('exist');
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

		it('ENT_ASSISTENZ, a student of its Studiengaenge → the PDF', () => {
			givenDocument().then(({ dms_id: dmsId }) => {
				entschuldigungFile(dmsId, account('ENT_ASSISTENZ')).then(res => {
					expect(res.headers['content-disposition']).to.match(/^attachment;/);
					expect(res.body).to.eq(ctx.pdf);
				});
			});
		});

		it('ENT_ASSISTENZ, a student outside its Studiengaenge → no file', () => {
			requireFixture(ent.outsider, 'a student outside the Studiengaenge of ENT_ASSISTENZ');

			givenDocument().then(entschuldigung => {
				cy.task('anw:db:moveEntschuldigung', {
					entschuldigungId: entschuldigung.entschuldigung_id,
					personId: ent.outsider.personId,
					personIds: [student().personId, ent.outsider.personId],
				});
				entschuldigungFile(entschuldigung.dms_id, account('ENT_ASSISTENZ')).then(res => {
					expect(res.headers['content-disposition'], 'a file').to.be.undefined;
					expect(String(res.body)).to.not.include('%PDF');
				});
			});
		});
	});
});
