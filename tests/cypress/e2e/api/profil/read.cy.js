// ProfilApi: the student reads the own data, entries and quotas

import { account } from '../../../support/accounts';
import { kontrolleApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, requireFixture, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { entryOf, expectedQuota, givenEntschuldigung, givenKontrolle, givenStatus } from '../../../support/anwScenario';

describe('ProfilApi: the own data of a student', () => {
	const ctx = useAnwContext();

	const as = () => account(ctx.student.role);

	// a Kontrolle in the test LE with the status of the student. Yields { dauer, status, fehlminuten }: dauer is the
	// counted duration, without the breaks of the Stunden raster. Only the admin sets entschuldigt by hand
	const givenAttendance = ({ von, bis, status, fehlminuten = 0 }) =>
		givenKontrolle(ctx, { von, bis }).then(state =>
			givenStatus(ctx, [{ anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id, status, fehlminuten }], {
				as: status === ctx.config.entschuldigt_status ? account('FULL_ASSISTENZ') : undefined,
			}).then(() => ({ dauer: state.kontrolle.dauer, status, fehlminuten })),
		);

	const givenTwo = (first, second) =>
		givenAttendance({ von: '08:00', bis: '09:30', ...first }).then(a =>
			givenAttendance({ von: '10:00', bis: '11:30', ...second }).then(b => [a, b]),
		);

	const quota = () =>
		profilApi
			.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, ctx.student.prestudentId, as())
			.fhcData()
			.then(([row]) => Number(row.sum));

	it('getProfileViewData without uid → the own uid and person_id', () => {
		profilApi
			.getProfileViewData(null, as())
			.fhcData()
			.then(rows => {
				expect(rows.map(row => row.student_uid.toLowerCase())).to.include(ctx.student.uid);
				expect(rows.map(row => row.person_id)).to.include(ctx.student.personId);
			});
	});

	it('getAllAnwByUID for the semester of the LV → the entry with its status and counted duration', () => {
		givenAttendance({ von: '08:00', bis: '09:30', status: ctx.config.abwesend_status }).then(({ dauer }) => {
			profilApi
				.getAllAnwByUID(ctx.semKurzbz, as().username, ctx.student.personId, as())
				.fhcData()
				.then(([anw]) => {
					const rows = anw.retval.filter(row => row.lehrveranstaltung_id === ctx.lvId && row.datum === ctx.today);
					expect(rows).to.have.length(1);
					expect(rows[0]).to.include({ student_status: ctx.config.abwesend_status, dauer });
				});
		});
	});

	it('getAllAnwByUID with an unknown semester → wrongParameters', () => {
		profilApi
			.getAllAnwByUID('XX1900', as().username, ctx.student.personId, as())
			.then(res => expectPhraseError(res, 'global/wrongParameters', as()));
	});

	// the frontend (axios) leaves a null parameter out of the query
	it('getAllAnwByUID without studiensemester → the entries, and the Entschuldigungen if they are on', () => {
		profilApi
			.getAllAnwByUID(undefined, as().username, ctx.student.personId, as())
			.fhcData()
			.then(data => {
				expect(data).to.have.length(ctx.config.entschuldigungen_enabled ? 2 : 1);
				data.forEach(part => expect(part).to.have.property('retval'));
			});
	});

	it('getAllAnwByUID with an empty studiensemester → wrongParameters', () => {
		profilApi
			.getAllAnwByUID('', as().username, ctx.student.personId, as())
			.then(res => expectPhraseError(res, 'global/wrongParameters', as()));
	});

	it('getEntschuldigungenByPersonID with the own person_id → the Entschuldigung of the student', function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');

		givenEntschuldigung(ctx.student, { von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00` })
			.its('entschuldigung.entschuldigung_id')
			.then(id => {
				profilApi
					.getEntschuldigungenByPersonID(ctx.student.personId, as())
					.fhcData()
					.then(rows => expect(rows.map(row => row.entschuldigung_id)).to.deep.equal([id]));
			});
	});

	it('getEntschuldigungenByPersonID without person_id → missingParameters', function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');

		profilApi
			.getEntschuldigungenByPersonID(undefined, as())
			.then(res => expectPhraseError(res, 'global/missingParameters', as()));
	});

	it('no entry in the LV → quota 100', () => {
		quota().should('eq', 100);
	});

	// the quota divides by the counted minutes: 0 minutes made every quota read of the LE fail
	it('only a Kontrolle outside the Stunden raster (0 counted minutes) → quota 100, the lektor table loads', () => {
		cy.task('anw:db:zeroMinuteSlot', { date: ctx.today }).then(slot => {
			requireFixture(slot, 'a time before the Stunden raster (the raster starts at 01:00 or later)');

			givenAttendance({ ...slot, status: ctx.config.abwesend_status }).its('dauer').should('eq', 0);
			quota().should('eq', 100);
			kontrolleApi
				.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.le, account('LEKTOR').username, account('LEKTOR'))
				.fhcData()
				.its('students')
				.should('have.length.greaterThan', 0);
		});
	});

	it('one Kontrolle anwesend and one abwesend → the quota of the counted minutes', () => {
		givenTwo({ status: ctx.config.anwesend_status }, { status: ctx.config.abwesend_status }).then(attendances => {
			quota().should('eq', expectedQuota(ctx.config, attendances));
		});
	});

	it('30 Fehlminuten in one Kontrolle and one anwesend → the Fehlminuten are deducted', () => {
		givenTwo(
			{ status: ctx.config.fehlminuten_status, fehlminuten: 30 },
			{ status: ctx.config.anwesend_status },
		).then(attendances => {
			quota().should('eq', expectedQuota(ctx.config, attendances));
		});
	});

	it('entschuldigt counts like anwesend → quota 100', () => {
		givenTwo({ status: ctx.config.entschuldigt_status }, { status: ctx.config.anwesend_status });
		quota().should('eq', 100);
	});

	it('getAllAnwQuotasForLvaByUID → the LV with the same quota', () => {
		givenTwo({ status: ctx.config.anwesend_status }, { status: ctx.config.abwesend_status }).then(attendances => {
			profilApi
				.getAllAnwQuotasForLvaByUID(ctx.semKurzbz, as().username, as())
				.fhcData()
				.then(rows => {
					const lv = rows.find(row => row.lehrveranstaltung_id === ctx.lvId);
					expect(Number(lv.anwesenheit)).to.eq(expectedQuota(ctx.config, attendances));
				});
		});
	});

	it('getAllAnwesenheitenByStudentByLva → the entries of the LV with status, Fehlminuten and counted duration', () => {
		givenTwo(
			{ status: ctx.config.fehlminuten_status, fehlminuten: 30 },
			{ status: ctx.config.anwesend_status },
		).then(attendances => {
			profilApi
				.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, ctx.lvId, ctx.student.prestudentId, as().username, as())
				.fhcData()
				.then(rows => {
					const today = rows.filter(row => row.datum === ctx.today);
					expect(today.map(row => [row.status, row.fehlminuten, row.dauer])).to.have.deep.members(
						attendances.map(a => [a.status, a.fehlminuten, a.dauer]),
					);
				});
		});
	});
});
