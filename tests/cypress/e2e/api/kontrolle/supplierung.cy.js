// KontrolleApi: the substitute. SUPPL_LEKTOR (anw_supplierung) teaches the LE of LEKTOR2 in the test LV, not the LE
// of LEKTOR. Without LEGACY_LE_SELECTION it may operate every LE of the LV. LEKTOR2 without the right: kontrolle/access.cy.js

import { account } from '../../../support/accounts';
import { infoApi, kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { dateParam, timeParam } from '../../../support/anwDates';
import { countKontrollen, entryById, givenKontrolle } from '../../../support/anwScenario';

describe('KontrolleApi: the substitute of a colleague', () => {
	const ctx = useAnwContext();
	let permissions;

	before(() => {
		infoApi
			.getViewPermissions(account('SUPPL_LEKTOR'))
			.fhcData()
			.then(loaded => {
				permissions = loaded;
			});
	});

	const as = () => account('SUPPL_LEKTOR');

	it('getViewPermissions → lektor and supplierung', () => {
		expect(permissions).to.include({ lektor: true, supplierung: true });
	});

	it('a Kontrolle in the LE of LEKTOR → created with the students of that LE', function () {
		skipIf(this, permissions.legacy_le_selection, 'LEGACY_LE_SELECTION limits a lektor to the own LEs');

		givenKontrolle(ctx, { as: as() }).then(({ entries }) => {
			expect(entries.map(e => e.prestudent_id)).to.have.members(ctx.students.map(s => s.prestudentId));
		});
	});

	it('a status in a Kontrolle of LEKTOR → saved', function () {
		skipIf(this, permissions.legacy_le_selection, 'LEGACY_LE_SELECTION limits a lektor to the own LEs');

		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			kontrolleApi
				.updateAnwesenheiten(ctx.le, [{ anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.abwesend_status }], as())
				.fhcData();
			entryById(kontrolle, entry.anwesenheit_user_id).its('status').should('eq', ctx.config.abwesend_status);
		});
	});

	it('getAllAnwesenheitenByStudentByLva → editable in the LE of LEKTOR', function () {
		skipIf(this, permissions.legacy_le_selection, 'LEGACY_LE_SELECTION limits a lektor to the own LEs');
		const student = ctx.students[0];

		givenKontrolle(ctx);
		kontrolleApi
			.getAllAnwesenheitenByStudentByLva(student.prestudentId, ctx.lvId, ctx.semKurzbz, as())
			.fhcData()
			.then(rows => {
				const own = rows.filter(row => row.lehreinheit_id === ctx.le);
				expect(own, 'the entry of the Kontrolle').to.have.length(1);
				expect(own[0].editable).to.eq(true);
			});
	});

	it('an LE of an LV that SUPPL_LEKTOR does not teach → notAuthorizedForLe, nothing stored', () => {
		kontrolleApi
			.insertAnwWithoutQR(ctx.otherLe, dateParam(ctx.today), timeParam('08:00'), timeParam('09:30'), as())
			.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', as()));
		countKontrollen(ctx).should('eq', 0);
	});
});
