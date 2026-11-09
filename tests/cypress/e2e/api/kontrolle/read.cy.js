// KontrolleApi: the reads of the lektor table, of the student detail and the parameter checks

import { account } from '../../../support/accounts';
import { callEndpoint, KONTROLLE_ENDPOINTS, kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { expectedQuota, givenKontrolle, givenStatus } from '../../../support/anwScenario';

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

	it('getAllAnwesenheitenByStudentByLva → editable in the own LE, read only in the LE of LEKTOR2', () => {
		const shared = ctx.foreignStudents.find(f => ctx.students.some(s => s.prestudentId === f.prestudentId));
		const own = shared || ctx.students[0];
		const foreign = shared || ctx.foreignStudents[0];
		requireFixture(foreign, 'a student in the LE of LEKTOR2');

		givenKontrolle(ctx);
		givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ'), von: '10:00', bis: '11:00' });

		const editableOf = (student, le) =>
			kontrolleApi
				.getAllAnwesenheitenByStudentByLva(student.prestudentId, ctx.lvId, ctx.semKurzbz, lektor())
				.fhcData()
				.then(rows => rows.filter(row => row.lehreinheit_id === le).map(row => row.editable));

		editableOf(own, ctx.le).should('deep.equal', [true]);
		editableOf(foreign, ctx.foreignLe).should('deep.equal', [false]);
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

	it('getLehreinheitenForLehrveranstaltung → both LEs of the test LV with their Termine', () => {
		kontrolleApi
			.getLehreinheitenForLehrveranstaltung(ctx.lvId, ctx.semKurzbz, lektor())
			.fhcData()
			.then(([les, termine]) => {
				expect(les.map(le => le.lehreinheit_id)).to.include.members([ctx.le, ctx.foreignLe]);
				expect(Object.keys(termine).map(Number)).to.include(ctx.le);
			});
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

	it('every POST endpoint without its parameters → missingParameters', () => {
		KONTROLLE_ENDPOINTS.filter(e => e.method === 'POST').forEach(endpoint => {
			callEndpoint(endpoint, {}, lektor()).then(res => expectPhraseError(res, 'global/missingParameters', lektor()));
		});
	});
});
