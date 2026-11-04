// ProfilApi: the student reads the own data, entries and quotas

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { loadAnwContext, studentInLe } from '../../../support/anwContext';
import {
	entryOf,
	givenKontrolle,
	givenStatus,
	resetEntschuldigungen,
	resetKontrollen,
} from '../../../support/anwScenario';

describe('ProfilApi: the own data of a student', () => {
	let ctx;
	let student;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			student = studentInLe(ctx);
			expect(student, 'a test student in the test LE').to.exist;
			resetEntschuldigungen(ctx);
		});
	});

	beforeEach(() => resetKontrollen(ctx));

	const as = () => account(student.role);

	// a Kontrolle in the test LE with the status of the student. Yields { dauer, status, fehlminuten }:
	// dauer is the counted duration, without the breaks of the Stunden raster
	const givenAttendance = ({ von, bis, status, fehlminuten = 0 }) =>
		givenKontrolle(ctx, { von, bis }).then(state =>
			givenStatus(ctx, [{ anwesenheit_user_id: entryOf(state, student).anwesenheit_user_id, status, fehlminuten }]).then(
				() => ({ dauer: state.kontrolle.dauer, status, fehlminuten }),
			),
		);

	// the rule of extension.get_anwesenheiten_by_time: entschuldigt counts like anwesend, Fehlminuten are deducted
	const expectedQuota = attendances => {
		const present = ({ dauer, status, fehlminuten }) => {
			if ([ctx.config.anwesend_status, ctx.config.entschuldigt_status].includes(status)) return dauer;
			if (status === ctx.config.fehlminuten_status) return Math.max(dauer - fehlminuten, 0);
			return 0;
		};
		const total = attendances.reduce((sum, a) => sum + a.dauer, 0);
		return Math.round((attendances.reduce((sum, a) => sum + present(a), 0) * 10000) / total) / 100;
	};

	const givenTwo = (first, second) =>
		givenAttendance({ von: '08:00', bis: '09:30', ...first }).then(a =>
			givenAttendance({ von: '10:00', bis: '11:30', ...second }).then(b => [a, b]),
		);

	const quota = () =>
		profilApi
			.getAnwesenheitSumByLva(ctx.lvId, ctx.semKurzbz, student.prestudentId, as())
			.fhcData()
			.then(([row]) => Number(row.sum));

	it('getProfileViewData without uid → the own uid and person_id', () => {
		profilApi
			.getProfileViewData(null, as())
			.fhcData()
			.then(rows => {
				expect(rows.map(row => row.student_uid.toLowerCase())).to.include(student.uid);
				expect(rows.map(row => row.person_id)).to.include(student.personId);
			});
	});

	it('getAllAnwByUID for the semester of the LV → the entry with its status and counted duration', () => {
		givenAttendance({ von: '08:00', bis: '09:30', status: ctx.config.abwesend_status }).then(({ dauer }) => {
			profilApi
				.getAllAnwByUID(ctx.semKurzbz, as().username, student.personId, as())
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
			.getAllAnwByUID('XX1900', as().username, student.personId, as())
			.then(res => expectPhraseError(res, 'global/wrongParameters', as()));
	});

	it('no entry in the LV → quota 100', () => {
		quota().should('eq', 100);
	});

	it('one Kontrolle anwesend and one abwesend → the quota of the counted minutes', () => {
		givenTwo({ status: ctx.config.anwesend_status }, { status: ctx.config.abwesend_status }).then(attendances => {
			quota().should('eq', expectedQuota(attendances));
		});
	});

	it('30 Fehlminuten in one Kontrolle and one anwesend → the Fehlminuten are deducted', () => {
		givenTwo(
			{ status: ctx.config.fehlminuten_status, fehlminuten: 30 },
			{ status: ctx.config.anwesend_status },
		).then(attendances => {
			quota().should('eq', expectedQuota(attendances));
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
					expect(Number(lv.anwesenheit)).to.eq(expectedQuota(attendances));
				});
		});
	});

	it('getAllAnwesenheitenByStudentByLva → the entries of the LV with status, Fehlminuten and counted duration', () => {
		givenTwo(
			{ status: ctx.config.fehlminuten_status, fehlminuten: 30 },
			{ status: ctx.config.anwesend_status },
		).then(attendances => {
			profilApi
				.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, ctx.lvId, student.prestudentId, as().username, as())
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
