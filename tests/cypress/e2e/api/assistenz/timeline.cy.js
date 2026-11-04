// AdministrationApi: the timeline of a student for the assistenz (getTimeline)

import { account } from '../../../support/accounts';
import { administrationApi } from '../../../support/anwApi';
import { skipIf } from '../../../support/anwChecks';
import { loadAnwContext, studentInLe } from '../../../support/anwContext';
import {
	entryOf,
	givenEntschuldigung,
	givenKontrolle,
	givenStatus,
	resetEntschuldigungen,
	resetKontrollen,
} from '../../../support/anwScenario';

const NOTIZ = 'Notiz der Lehrperson';

describe('AdministrationApi: the timeline of a student', () => {
	let ctx;
	let student;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			student = studentInLe(ctx);
			expect(student, 'a test student in the test LE').to.exist;
		});
	});

	beforeEach(function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		resetKontrollen(ctx);
		resetEntschuldigungen(ctx);
	});

	it('ENT_ASSISTENZ → the entries with the note of the lektor and the Entschuldigungen of the student', () => {
		givenKontrolle(ctx).then(state => {
			givenStatus(ctx, [
				{ anwesenheit_user_id: entryOf(state, student).anwesenheit_user_id, status: ctx.config.anwesend_status, notiz: NOTIZ },
			]);
			givenEntschuldigung(student, { von: `${ctx.today} 13:00:00`, bis: `${ctx.today} 14:00:00` })
				.its('entschuldigung')
				.then(entschuldigung => {
					administrationApi
						.getTimeline(student.personId, account('ENT_ASSISTENZ'))
						.fhcData()
						.then(([anw, ent]) => {
							const entry = anw.retval.find(row => row.anwesenheit_id === state.kontrolle.anwesenheit_id);
							expect(entry).to.include({ notiz: NOTIZ, prestudent_id: student.prestudentId });
							expect(ent.retval.map(row => row.entschuldigung_id)).to.include(entschuldigung.entschuldigung_id);
						});
				});
		});
	});

	it('LEKTOR → 403', () => {
		administrationApi.getTimeline(student.personId, account('LEKTOR')).fhcErrors(403);
	});
});
