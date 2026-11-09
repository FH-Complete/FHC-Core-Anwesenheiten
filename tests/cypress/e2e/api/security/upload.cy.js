// The upload of an Entschuldigung document with a crafted file name. cy.fhcUpload sends text only:
// a binary image with HTML after its header cannot be tested here

import { account } from '../../../support/accounts';
import { entschuldigungFile, profilApi } from '../../../support/anwApi';
import { expectPhraseError } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { countEntschuldigungen } from '../../../support/anwScenario';

describe('security: crafted file names of an upload', () => {
	const ctx = useAnwContext({ resets: ['entschuldigungen'], entschuldigungen: true, pdf: true });

	const student = () => ctx.testStudents.STUDENT;
	const as = () => account('STUDENT');
	const upload = (name, content = ctx.pdf) =>
		profilApi.addEntschuldigung(
			{ von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00`, person_id: student().personId },
			{ field: 'files', name, type: 'application/pdf', content },
			as(),
		);

	[
		['a path in the name', '../../../../evil.pdf'],
		['a double extension', 'evil.php.pdf'],
	].forEach(([label, name]) => {
		it(`${label} (${name}) → stored under a name of the server, the download has no path`, () => {
			upload(name)
				.fhcData()
				.then(({ dms_id: dmsId }) => {
					cy.task('anw:db:readDmsFile', { dmsId }).then(file => {
						expect(file.filename, 'the file on the disk').to.not.match(/[\\/]|\.\./);
						expect(file.filename, 'the file on the disk').to.match(/\.pdf$/i);
					});
					entschuldigungFile(dmsId, as()).then(res => {
						expect(res.headers['content-disposition']).to.match(/^attachment; filename="[^/\\"]+"$/);
						expect(res.body).to.eq(ctx.pdf);
					});
				});
		});
	});

	it('a PHP file named .php → errorEntUploadFiletype, nothing stored', () => {
		upload('evil.php', '<?php echo "x"; ?>').then(res => expectPhraseError(res, 'global/errorEntUploadFiletype', as()));
		countEntschuldigungen(ctx).should('eq', 0);
	});

	it('PHP code in a file named .pdf → errorEntUploadContent, nothing stored', () => {
		upload('evil.pdf', '<?php echo "x"; ?>').then(res => expectPhraseError(res, 'global/errorEntUploadContent', as()));
		countEntschuldigungen(ctx).should('eq', 0);
	});
});
