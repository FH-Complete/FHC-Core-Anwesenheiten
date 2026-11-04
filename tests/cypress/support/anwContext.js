// ctx of a spec: the test LV from the database, the rule values and the day of the server from getViewPermissions,
// the Termine of the test LE. Call it in before().

import { account } from './accounts';
import { infoApi, kontrolleApi } from './anwApi';

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
		);
};
