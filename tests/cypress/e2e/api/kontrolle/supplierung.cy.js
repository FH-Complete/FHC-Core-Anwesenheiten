// KontrolleApi: the substitute. SUPPL_LEKTOR (anw_supplierung) teaches the LE of LEKTOR2 in the test LV, not the LE
// of LEKTOR. Without LEGACY_LE_SELECTION it may operate every LE of the LV. LEKTOR2 teaches the same LE without the
// right: the LE of LEKTOR stays read only for it.

import { account } from '../../../support/accounts';
import { infoApi, kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText, requireFixture, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, dateParam, timeParam } from '../../../support/anwDates';
import { countKontrollen, givenKontrolle, givenStatus, readKontrolle } from '../../../support/anwScenario';

describe('KontrolleApi: the substitute of a colleague', () => {
	const ctx = useAnwContext();
	const permissions = {};

	before(() => {
		['SUPPL_LEKTOR', 'LEKTOR2'].forEach(role => {
			infoApi
				.getViewPermissions(account(role))
				.fhcData()
				.then(loaded => {
					permissions[role] = loaded;
				});
		});
	});

	const as = () => account('SUPPL_LEKTOR');
	const colleague = () => account('LEKTOR2');
	const today = () => dateParam(ctx.today);

	const skipIfLegacy = test =>
		skipIf(test, ctx.config.legacy_le_selection, 'LEGACY_LE_SELECTION limits a lektor to the own LEs');

	// the stored state of a QR Kontrolle of LEKTOR in the LE of LEKTOR, with its code
	const givenKontrolleOfLektor = () => givenKontrolle(ctx, { qr: true });
	const stored = ({ code, ...state }) => readKontrolle(state.kontrolle.anwesenheit_id).should('deep.equal', state);

	it('getViewPermissions → SUPPL_LEKTOR has lektor and supplierung, LEKTOR2 only lektor', () => {
		expect(permissions.SUPPL_LEKTOR).to.include({ lektor: true, supplierung: true });
		expect(permissions.LEKTOR2).to.include({ lektor: true, supplierung: false });
	});

	it('a Kontrolle in the LE of LEKTOR → created with the students of that LE', function () {
		skipIfLegacy(this);

		givenKontrolle(ctx, { as: as() }).then(({ entries }) => {
			expect(entries.map(e => e.prestudent_id)).to.have.members(ctx.students.map(s => s.prestudentId));
		});
	});

	// only the creator resumes a running Kontrolle
	it('a QR Kontrolle in the LE of LEKTOR → created, getExistingQRCode as LEKTOR → noExistingKontrolleFound', function () {
		skipIfLegacy(this);

		givenKontrolle(ctx, { qr: true, as: as() }).then(({ kontrolle, code }) => {
			kontrolleApi.getExistingQRCode(ctx.le, as()).fhcData().should('include', { code, anwesenheit_id: kontrolle.anwesenheit_id });
			kontrolleApi
				.getExistingQRCode(ctx.le, account('LEKTOR'))
				.then(res => expectPhraseText(res, 'global/noExistingKontrolleFound', account('LEKTOR')));
		});
	});

	it('a QR Kontrolle in the LE of LEKTOR as LEKTOR2 → notAuthorizedForLe, nothing stored', () => {
		kontrolleApi
			.getNewQRCode(ctx.le, today(), timeParam('08:00'), timeParam('09:30'), colleague())
			.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', colleague()));
		countKontrollen(ctx).should('eq', 0);
	});

	// every write on a Kontrolle of LEKTOR. state: the Kontrolle with its entries and its code
	[
		[
			'updateKontrolle',
			(state, caller) =>
				kontrolleApi.updateKontrolle(ctx.le, state.kontrolle.anwesenheit_id, timeParam('10:00'), timeParam('11:00'), caller),
		],
		['regenerateQRCode', (state, caller) => kontrolleApi.regenerateQRCode(state.kontrolle.anwesenheit_id, caller)],
		['degenerateQRCode', (state, caller) => kontrolleApi.degenerateQRCode(state.kontrolle.anwesenheit_id, state.code, caller)],
		['restartKontrolle', (state, caller) => kontrolleApi.restartKontrolle(ctx.le, today(), state.kontrolle.anwesenheit_id, caller)],
		['deleteQRCode', (state, caller) => kontrolleApi.deleteQRCode(state.kontrolle.anwesenheit_id, ctx.lvId, caller)],
		[
			'deleteAnwesenheitskontrolle',
			(state, caller) => kontrolleApi.deleteAnwesenheitskontrolle(ctx.le, today(), state.kontrolle.anwesenheit_id, caller),
		],
		[
			'updateAnwesenheiten',
			(state, caller) =>
				kontrolleApi.updateAnwesenheiten(
					ctx.le,
					[{ anwesenheit_user_id: state.entries[0].anwesenheit_user_id, status: ctx.config.anwesend_status }],
					caller,
				),
		],
	].forEach(([name, call]) => {
		it(`${name} on a Kontrolle of LEKTOR → allowed`, function () {
			skipIfLegacy(this);

			givenKontrolleOfLektor().then(state => call(state, as()).fhcData());
		});

		it(`${name} on a Kontrolle of LEKTOR as LEKTOR2 → notAuthorizedForLe, nothing changed`, () => {
			requireFixture(!permissions.LEKTOR2.supplierung, 'LEKTOR2 without anw_supplierung');

			givenKontrolleOfLektor().then(state => {
				call(state, colleague()).then(res => expectPhraseError(res, 'global/notAuthorizedForLe', colleague()));
				stored(state);
			});
		});
	});

	describe('the substitute is no admin of the LV', () => {
		const entschuldigt = id => [{ anwesenheit_user_id: id, status: ctx.config.entschuldigt_status }];
		const abwesend = id => [{ anwesenheit_user_id: id, status: ctx.config.abwesend_status }];

		it('sets entschuldigt → noAuthorization, nothing saved', function () {
			skipIfLegacy(this);

			givenKontrolleOfLektor().then(state => {
				kontrolleApi
					.updateAnwesenheiten(ctx.le, entschuldigt(state.entries[0].anwesenheit_user_id), as())
					.then(res => expectPhraseError(res, 'global/noAuthorization', as()));
				stored(state);
			});
		});

		it('changes an entry that is entschuldigt → noAuthorization, nothing saved', function () {
			skipIfLegacy(this);

			givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
				givenStatus(ctx, entschuldigt(entry.anwesenheit_user_id), { as: account('FULL_ASSISTENZ') });

				readKontrolle(kontrolle.anwesenheit_id).then(state => {
					kontrolleApi
						.updateAnwesenheiten(ctx.le, abwesend(entry.anwesenheit_user_id), as())
						.then(res => expectPhraseError(res, 'global/noAuthorization', as()));
					readKontrolle(kontrolle.anwesenheit_id).should('deep.equal', state);
				});
			});
		});

		it('a Kontrolle in the LE of LEKTOR one day before the past reach → providedDateTooOld, nothing stored', function () {
			skipIfLegacy(this);
			const date = addDays(ctx.today, -ctx.config.kontrolleCreateMaxReachPast - 1);
			skipIf(this, ctx.termine.includes(date), `the LE has a Termin on ${date}, the Termin rule allows that date`);

			kontrolleApi
				.insertAnwWithoutQR(ctx.le, dateParam(date), timeParam('08:00'), timeParam('09:30'), as())
				.then(res => expectPhraseError(res, 'global/providedDateTooOld', as()));
			countKontrollen(ctx).should('eq', 0);
		});
	});

	it('an LE of an LV that SUPPL_LEKTOR does not teach → notAuthorizedForLe, nothing stored', () => {
		kontrolleApi
			.insertAnwWithoutQR(ctx.otherLe, today(), timeParam('08:00'), timeParam('09:30'), as())
			.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', as()));
		countKontrollen(ctx).should('eq', 0);
	});
});
