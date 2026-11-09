// InfoApi: the view data of the frontend. getStudentInfo: security/student-reads.cy.js and security/staff-scope.cy.js

import { account } from '../../../support/accounts';
import { infoApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';

describe('InfoApi: the view data', () => {
	const ctx = useAnwContext({ resets: [] });

	describe('getViewPermissions', () => {
		[
			['LEKTOR', { lektor: true, student: false, admin: false, assistenz: false }],
			['ENT_ASSISTENZ', { assistenz: true, student: false, admin: false }],
			['FULL_ASSISTENZ', { admin: true, student: false }],
			['STUDENT', { student: true, lektor: false, admin: false, assistenz: false }],
		].forEach(([role, flags]) => {
			it(`${role} → the flags of the role, the own uid and the day of the server`, () => {
				infoApi
					.getViewPermissions(account(role))
					.fhcData()
					.then(permissions => {
						expect(permissions).to.include(flags);
						expect(String(permissions.authID).toLowerCase()).to.eq(account(role).username.toLowerCase());
						expect(permissions.today).to.match(/^\d{4}-\d{2}-\d{2}$/);
					});
			});
		});

		it('ENT_ASSISTENZ → studiengaengeAssistenz holds the Studiengang of STUDENT', () => {
			infoApi
				.getViewPermissions(account('ENT_ASSISTENZ'))
				.fhcData()
				.then(permissions => {
					expect(Object.values(permissions.studiengaengeAssistenz || {}).map(Number)).to.include(
						Number(ctx.testStudents.STUDENT.studiengangKz),
					);
				});
		});
	});

	it('getViewDataStudent as STUDENT → the own uid and person_id', () => {
		infoApi
			.getViewDataStudent(account('STUDENT'))
			.fhcData()
			.then(data => {
				expect(String(data.uid).toLowerCase()).to.eq(ctx.testStudents.STUDENT.uid);
				expect(Number(data.person_id)).to.eq(ctx.testStudents.STUDENT.personId);
			});
	});

	it('getStudiensemester → the semester of the test LV in the list and the current semester', () => {
		infoApi
			.getStudiensemester(account('LEKTOR'))
			.fhcData()
			.then(([all, aktuell]) => {
				expect(all.map(sem => sem.studiensemester_kurzbz)).to.include(ctx.semKurzbz);
				expect(aktuell, 'the current semester').to.not.be.empty;
			});
	});

	it('getLvViewDataInfo → the test LV', () => {
		infoApi.getLvViewDataInfo(ctx.lvId, account('LEKTOR')).fhcData().its('0.lehrveranstaltung_id').should('eq', ctx.lvId);
	});

	it('getLektorsForLvaInSemester → the lektors of the test LV', () => {
		infoApi
			.getLektorsForLvaInSemester(ctx.lvId, ctx.semKurzbz, account('ENT_ASSISTENZ'))
			.fhcData()
			.then(rows => {
				expect(rows.map(row => row.mitarbeiter_uid.toLowerCase())).to.include.members(
					['LEKTOR', 'LEKTOR2', 'SUPPL_LEKTOR'].map(role => account(role).username.toLowerCase()),
				);
			});
	});

	it('getStudentsForLvaInSemester → the students of the test LE', () => {
		infoApi
			.getStudentsForLvaInSemester(ctx.lvId, ctx.semKurzbz, account('ENT_ASSISTENZ'))
			.fhcData()
			.then(rows => {
				expect(rows.map(row => row.prestudent_id)).to.include.members(ctx.students.map(s => s.prestudentId));
			});
	});

	['getLektorsForLvaInSemester', 'getStudentsForLvaInSemester'].forEach(name => {
		it(`${name} with 'null' → missingParameters, with '' → wrongParameters`, () => {
			const as = account('ENT_ASSISTENZ');
			infoApi[name]('null', ctx.semKurzbz, as).then(res => expectPhraseError(res, 'global/missingParameters', as));
			infoApi[name]('', ctx.semKurzbz, as).then(res => expectPhraseError(res, 'global/wrongParameters', as));
		});
	});

	it('getLektorLessons on a Termin of the test LE → the test LE', () => {
		const termin = ctx.termine[ctx.termine.length - 1];
		requireFixture(termin, 'a Termin of the test LE');

		infoApi
			.getLektorLessons(termin, termin, account('LEKTOR'))
			.fhcData()
			.then(rows => expect(rows.map(row => row.lehreinheit_id)).to.include(ctx.le));
	});

	it('getLektorLessons with an invalid date → the lessons of today', () => {
		infoApi
			.getLektorLessons(ctx.today, ctx.today, account('LEKTOR'))
			.fhcData()
			.then(today => {
				infoApi.getLektorLessons('morgen', 'x', account('LEKTOR')).fhcData().should('deep.equal', today);
			});
	});

	describe('getStudiengaenge', () => {
		const kz = () => Number(ctx.testStudents.STUDENT.studiengangKz);
		const kzOf = rows => rows.map(row => Number(row.studiengang_kz));

		it('FULL_ASSISTENZ → every Studiengang, also the one of STUDENT', () => {
			infoApi
				.getStudiengaenge([], account('FULL_ASSISTENZ'))
				.fhcData()
				.then(rows => {
					expect(kzOf(rows)).to.include(kz());
					expect(rows.length).to.be.greaterThan(1);
				});
		});

		it('ENT_ASSISTENZ with the Studiengang of STUDENT → only this one', () => {
			infoApi.getStudiengaenge([kz()], account('ENT_ASSISTENZ')).fhcData().then(rows => expect(kzOf(rows)).to.deep.equal([kz()]));
		});
	});
});
