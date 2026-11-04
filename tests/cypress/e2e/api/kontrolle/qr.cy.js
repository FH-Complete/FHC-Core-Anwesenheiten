// KontrolleApi: the QR code of a Kontrolle from start to end

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectPhraseError, expectPhraseText, skipIf } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { dateParam } from '../../../support/anwDates';
import { givenKontrolle, readKontrolle, resetEntschuldigungen, resetKontrollen } from '../../../support/anwScenario';

describe('KontrolleApi: the QR code of a Kontrolle', () => {
	let ctx;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
			resetEntschuldigungen(ctx);
		});
	});

	beforeEach(() => resetKontrollen(ctx));

	const restart = kontrolle =>
		kontrolleApi.restartKontrolle(ctx.le, dateParam(ctx.today), kontrolle.anwesenheit_id, account('LEKTOR')).fhcData();

	it('getExistingQRCode as the creator → the code of the Kontrolle', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			kontrolleApi
				.getExistingQRCode(ctx.le, account('LEKTOR'))
				.fhcData()
				.should('include', { code, anwesenheit_id: kontrolle.anwesenheit_id });
		});
	});

	it('getExistingQRCode as LEKTOR2 → noExistingKontrolleFound', () => {
		givenKontrolle(ctx, { qr: true });
		kontrolleApi
			.getExistingQRCode(ctx.le, account('LEKTOR2'))
			.then(res => expectPhraseText(res, 'global/noExistingKontrolleFound', account('LEKTOR2')));
	});

	it('regenerateQRCode → a new code; degenerateQRCode of the old code → only the new code stays', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			kontrolleApi
				.regenerateQRCode(kontrolle.anwesenheit_id, account('LEKTOR'))
				.fhcData()
				.then(({ code: newCode }) => {
					expect(newCode).to.match(/^[0-9a-f]{8}$/).and.not.eq(code);
					readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [code, newCode]);

					kontrolleApi.degenerateQRCode(kontrolle.anwesenheit_id, code, account('LEKTOR')).fhcData();
					readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [newCode]);
				});
		});
	});

	it('restartKontrolle with a code → the same code', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			restart(kontrolle).its('code').should('eq', code);
		});
	});

	it('deleteQRCode → no code, the Kontrolle stays; restartKontrolle → a new code', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			kontrolleApi.deleteQRCode(kontrolle.anwesenheit_id, ctx.lvId, account('LEKTOR')).fhcData();
			readKontrolle(kontrolle.anwesenheit_id).then(state => {
				expect(state.codes).to.be.empty;
				expect(state.kontrolle).to.exist;
			});

			restart(kontrolle).then(({ code: newCode }) => {
				expect(newCode).to.not.eq(code);
				readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [newCode]);
			});
		});
	});

	it('pollAnwesenheiten → the counts of the Kontrolle', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, entries }) => {
			kontrolleApi
				.pollAnwesenheiten(kontrolle.anwesenheit_id, ctx.lvId, account('LEKTOR'))
				.fhcData()
				.then(counts => {
					expect(Number(counts.anwesend), 'anwesend').to.eq(0);
					expect(Number(counts.abwesend), 'abwesend').to.eq(entries.length);
				});
		});
	});

	it('pollAnwesenheiten with the lv_id of another LV of LEKTOR → notAuthorizedForLva', function () {
		skipIf(this, !ctx.otherLv, 'LEKTOR teaches no other LV');

		givenKontrolle(ctx, { qr: true }).then(({ kontrolle }) => {
			kontrolleApi
				.pollAnwesenheiten(kontrolle.anwesenheit_id, ctx.otherLv, account('LEKTOR'))
				.then(res => expectPhraseError(res, 'global/notAuthorizedForLva', account('LEKTOR')));
		});
	});

	it('regenerateQRCode for a Kontrolle of the LE of LEKTOR2 → notAuthorizedForLe, the code stays', () => {
		givenKontrolle(ctx, { qr: true, le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(({ kontrolle, code }) => {
			kontrolleApi
				.regenerateQRCode(kontrolle.anwesenheit_id, account('LEKTOR'))
				.then(res => expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')));
			readKontrolle(kontrolle.anwesenheit_id).its('codes').should('deep.equal', [code]);
		});
	});
});
