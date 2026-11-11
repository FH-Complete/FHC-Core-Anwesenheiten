// AdministrationApi: the timeline of a student for the assistenz (getTimeline)

import { account } from '../../../support/accounts';
import { administrationApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { entryOf, givenEntschuldigung, givenKontrolle, givenStatus, NOTIZ } from '../../../support/anwScenario';

describe('AdministrationApi: the timeline of a student', () => {
	const ctx = useAnwContext({ entschuldigungen: true });

	it('ENT_ASSISTENZ → the entries with the note of the lektor and the Entschuldigungen of the student', () => {
		givenKontrolle(ctx).then(state => {
			givenStatus(ctx, [
				{ anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id, status: ctx.config.anwesend_status, notiz: NOTIZ },
			]);
			givenEntschuldigung(ctx.student, { von: `${ctx.today} 13:00:00`, bis: `${ctx.today} 14:00:00` })
				.its('entschuldigung')
				.then(entschuldigung => {
					administrationApi
						.getTimeline(ctx.student.personId, account('ENT_ASSISTENZ'))
						.fhcData()
						.then(([anw, ent]) => {
							const entry = anw.retval.find(row => row.anwesenheit_id === state.kontrolle.anwesenheit_id);
							expect(entry).to.include({ notiz: NOTIZ, prestudent_id: ctx.student.prestudentId });
							expect(ent.retval.map(row => row.entschuldigung_id)).to.include(entschuldigung.entschuldigung_id);
						});
				});
		});
	});

	it('FULL_ASSISTENZ → the entries and the Entschuldigungen of the student', () => {
		givenKontrolle(ctx).then(state => {
			givenEntschuldigung(ctx.student, { von: `${ctx.today} 13:00:00`, bis: `${ctx.today} 14:00:00` })
				.its('entschuldigung')
				.then(entschuldigung => {
					administrationApi
						.getTimeline(ctx.student.personId, account('FULL_ASSISTENZ'))
						.fhcData()
						.then(([anw, ent]) => {
							expect(anw.retval.map(row => row.anwesenheit_id)).to.include(state.kontrolle.anwesenheit_id);
							expect(ent.retval.map(row => row.entschuldigung_id)).to.include(entschuldigung.entschuldigung_id);
						});
				});
		});
	});

	[
		['person_id null', null],
		['a person_id that no person has', UNKNOWN_ID],
	].forEach(([label, personId]) => {
		it(`${label} → noAuthorization`, () => {
			administrationApi
				.getTimeline(personId, account('ENT_ASSISTENZ'))
				.then(res => expectPhraseError(res, 'global/noAuthorization', account('ENT_ASSISTENZ')));
		});
	});

	it('LEKTOR → 403', () => {
		administrationApi.getTimeline(ctx.student.personId, account('LEKTOR')).fhcErrors(403);
	});
});
