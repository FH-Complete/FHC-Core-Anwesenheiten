// ctx of a spec: the test LV from the database, the rule values and the day of the server from getViewPermissions,
// the Termine of the test LE. A spec gets it from useAnwContext.

import { account } from './accounts';
import { infoApi, kontrolleApi } from './anwApi';
import { requireFixture, skipIf } from './anwChecks';
import { resetEntschuldigungen, resetKontrollen } from './anwScenario';

/**
 * The setup of a spec: returns ctx, an object that before() fills with loadAnwContext. ctx.student is the test
 * student in the test LE, ctx.otherLv/otherLe an LV of LEKTOR without LEKTOR2. Options:
 * - resets: what beforeEach deletes, 'kontrollen' and 'entschuldigungen' (default both), [] for a spec that only reads
 * - entschuldigungen: true skips every test of the spec when ENTSCHULDIGUNGEN_ENABLED is off
 * - pdf: true loads the PDF fixture into ctx.pdf
 * A before() of the spec after this call sees the filled ctx.
 */
export const useAnwContext = ({ resets = ['kontrollen', 'entschuldigungen'], entschuldigungen = false, pdf = false } = {}) => {
	const ctx = {};

	before(() => {
		loadAnwContext().then(loaded => Object.assign(ctx, loaded));
		if (pdf) {
			cy.fixture('entschuldigung.pdf', 'utf8').then(content => {
				ctx.pdf = content;
			});
		}
	});

	beforeEach(function () {
		if (entschuldigungen) skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		if (resets.includes('kontrollen')) resetKontrollen(ctx);
		if (resets.includes('entschuldigungen')) resetEntschuldigungen(ctx);
	});

	return ctx;
};

/**
 * The Studiengaenge of a staff role, like the server counts them: anw_r_ent_assistenz and anw_r_full_assistenz
 * (getViewPermissions). Also a student of ctx.stgStudents in a Studiengang outside of them, undefined if the role
 * has every Studiengang. Yields { entitled, outsider }
 */
export const loadAssistenzScope = (ctx, role = 'ENT_ASSISTENZ') =>
	infoApi
		.getViewPermissions(account(role))
		.fhcData()
		.then(permissions => {
			const entitled = [
				...Object.values(permissions.studiengaengeAssistenz || {}),
				...Object.values(permissions.studiengaengeAdmin || {}),
			].map(Number);
			return { entitled, outsider: ctx.stgStudents.find(s => !entitled.includes(Number(s.studiengangKz))) };
		});

/**
 * An LV with an LE of LEKTOR where FULL_ASSISTENZ is not the admin: { lvId, semKurzbz, le }, undefined without one.
 * PermissionLib maps the rights through the OE tree, so the API decides: the first LV of ctx.lektorLvs that it refuses
 */
export const loadAdminForeignLv = ctx => {
	const search = ([lv, ...rest]) => {
		if (!lv) return cy.wrap(undefined, { log: false });
		return kontrolleApi
			.getLehreinheitenForLehrveranstaltung(lv.lvId, lv.semKurzbz, account('FULL_ASSISTENZ'))
			.then(res => (res.status === 200 ? search(rest) : lv));
	};
	return search(ctx.lektorLvs);
};

/** The test student in the test LE, and one outside of it */
export const studentInLe = ctx => Object.values(ctx.testStudents).find(student => student.inLe);
export const studentOutsideLe = ctx => Object.values(ctx.testStudents).find(student => !student.inLe);

export const loadAnwContext = () => {
	const lektor = account('LEKTOR');

	return cy
		.task('anw:db:context', {
			lektor: lektor.username,
			kollege: account('LEKTOR2').username,
			students: [account('STUDENT').username, account('STUDENT2').username],
		})
		.then(fixture => {
			expect(fixture, 'test LV: an LE of LEKTOR with students and an LE of LEKTOR2 in the same LV, see checks.js').to.exist;

			// testStudents.STUDENT / .STUDENT2: { role, uid, personId, prestudentId, inLe }
			const testStudents = {};
			['STUDENT', 'STUDENT2'].forEach(role => {
				const found = fixture.testStudents.find(s => s.uid === account(role).username.toLowerCase());
				expect(found, `student account of ANW_${role}_USER`).to.exist;
				testStudents[role] = { role, ...found };
			});

			return infoApi
				.getViewPermissions(lektor)
				.fhcData()
				.then(config => ({ ...fixture, testStudents, config, today: config.today }));
		})
		.then(ctx =>
			kontrolleApi
				.getLehreinheitenForLehrveranstaltungAndMaUid(ctx.lvId, lektor.username, ctx.semKurzbz, lektor)
				.fhcData()
				.then(([, termine]) => ({ ...ctx, termine: ((termine || {})[ctx.le] || []).map(termin => termin.datum) })),
		)
		.then(ctx => {
			// the preconditions of most specs, checked once here and in checks.js
			const student = studentInLe(ctx);
			requireFixture(student, 'a test student in the test LE');
			requireFixture(ctx.otherLv, 'an LV of LEKTOR without LEKTOR2');
			return { ...ctx, student };
		});
};
