// ProfilApi: a new Entschuldigung with addEntschuldigung

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { expectPhraseError, skipIf } from '../../../support/anwChecks';
import { loadAnwContext } from '../../../support/anwContext';
import { addDays, workdaysBack } from '../../../support/anwDates';
import {
	addEntschuldigung,
	countEntschuldigungen,
	readEntschuldigung,
	resetEntschuldigungen,
} from '../../../support/anwScenario';

describe('ProfilApi: add an Entschuldigung', () => {
	let ctx;
	let pdf;

	before(() => {
		loadAnwContext().then(loaded => {
			ctx = loaded;
		});
		cy.fixture('entschuldigung.pdf', 'utf8').then(content => {
			pdf = content;
		});
	});

	beforeEach(function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		resetEntschuldigungen(ctx);
	});

	const student = () => ctx.testStudents.STUDENT;
	const as = () => account(student().role);
	const at = (iso, time) => `${iso} ${time}`;
	const today = (von = '08:00:00', bis = '12:00:00') => ({ von: at(ctx.today, von), bis: at(ctx.today, bis) });

	// an upload with a file that is not the PDF fixture
	const upload = file => profilApi.addEntschuldigung({ ...today(), person_id: student().personId }, file, as());

	const expectNothingStored = () => countEntschuldigungen(ctx).should('eq', 0);

	it('with a PDF → stored open with version 1 and a DMS document', () => {
		addEntschuldigung(student(), { ...today(), pdf })
			.fhcData()
			.then(({ entschuldigung_id, dms_id }) => {
				readEntschuldigung(entschuldigung_id, student()).then(({ entschuldigung, document }) => {
					expect(entschuldigung).to.include({ ...today(), akzeptiert: null, version: 1, dms_id: Number(dms_id) });
					expect(document).to.eq(true);
				});
			});
	});

	it('without a document (noFileUpload) → stored without dms_id', () => {
		addEntschuldigung(student(), today())
			.fhcData()
			.then(({ entschuldigung_id }) => {
				readEntschuldigung(entschuldigung_id, student()).its('entschuldigung').should('include', { dms_id: null, akzeptiert: null });
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
