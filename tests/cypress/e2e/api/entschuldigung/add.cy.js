// ProfilApi: a new Entschuldigung with addEntschuldigung

import { account } from '../../../support/accounts';
import { profilApi } from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, workdaysBack } from '../../../support/anwDates';
import { addEntschuldigung, countEntschuldigungen, pdfFile, readEntschuldigung } from '../../../support/anwScenario';

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

	// the form of the frontend sends toISOString(): UTC with a Z. The server stores its local time, and the suite does
	// not know its time zone. So: two notations of the same moment give the same stored time
	it('von and bis as ISO times with a time zone → stored as that moment in the time of the server', () => {
		const utc = { von: `${ctx.today}T07:00:00.000Z`, bis: `${ctx.today}T11:00:00.000Z` };
		const plusTwo = { von: `${ctx.today}T09:00:00.000+02:00`, bis: `${ctx.today}T13:00:00.000+02:00` };
		const stored = range =>
			addEntschuldigung(student(), range)
				.fhcData()
				.then(({ entschuldigung_id }) => readEntschuldigung(entschuldigung_id).its('entschuldigung'));

		stored(utc).then(first => {
			expect(first.von).to.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00$/);
			stored(plusTwo).should('include', { von: first.von, bis: first.bis });
		});
	});

	it('FULL_ASSISTENZ for the student → stored for the student, insertvon is FULL_ASSISTENZ', () => {
		addEntschuldigung(student(), { ...today(), as: account('FULL_ASSISTENZ') })
			.fhcData()
			.then(({ entschuldigung_id }) => {
				readEntschuldigung(entschuldigung_id)
					.its('entschuldigung')
					.should('include', { person_id: student().personId, insertvon: account('FULL_ASSISTENZ').username.toLowerCase() });
			});
	});

	// no rule against a second Entschuldigung for the same range
	it('the same range two times → both stored', () => {
		addEntschuldigung(student(), today()).fhcData();
		addEntschuldigung(student(), today()).fhcData();
		countEntschuldigungen(ctx).should('eq', 2);
	});

	it('bis on a day before von → errorValidateTimes, nothing stored', () => {
		addEntschuldigung(student(), { von: at(ctx.today, '08:00:00'), bis: at(addDays(ctx.today, -1), '12:00:00') }).then(res =>
			expectPhraseError(res, 'global/errorValidateTimes', as()),
		);
		expectNothingStored();
	});

	[
		['bis before von on the same day', '12:00:00', '08:00:00'],
		['bis equal to von', '08:00:00', '08:00:00'],
	].forEach(([label, von, bis]) => {
		it(`${label} → errorValidateUhrzeit, nothing stored`, () => {
			addEntschuldigung(student(), today(von, bis)).then(res => expectPhraseError(res, 'global/errorValidateUhrzeit', as()));
			expectNothingStored();
		});
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

	it('no file and no noFileUpload → errorEntUploadNoFile, nothing stored', () => {
		upload(null).then(res => {
			expectNoDbText(res);
			expectPhraseError(res, 'global/errorEntUploadNoFile', as());
		});
		expectNothingStored();
	});

	// the server reads every value of noFileUpload as true: the frontend sends the field only without a file
	it('noFileUpload "false" with a file → stored without the document', () => {
		profilApi
			.addEntschuldigung({ ...today(), person_id: student().personId, noFileUpload: 'false' }, pdfFile(ctx.pdf), as())
			.fhcData()
			.its('dms_id')
			.should('eq', null);
	});

	// the extension and the content decide, not the case of the name or the type that the client sends
	[
		['an upper case name', { name: 'BESTAETIGUNG.PDF', type: 'application/pdf' }],
		['the type text/plain', { name: 'bestaetigung.pdf', type: 'text/plain' }],
	].forEach(([label, file]) => {
		it(`a PDF with ${label} → stored with its document`, () => {
			upload({ field: 'files', content: ctx.pdf, ...file })
				.fhcData()
				.then(({ entschuldigung_id }) => readEntschuldigung(entschuldigung_id).its('document').should('eq', true));
		});
	});

	// the toast of the frontend renders the message as HTML
	it('a file name with HTML → errorEntUploadFiletype, the message holds the name escaped', () => {
		upload({ field: 'files', name: '<img src=x onerror=alert(1)>.txt', type: 'text/plain', content: 'Text' }).then(res => {
			expectPhraseError(res, 'global/errorEntUploadFiletype', as());
			const message = res.body.errors.map(error => error.message).join(' ');
			expect(message).to.include('&lt;img').and.not.include('<img');
		});
		expectNothingStored();
	});

	it('a refused upload → one webservicelog row with the reason, the file name and the student', () => {
		const name = `kein-pdf-${Date.now()}.txt`;
		upload({ field: 'files', name, type: 'text/plain', content: 'Text' }).then(res =>
			expectPhraseError(res, 'global/errorEntUploadFiletype', as()),
		);

		cy.task('anw:db:readWebservicelog', { beschreibung: 'EntschuldigungUploadError on addEntschuldigung', contains: name }).then(
			rows => {
				expect(rows).to.have.length(1);
				expect(rows[0].executeUser).to.eq(student().uid);
				expect(JSON.parse(rows[0].requestData)).to.include({ context: 'addEntschuldigung', reason: 'filetype', file_name: name });
			},
		);
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
