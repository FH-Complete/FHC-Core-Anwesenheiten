// KontrolleApi: the reads of the lektor table and of the student detail. Requests without parameters:
// security/parameters.cy.js

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import { decide, expectedQuota, givenEntschuldigung, givenKontrolle, givenStatus } from '../../../support/anwScenario';

describe('KontrolleApi: the reads of the lektor', () => {
	const ctx = useAnwContext();

	const lektor = () => account('LEKTOR');

	it('fetchAllAnwesenheitenByLvaAssigned → the students, the entries and the Kontrolle of the LE', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			kontrolleApi
				.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.le, lektor().username, lektor())
				.fhcData()
				.then(data => {
					expect(data.students.map(s => s.prestudent_id)).to.have.members(ctx.students.map(s => s.prestudentId));
					expect(data.anwEntries.map(e => e.anwesenheit_user_id)).to.have.members(entries.map(e => e.anwesenheit_user_id));
					expect(data.kontrollen.map(k => k.anwesenheit_id)).to.deep.equal([kontrolle.anwesenheit_id]);
					const [row] = data.kontrollen;
					expect([row.dauer, row.anwesend, row.abwesend].map(Number)).to.deep.equal([kontrolle.dauer, entries.length, 0]);
					// the API sends null, not an empty list, without any Entschuldigung of the students
					expect(data.entschuldigtStati).to.eq(null);
					expect(data.a_o_kz).to.match(/^9\d{3}$/);
				});
		});
	});

	it('fetchAllAnwesenheitenByLvaAssigned for a semester without students in the LE → noStudentsFoundV3', () => {
		kontrolleApi
			.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, 'XX1900', ctx.le, lektor().username, lektor())
			.then(res => expectPhraseError(res, 'global/noStudentsFoundV3', lektor()));
	});

	// the docblock of the endpoint says accepted only: the lektor table shows every state of an Entschuldigung
	it('entschuldigtStati → the open, the accepted and the declined Entschuldigung of a student', function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		const onDay = days => ({ von: `${addDays(ctx.today, days)} 08:00:00`, bis: `${addDays(ctx.today, days)} 12:00:00` });

		givenEntschuldigung(ctx.student, onDay(1));
		[true, false].forEach((decision, index) => {
			givenEntschuldigung(ctx.student, onDay(index + 2)).then(({ entschuldigung }) =>
				decide(entschuldigung.entschuldigung_id, decision),
			);
		});

		kontrolleApi
			.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.le, lektor().username, lektor())
			.fhcData()
			.then(({ entschuldigtStati }) => {
				const own = entschuldigtStati.filter(row => row.person_id === ctx.student.personId);
				expect(own.map(row => row.akzeptiert)).to.have.members([null, true, false]);
			});
	});

	it('fetchAllAnwesenheitenByLva with the same LE two times → the students and the Kontrolle one time', () => {
		givenKontrolle(ctx).then(({ kontrolle }) => {
			kontrolleApi
				.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, [ctx.le, ctx.le], lektor())
				.fhcData()
				.then(data => {
					expect(data.students.map(s => s.prestudent_id)).to.have.members(ctx.students.map(s => s.prestudentId));
					expect(data.kontrollen.map(k => k.anwesenheit_id)).to.deep.equal([kontrolle.anwesenheit_id]);
				});
		});
	});

	it('fetchAllAnwesenheitenByLva with an empty le_ids → wrongParameters', () => {
		kontrolleApi
			.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, [], lektor())
			.then(res => expectPhraseError(res, 'global/wrongParameters', lektor()));
	});

	it('fetchAllAnwesenheitenByLva with both LEs as FULL_ASSISTENZ → the students and the Kontrollen of both', () => {
		givenKontrolle(ctx);
		givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ'), von: '10:00', bis: '11:00' });

		kontrolleApi
			.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, [ctx.le, ctx.foreignLe], account('FULL_ASSISTENZ'))
			.fhcData()
			.then(data => {
				expect(data.students.map(s => s.prestudent_id)).to.include.members(
					[...ctx.students, ...ctx.foreignStudents].map(s => s.prestudentId),
				);
				expect(data.kontrollen.map(k => k.lehreinheit_id)).to.have.members([ctx.le, ctx.foreignLe]);
			});
	});

	// editable: the caller may change the entry, the check of updateAnwesenheiten. [in the LE of LEKTOR, in the LE of LEKTOR2]
	[
		['LEKTOR', [true, false]],
		['LEKTOR2', [false, true]],
		['SUPPL_LEKTOR', [true, true]],
		['FULL_ASSISTENZ', [true, true]],
	].forEach(([role, [inOwnLe, inForeignLe]]) => {
		const editable = `editable ${inOwnLe} in the LE of LEKTOR, ${inForeignLe} in the LE of LEKTOR2`;

		it(`getAllAnwesenheitenByStudentByLva as ${role} → ${editable}`, function () {
			const substitute = role === 'SUPPL_LEKTOR';
			skipIf(this, substitute && ctx.config.legacy_le_selection, 'LEGACY_LE_SELECTION limits a lektor to the own LEs');

			const shared = ctx.foreignStudents.find(f => ctx.students.some(s => s.prestudentId === f.prestudentId));
			const own = shared || ctx.students[0];
			const foreign = shared || ctx.foreignStudents[0];
			requireFixture(foreign, 'a student in the LE of LEKTOR2');

			givenKontrolle(ctx);
			givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ'), von: '10:00', bis: '11:00' });

			const editableOf = (student, le) =>
				kontrolleApi
					.getAllAnwesenheitenByStudentByLva(student.prestudentId, ctx.lvId, ctx.semKurzbz, account(role))
					.fhcData()
					.then(rows => rows.filter(row => row.lehreinheit_id === le).map(row => row.editable));

			editableOf(own, ctx.le).should('deep.equal', [inOwnLe]);
			editableOf(foreign, ctx.foreignLe).should('deep.equal', [inForeignLe]);
		});
	});

	it('getAnwQuoteForPrestudentIds → one row per id with the quota of the counted minutes', () => {
		const [student, other] = ctx.students;
		requireFixture(other, 'two students in the test LE');
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			const entry = entries.find(e => e.prestudent_id === student.prestudentId);
			givenStatus(ctx, [{ anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.fehlminuten_status, fehlminuten: 20 }]);
			const fehlminuten = expectedQuota(ctx.config, [
				{ dauer: kontrolle.dauer, status: ctx.config.fehlminuten_status, fehlminuten: 20 },
			]);

			kontrolleApi
				.getAnwQuoteForPrestudentIds([student.prestudentId, other.prestudentId], ctx.lvId, ctx.semKurzbz, lektor())
				.fhcData()
				.then(rows => {
					const quota = Object.fromEntries(rows.map(row => [row.prestudent_id, Number(row.sum)]));
					expect(quota).to.deep.equal({ [student.prestudentId]: fehlminuten, [other.prestudentId]: 100 });
				});
		});
	});

	// a Termin: the consecutive Stunden of a day in the Stundenplan, two blocks on one day are two Termine
	it('getLehreinheitenForLehrveranstaltung → both LEs of the test LV, the Termine of the test LE from the Stundenplan', () => {
		cy.task('anw:db:readTermine', { leId: ctx.le }).then(expected => {
			requireFixture(expected.length, 'Termine of the test LE');

			kontrolleApi
				.getLehreinheitenForLehrveranstaltung(ctx.lvId, ctx.semKurzbz, lektor())
				.fhcData()
				.then(([les, termine]) => {
					expect(les.map(le => le.lehreinheit_id)).to.include.members([ctx.le, ctx.foreignLe]);
					expect(termine[ctx.le].map(({ datum, beginn, ende }) => ({ datum, beginn, ende }))).to.deep.equal(expected);
				});
		});
	});

	it('getLehreinheitenForLehrveranstaltungAndMaUid with the uid of a student → no LE and no Termin', () => {
		kontrolleApi
			.getLehreinheitenForLehrveranstaltungAndMaUid(ctx.lvId, ctx.student.uid, ctx.semKurzbz, lektor())
			.fhcData()
			.should('deep.equal', [[], []]);
	});

	// every parameter as the text 'null' (a null of the frontend) and as an empty text
	[
		['getLehreinheitenForLehrveranstaltung', value => kontrolleApi.getLehreinheitenForLehrveranstaltung(value, value, lektor())],
		[
			'getLehreinheitenForLehrveranstaltungAndMaUid',
			value => kontrolleApi.getLehreinheitenForLehrveranstaltungAndMaUid(value, value, value, lektor()),
		],
	].forEach(([name, call]) => {
		it(`${name} with 'null' → missingParameters, with '' → wrongParameters`, () => {
			call('null').then(res => expectPhraseError(res, 'global/missingParameters', lektor()));
			call('').then(res => expectPhraseError(res, 'global/wrongParameters', lektor()));
		});
	});
});
