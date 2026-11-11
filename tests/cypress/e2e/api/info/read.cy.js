// InfoApi: the view data of the frontend. getStudentInfo: security/student-reads.cy.js and security/staff-scope.cy.js

import { account } from '../../../support/accounts';
import { infoApi } from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { loadAssistenzScope, useAnwContext } from '../../../support/anwContext';

describe('InfoApi: the view data', () => {
	const ctx = useAnwContext({ resets: [] });

	describe('getViewPermissions', () => {
		// a lektor has none of the rights of TIMELINE_BERECHTIGUNGEN
		const lektor = { lektor: true, student: false, admin: false, assistenz: false, timeline: false };
		const student = { student: true, lektor: false, admin: false, assistenz: false, supplierung: false };

		[
			['LEKTOR', { ...lektor, supplierung: false }],
			['LEKTOR2', { ...lektor, supplierung: false }],
			['SUPPL_LEKTOR', { ...lektor, supplierung: true }],
			['ENT_ASSISTENZ', { assistenz: true, student: false, admin: false }],
			['FULL_ASSISTENZ', { admin: true, student: false }],
			['STUDENT', student],
			['STUDENT2', student],
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

	// the endpoint has no student in its name only: every role gets the own ids
	it('getViewDataStudent as LEKTOR → the own uid and a person_id', () => {
		infoApi
			.getViewDataStudent(account('LEKTOR'))
			.fhcData()
			.then(data => {
				expect(String(data.uid).toLowerCase()).to.eq(account('LEKTOR').username.toLowerCase());
				expect(data.person_id).to.be.a('number');
			});
	});

	it('getStudiensemester → the semester of the test LV in the list, the current semester holds the day of the server', () => {
		infoApi
			.getStudiensemester(account('LEKTOR'))
			.fhcData()
			.then(([all, aktuell]) => {
				expect(all.map(sem => sem.studiensemester_kurzbz)).to.include(ctx.semKurzbz);

				requireFixture(aktuell && aktuell.length, 'a Studiensemester that holds the day of the run');
				const [{ start, ende }] = aktuell;
				expect(start <= ctx.today && ctx.today <= ende, `${start} <= ${ctx.today} <= ${ende}`).to.eq(true);
			});
	});

	it('getLvViewDataInfo → the test LV', () => {
		infoApi.getLvViewDataInfo(ctx.lvId, account('LEKTOR')).fhcData().its('0.lehrveranstaltung_id').should('eq', ctx.lvId);
	});

	// the lektor select of the Kontrolle view: the rule of that view, the admin of the LV
	it('getLektorsForLvaInSemester as FULL_ASSISTENZ → the lektors of the test LV', () => {
		infoApi
			.getLektorsForLvaInSemester(ctx.lvId, ctx.semKurzbz, account('FULL_ASSISTENZ'))
			.fhcData()
			.then(rows => {
				expect(rows.map(row => row.mitarbeiter_uid.toLowerCase())).to.include.members(
					['LEKTOR', 'LEKTOR2', 'SUPPL_LEKTOR'].map(role => account(role).username.toLowerCase()),
				);
			});
	});

	it('getLektorsForLvaInSemester as ENT_ASSISTENZ (no Kontrolle view) → noAuthorization', () => {
		infoApi
			.getLektorsForLvaInSemester(ctx.lvId, ctx.semKurzbz, account('ENT_ASSISTENZ'))
			.then(res => expectPhraseError(res, 'global/noAuthorization', account('ENT_ASSISTENZ')));
	});

	// the student dropdown of the student view: the Studiengaenge of the caller. A student outside of them:
	// assistenz/scope.cy.js
	['ENT_ASSISTENZ', 'FULL_ASSISTENZ'].forEach(role => {
		it(`getStudentsForLvaInSemester as ${role} → the students of the test LE in its Studiengaenge, no other student`, () => {
			loadAssistenzScope(ctx, role).then(({ entitled }) => {
				const inScope = ctx.students.filter(s => entitled.includes(Number(s.studiengangKz)));
				requireFixture(inScope.length, `a student of the test LE in the Studiengaenge of ${role}`);

				infoApi
					.getStudentsForLvaInSemester(ctx.lvId, ctx.semKurzbz, account(role))
					.fhcData()
					.then(rows => {
						expect(rows.map(row => row.prestudent_id)).to.include.members(inScope.map(s => s.prestudentId));
						rows.forEach(row => expect(entitled, `Studiengang of ${row.uid}`).to.include(Number(row.studiengang_kz)));
					});
			});
		});
	});

	['getLektorsForLvaInSemester', 'getStudentsForLvaInSemester'].forEach(name => {
		it(`${name} with 'null' → missingParameters, with '' → wrongParameters`, () => {
			const as = account('FULL_ASSISTENZ');
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

	it('getLektorLessons with a Termin as von and an invalid bis → the lessons of the Termin: bis falls back to von', () => {
		const termin = ctx.termine[ctx.termine.length - 1];
		requireFixture(termin, 'a Termin of the test LE');

		infoApi
			.getLektorLessons(termin, 'x', account('LEKTOR'))
			.fhcData()
			.then(rows => {
				expect(rows.map(row => row.lehreinheit_id)).to.include(ctx.le);
				expect([...new Set(rows.map(row => row.datum))]).to.deep.equal([termin]);
			});
	});

	// an invalid von falls back to today. 2026-13-45 has the form of a date, but the day does not exist
	['morgen', '2026-13-45'].forEach(von => {
		it(`getLektorLessons with von "${von}" → the lessons of today, no database text`, () => {
			infoApi
				.getLektorLessons(ctx.today, ctx.today, account('LEKTOR'))
				.fhcData()
				.then(today => {
					infoApi.getLektorLessons(von, von, account('LEKTOR')).then(res => {
						expectNoDbText(res);
						cy.wrap(res).fhcData().should('deep.equal', today);
					});
				});
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
