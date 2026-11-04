// AdministrationApi: the Entschuldigungen of the Studiengaenge (getEntschuldigungen, getOffeneTimespan)

import { account } from '../../../support/accounts';
import { administrationApi } from '../../../support/anwApi';
import { expectPhraseText, skipIf } from '../../../support/anwChecks';
import { loadAnwContext, loadAssistenzScope } from '../../../support/anwContext';
import { addDays } from '../../../support/anwDates';
import { decide, givenEntschuldigung, resetEntschuldigungen, seedEntschuldigung } from '../../../support/anwScenario';

describe('AdministrationApi: the Entschuldigungen of the Studiengaenge', () => {
	let ctx;
	let scope;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			loadAssistenzScope(ctx).then(loadedScope => {
				scope = loadedScope;
			});
		});
	});

	beforeEach(function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		resetEntschuldigungen(ctx);
	});

	const student = () => ctx.testStudents.STUDENT;
	const range = () => ({ von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00` });

	// the date range of the table filters by the day of the request (insertamum), not by von - bis
	const list = (stgs, { von = ctx.today, bis = ctx.today, nurOffene = false, as = account('ENT_ASSISTENZ') } = {}) =>
		administrationApi.getEntschuldigungen(stgs, von, bis, nurOffene, as);

	const offene = (stgs, { von = ctx.today, bis = ctx.today } = {}) =>
		administrationApi.getOffeneTimespan(stgs, von, bis, account('ENT_ASSISTENZ')).fhcData();

	const idsOf = rows => (rows || []).map(row => row.entschuldigung_id);

	it('the Studiengang of the student and the day of the request → the Entschuldigung with student_uid and accounts', () => {
		givenEntschuldigung(student(), range())
			.its('entschuldigung')
			.then(entschuldigung => {
				list([student().studiengangKz])
					.fhcData()
					.then(rows => {
						const row = rows.find(r => r.entschuldigung_id === entschuldigung.entschuldigung_id);
						expect(row, 'the Entschuldigung in the list').to.exist;
						expect(row.student_uid).to.include(student().uid);
						expect(row.accounts.map(a => a.uid)).to.include(student().uid);
					});
			});
	});

	it('a date range before the day of the request → not in the list', () => {
		givenEntschuldigung(student(), range())
			.its('entschuldigung')
			.then(entschuldigung => {
				const yesterday = addDays(ctx.today, -1);
				list([student().studiengangKz], { von: yesterday, bis: yesterday })
					.fhcData()
					.then(rows => expect(idsOf(rows)).to.not.include(entschuldigung.entschuldigung_id));
			});
	});

	it('nurOffene → the open Entschuldigung, not the accepted one', () => {
		givenEntschuldigung(student(), range())
			.its('entschuldigung')
			.then(open => {
				givenEntschuldigung(student(), { von: `${ctx.today} 13:00:00`, bis: `${ctx.today} 14:00:00` })
					.its('entschuldigung')
					.then(accepted => {
						decide(accepted.entschuldigung_id, true);
						list([student().studiengangKz], { nurOffene: true })
							.fhcData()
							.then(rows => {
								expect(idsOf(rows)).to.include(open.entschuldigung_id);
								expect(idsOf(rows)).to.not.include(accepted.entschuldigung_id);
							});
					});
			});
	});

	it('an empty stg_kz_arr → errorNoSTGassigned', () => {
		list([]).then(res => expectPhraseText(res, 'global/errorNoSTGassigned', account('ENT_ASSISTENZ')));
	});

	it('getOffeneTimespan, a new open one outside the date range → anzahl + 1, bis is the day of the request', () => {
		const yesterday = addDays(ctx.today, -1);
		offene([student().studiengangKz], { von: yesterday, bis: yesterday }).then(before => {
			givenEntschuldigung(student(), range());
			offene([student().studiengangKz], { von: yesterday, bis: yesterday }).then(after => {
				expect(after.anzahl).to.eq(before.anzahl + 1);
				expect(after.bis).to.eq(ctx.today);
			});
		});
	});

	it('getOffeneTimespan, a new open one inside the date range → anzahl stays', () => {
		offene([student().studiengangKz]).then(before => {
			givenEntschuldigung(student(), range());
			offene([student().studiengangKz]).its('anzahl').should('eq', before.anzahl);
		});
	});

	it('a Studiengang outside the rights of ENT_ASSISTENZ → no Entschuldigung of it', function () {
		skipIf(this, !scope.outsider, 'ENT_ASSISTENZ has a right on every Studiengang');

		seedEntschuldigung(ctx, scope.outsider, range())
			.its('entschuldigung')
			.then(entschuldigung => {
				list([scope.outsider.studiengangKz]).then(res => {
					const rows = res.body?.data;
					expect(idsOf(Array.isArray(rows) ? rows : [])).to.not.include(entschuldigung.entschuldigung_id);
				});
			});
	});

	it('getOffeneTimespan for a Studiengang outside the rights of ENT_ASSISTENZ → no count', function () {
		skipIf(this, !scope.outsider, 'ENT_ASSISTENZ has a right on every Studiengang');

		seedEntschuldigung(ctx, scope.outsider, range());
		const yesterday = addDays(ctx.today, -1);
		administrationApi
			.getOffeneTimespan([scope.outsider.studiengangKz], yesterday, yesterday, account('ENT_ASSISTENZ'))
			.then(res => expect(res.body?.data?.anzahl ?? 0).to.eq(0));
	});
});
