// ProfilApi: the timeline tab (getTimeline)

import { account } from '../../../support/accounts';
import { infoApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { entryOf, givenEntschuldigung, givenKontrolle, givenStatus, NOTIZ } from '../../../support/anwScenario';

// the fields of an entry that a student gets: no note of the lektor
const STUDENT_FIELDS = [
	'anwesenheit_id',
	'anwesenheit_user_id',
	'lehreinheit_id',
	'von',
	'bis',
	'status',
	'fehlminuten',
	'le_bezeichnung',
	'lehrform_kurzbz',
];

describe('ProfilApi: the timeline', () => {
	const ctx = useAnwContext();
	let timelineAllowed;

	before(() => {
		infoApi
			.getViewPermissions(account(ctx.student.role))
			.fhcData()
			.then(permissions => {
				timelineAllowed = permissions.timeline;
			});
	});

	const as = () => account(ctx.student.role);

	const givenNote = () =>
		givenKontrolle(ctx).then(state => {
			givenStatus(ctx, [
				{ anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id, status: ctx.config.anwesend_status, notiz: NOTIZ },
			]);
		});

	it('own timeline → the entry and the Entschuldigung with the student fields only, no note of the lektor', function () {
		skipIf(this, !timelineAllowed, 'TIMELINE_BERECHTIGUNGEN has no permission of the student');
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		givenNote();
		givenEntschuldigung(ctx.student, { von: `${ctx.today} 13:00:00`, bis: `${ctx.today} 14:00:00` });

		profilApi
			.getTimeline(null, as())
			.fhcData()
			.then(([anw, ent]) => {
				const rows = anw.filter(row => row.lehreinheit_id === ctx.le);
				expect(rows).to.have.length(1);
				expect(Object.keys(rows[0])).to.have.members(STUDENT_FIELDS);

				expect(ent).to.have.length(1);
				expect(Object.keys(ent[0])).to.have.members(['entschuldigung_id', 'von', 'bis', 'akzeptiert', 'notiz']);
			});
	});

	it('person_id "abc" → wrongParameters', function () {
		skipIf(this, !timelineAllowed, 'TIMELINE_BERECHTIGUNGEN has no permission of the student');

		profilApi.getTimeline('abc', as()).then(res => expectPhraseError(res, 'global/wrongParameters', as()));
	});

	['FULL_ASSISTENZ', 'ENT_ASSISTENZ'].forEach(role => {
		it(`${role} with the person_id of a student of its Studiengaenge → all fields with the note of the lektor`, function () {
			skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
			givenNote();

			profilApi
				.getTimeline(ctx.student.personId, account(role))
				.fhcData()
				.then(([anw]) => {
					const row = anw.find(r => r.lehreinheit_id === ctx.le);
					expect(row).to.include({ notiz: NOTIZ, prestudent_id: ctx.student.prestudentId });
				});
		});
	});
});
