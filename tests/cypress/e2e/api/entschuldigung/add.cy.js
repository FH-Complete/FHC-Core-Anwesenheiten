// ProfilApi: a new Entschuldigung with addEntschuldigung

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, workdaysBack } from '../../../support/anwDates';
import { addEntschuldigung, countEntschuldigungen, readEntschuldigung } from '../../../support/anwScenario';

describe('ProfilApi: add an Entschuldigung', () => {
	const ctx = useAnwContext({ resets: ['entschuldigungen'], entschuldigungen: true, pdf: true });

	const student = () => ctx.testStudents.STUDENT;
	const as = () => account(student().role);
	const at = (iso, time) => `${iso} ${time}`;
	const today = (von = '08:00:00', bis = '12:00:00') => ({ von: at(ctx.today, von), bis: at(ctx.today, bis) });

	// an upload with a file that is not the PDF fixture
	const upload = file => profilApi.addEntschuldigung({ ...today(), person_id: student().personId }, file, as());

	const expectNothingStored = () => countEntschuldigungen(ctx).should('eq', 0);

	it('with a PDF → stored open with version 1 and a DMS document', () => {
		addEntschuldigung(student(), { ...today(), pdf: ctx.pdf })
			.fhcData()
			.then(({ entschuldigung_id, dms_id }) => {
				readEntschuldigung(entschuldigung_id).then(({ entschuldigung, document }) => {
					expect(entschuldigung).to.include({ ...today(), akzeptiert: null, version: 1, dms_id: Number(dms_id) });
					expect(document).to.eq(true);
				});
			});
	});

	it('without a document (noFileUpload) → stored without dms_id', () => {
		addEntschuldigung(student(), today())
			.fhcData()
			.then(({ entschuldigung_id }) => {
				readEntschuldigung(entschuldigung_id).its('entschuldigung').should('include', { dms_id: null, akzeptiert: null });
			});
	});

	it('bis on a day before von → errorValidateTimes, nothing stored', () => {
		addEntschuldigung(student(), { von: at(ctx.today, '08:00:00'), bis: at(addDays(ctx.today, -1), '12:00:00') }).then(res =>
			expectPhraseError(res, 'global/errorValidateTimes', as()),
		);
		expectNothingStored();
	});

	it('bis before von on the same day → errorValidateUhrzeit, nothing stored', () => {
		addEntschuldigung(student(), today('12:00:00', '08:00:00')).then(res =>
			expectPhraseError(res, 'global/errorValidateUhrzeit', as()),
		);
		expectNothingStored();
	});

	it('von ENTSCHULDIGUNG_MAX_REACH workdays ago → stored', () => {
		const von = at(workdaysBack(ctx.today, ctx.config.entschuldigungMaxReach), '00:00:00');
		addEntschuldigung(student(), { von, bis: at(ctx.today, '12:00:00') }).fhcData();
	});

	// the server allows one workday more than the reach and counts from the current time of the day,
	// so the day before that limit is old at every time of the day
	it('von two workdays before the reach → providedDateTooOld, nothing stored', () => {
		const von = at(workdaysBack(ctx.today, ctx.config.entschuldigungMaxReach + 2), '23:59:00');
		addEntschuldigung(student(), { von, bis: at(ctx.today, '12:00:00') }).then(res =>
			expectPhraseError(res, 'global/providedDateTooOld', as()),
		);
		expectNothingStored();
	});

	it('FULL_ASSISTENZ, von two workdays before the reach → stored', () => {
		const von = at(workdaysBack(ctx.today, ctx.config.entschuldigungMaxReach + 2), '23:59:00');
		addEntschuldigung(student(), { von, bis: at(ctx.today, '12:00:00'), as: account('FULL_ASSISTENZ') }).fhcData();
	});

	it('STUDENT with the person_id of STUDENT2 → errorNoRightsToChangeData, nothing stored', () => {
		addEntschuldigung(ctx.testStudents.STUDENT2, { ...today(), as: as() }).then(res =>
			expectPhraseError(res, 'global/errorNoRightsToChangeData', as()),
		);
		expectNothingStored();
	});

	it('a range over three days → stored with that range', () => {
		const range = { von: at(addDays(ctx.today, -1), '08:00:00'), bis: at(addDays(ctx.today, 1), '12:00:00') };
		addEntschuldigung(student(), range)
			.fhcData()
			.then(({ entschuldigung_id }) => {
				readEntschuldigung(entschuldigung_id).its('entschuldigung').should('include', range);
			});
	});

	// open by design: no limit for the range of a student
	it('a range far in the future → stored', () => {
		const range = { von: at(addDays(ctx.today, 60), '08:00:00'), bis: at(addDays(ctx.today, 90), '12:00:00') };
		addEntschuldigung(student(), range).fhcData();
		countEntschuldigungen(ctx).should('eq', 1);
	});

	[
		['without von', { von: '' }],
		['with von "gestern"', { von: 'gestern' }],
	].forEach(([label, change]) => {
		it(`${label} → wrongParameters, nothing stored`, () => {
			addEntschuldigung(student(), { ...today(), ...change }).then(res => expectPhraseError(res, 'global/wrongParameters', as()));
			expectNothingStored();
		});
	});

	it('a file one KB over the upload limit → errorEntUploadFileTooLarge, nothing stored', function () {
		const max = Number(ctx.config.entschuldigungMaxFileSize);
		skipIf(this, !max || max > 25 * 1024 * 1024, `the upload limit (${max} bytes) is unknown or too large for a test`);

		const content = `${ctx.pdf}%${'x'.repeat(max + 1024)}`;
		upload({ field: 'files', name: 'bestaetigung.pdf', type: 'application/pdf', content }).then(
			res => expectPhraseError(res, 'global/errorEntUploadFileTooLarge', as()),
		);
		expectNothingStored();
	});

	it('a .txt file → errorEntUploadFiletype, nothing stored', () => {
		upload({ field: 'files', name: 'bestaetigung.txt', type: 'text/plain', content: 'Text' }).then(res =>
			expectPhraseError(res, 'global/errorEntUploadFiletype', as()),
		);
		expectNothingStored();
	});

	it('a text file named .pdf → errorEntUploadContent, nothing stored', () => {
		upload({ field: 'files', name: 'bestaetigung.pdf', type: 'application/pdf', content: 'kein PDF' }).then(res =>
			expectPhraseError(res, 'global/errorEntUploadContent', as()),
		);
		expectNothingStored();
	});

	it('an empty PDF → errorEntUploadEmptyFile, nothing stored', () => {
		upload({ field: 'files', name: 'bestaetigung.pdf', type: 'application/pdf', content: '' }).then(res =>
			expectPhraseError(res, 'global/errorEntUploadEmptyFile', as()),
		);
		expectNothingStored();
	});
});
