// How far a student writes: old codes and ids that only look like the own id

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { countEntschuldigungen, givenKontrolle, pdfFile, statusNow } from '../../../support/anwScenario';

describe('security: what a student writes', () => {
	const ctx = useAnwContext({ pdf: true });

	const as = () => account(ctx.student.role);

	// the day part of a date difference ignores the months: a code of exactly one month ago looked new
	it('a code of exactly one month ago → errorCodeTooOld, still abwesend', () => {
		givenKontrolle(ctx, { qr: true }).then(({ kontrolle, code }) => {
			cy.task('anw:db:backdateCode', { anwesenheitId: kontrolle.anwesenheit_id, leIds: [ctx.le], months: 1 });

			profilApi.checkInAnwesenheit(code, as()).then(res => expectPhraseError(res, 'global/errorCodeTooOld', as()));
			statusNow(kontrolle, ctx.student).should('eq', ctx.config.abwesend_status);
		});
	});

	describe('addEntschuldigung with person_id "<own id>abc"', () => {
		beforeEach(function () {
			skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		});

		// on PHP 7 "123abc" == 123: the request passed the check and the insert failed after the upload
		it('with a PDF → errorNoRightsToChangeData, no Entschuldigung and no new DMS document', () => {
			cy.task('anw:db:countDmsOf', { uid: as().username.toLowerCase() }).then(before => {
				profilApi
					.addEntschuldigung(
						{ von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00`, person_id: `${ctx.student.personId}abc` },
						pdfFile(ctx.pdf),
						as(),
					)
					.then(res => expectPhraseError(res, 'global/errorNoRightsToChangeData', as()));

				countEntschuldigungen(ctx).should('eq', 0);
				cy.task('anw:db:countDmsOf', { uid: as().username.toLowerCase() }).should('eq', before);
			});
		});
	});
});
