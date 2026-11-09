// ProfilApi: the timeline tab (getTimeline)

import { account } from '../../../support/accounts';
import { infoApi, profilApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { entryOf, givenKontrolle, givenStatus, NOTIZ } from '../../../support/anwScenario';

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

	it('own timeline → the entry with the student fields only, without the note of the lektor', function () {
		skipIf(this, !timelineAllowed, 'TIMELINE_BERECHTIGUNGEN has no permission of the student');
		givenNote();

		profilApi
			.getTimeline(null, as())
			.fhcData()
			.then(([anw]) => {
				const rows = anw.filter(row => row.lehreinheit_id === ctx.le);
				expect(rows).to.have.length(1);
				expect(Object.keys(rows[0])).to.have.members(STUDENT_FIELDS);
			});
	});

	it('person_id "abc" → wrongParameters', function () {
		skipIf(this, !timelineAllowed, 'TIMELINE_BERECHTIGUNGEN has no permission of the student');

		profilApi.getTimeline('abc', as()).then(res => expectPhraseError(res, 'global/wrongParameters', as()));
	});

	it('FULL_ASSISTENZ with the person_id of the student → all fields with the note of the lektor', () => {
		givenNote();

		profilApi
			.getTimeline(ctx.student.personId, account('FULL_ASSISTENZ'))
			.fhcData()
			.then(([anw]) => {
				const row = anw.find(r => r.lehreinheit_id === ctx.le);
				expect(row).to.include({ notiz: NOTIZ, prestudent_id: ctx.student.prestudentId });
			});
	});
});
