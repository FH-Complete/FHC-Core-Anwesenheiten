// ProfilApi: a document for an open Entschuldigung with editEntschuldigung

import { account } from '../../../support/accounts';
import { entschuldigungFile, profilApi, UNKNOWN_ID } from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { addDays, uploadDeadline } from '../../../support/anwDates';
import { decide, givenEntschuldigung, pdfFile, readEntschuldigung } from '../../../support/anwScenario';

describe('ProfilApi: hand in a document later', () => {
	const ctx = useAnwContext({ resets: ['entschuldigungen'], entschuldigungen: true, pdf: true });

	const student = () => ctx.testStudents.STUDENT;

	const givenOpen = (owner = student()) =>
		givenEntschuldigung(owner, { von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00` }).its('entschuldigung');

	// the person_id of the request is the one of student(), the Entschuldigung can be another one
	const edit = (entschuldigung, as = account(student().role)) =>
		profilApi.editEntschuldigung(
			{ person_id: student().personId, entschuldigung_id: entschuldigung.entschuldigung_id },
			pdfFile(ctx.pdf),
			as,
		);

	// the upload deadline ends ENTSCHULDIGUNG_MAX_REACH workdays after the day of creation. The age in days of the
	// oldest Entschuldigung whose deadline has not passed today: with a weekend in it on most days of the week
	const lastDayOfDeadline = () => {
		const reach = ctx.config.entschuldigungMaxReach;
		const ages = [...Array(reach * 2 + 8).keys()];
		return Math.max(...ages.filter(age => uploadDeadline(addDays(ctx.today, -age), reach) >= ctx.today));
	};

	// the API cannot create an old Entschuldigung
	const backdate = (entschuldigung, days) =>
		cy.task('anw:db:backdateEntschuldigung', {
			entschuldigungId: entschuldigung.entschuldigung_id,
			personIds: [student().personId],
			days,
		});

	const expectNoDocument = entschuldigung =>
		readEntschuldigung(entschuldigung.entschuldigung_id).then(({ entschuldigung: stored, history }) => {
			expect(stored).to.include({ dms_id: null, version: 1 });
			expect(history).to.be.empty;
		});

	it('an open one without a document → the document is added, version 2, one history row', () => {
		givenOpen().then(entschuldigung => {
			edit(entschuldigung).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id).then(state => {
				expect(state.entschuldigung.version).to.eq(2);
				expect(state.entschuldigung.dms_id).to.be.a('number');
				expect(state.document).to.eq(true);
				expect(state.history).to.have.length(1);
			});
		});
	});

	// the replaced document stays in the DMS, but no Entschuldigung links it: nobody downloads it anymore
	it('a second document → version 3, two history rows, a new dms_id; the first document is no download anymore', () => {
		givenOpen().then(entschuldigung => {
			edit(entschuldigung)
				.fhcData()
				.then(({ dms_id: firstDms }) => {
					edit(entschuldigung).fhcData();
					readEntschuldigung(entschuldigung.entschuldigung_id).then(state => {
						expect(state.entschuldigung.version).to.eq(3);
						expect(state.history).to.have.length(2);
						expect(state.entschuldigung.dms_id).to.not.eq(Number(firstDms));
						expect(state.document).to.eq(true);
					});

					cy.task('anw:db:dmsExists', { dmsId: Number(firstDms) }).should('eq', true);
					entschuldigungFile(firstDms, account(student().role)).then(res => {
						expect(res.headers['content-disposition'], 'a file').to.be.undefined;
						expect(String(res.body)).to.not.include('%PDF');
					});
				});
		});
	});

	it('no file → errorEntUploadNoFile, no document, version 1, no history row', () => {
		givenOpen().then(entschuldigung => {
			profilApi
				.editEntschuldigung(
					{ person_id: student().personId, entschuldigung_id: entschuldigung.entschuldigung_id },
					null,
					account(student().role),
				)
				.then(res => {
					expectNoDbText(res);
					expectPhraseError(res, 'global/errorEntUploadNoFile', account(student().role));
				});
			expectNoDocument(entschuldigung);
		});
	});

	// the ids of the request, each with the own open Entschuldigung
	[
		['entschuldigung_id "abc"', () => ({ person_id: student().personId, entschuldigung_id: 'abc' }), 'errorNoEntschuldigungFound'],
		['no person_id', id => ({ entschuldigung_id: id }), 'missingParameters'],
		[
			'the person_id of STUDENT2',
			id => ({ person_id: ctx.testStudents.STUDENT2.personId, entschuldigung_id: id }),
			'errorNoRightsToChangeData',
		],
		// on PHP 7 "123abc" == 123
		[
			'the person_id "<own id>abc"',
			id => ({ person_id: `${student().personId}abc`, entschuldigung_id: id }),
			'errorNoRightsToChangeData',
		],
	].forEach(([label, fields, phrase]) => {
		it(`${label} → ${phrase}, no document and no new DMS document`, () => {
			const uid = account(student().role).username.toLowerCase();

			givenOpen().then(entschuldigung => {
				cy.task('anw:db:countDmsOf', { uid }).then(before => {
					profilApi
						.editEntschuldigung(fields(entschuldigung.entschuldigung_id), pdfFile(ctx.pdf), account(student().role))
						.then(res => expectPhraseError(res, `global/${phrase}`, account(student().role)));

					expectNoDocument(entschuldigung);
					cy.task('anw:db:countDmsOf', { uid }).should('eq', before);
				});
			});
		});
	});

	it('an unknown entschuldigung_id → errorNoEntschuldigungFound', () => {
		edit({ entschuldigung_id: UNKNOWN_ID }).then(res =>
			expectPhraseError(res, 'global/errorNoEntschuldigungFound', account(student().role)),
		);
	});

	it('a .txt file → errorEntUploadFiletype, no document, version 1', () => {
		givenOpen().then(entschuldigung => {
			profilApi
				.editEntschuldigung(
					{ person_id: student().personId, entschuldigung_id: entschuldigung.entschuldigung_id },
					{ field: 'files', name: 'bestaetigung.txt', type: 'text/plain', content: 'Text' },
					account(student().role),
				)
				.then(res => expectPhraseError(res, 'global/errorEntUploadFiletype', account(student().role)));
			readEntschuldigung(entschuldigung.entschuldigung_id)
				.its('entschuldigung')
				.should('include', { dms_id: null, version: 1 });
		});
	});

	it('on the last day of the upload deadline → the document is added', () => {
		givenOpen().then(entschuldigung => {
			backdate(entschuldigung, lastDayOfDeadline());
			edit(entschuldigung).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id).its('document').should('eq', true);
		});
	});

	it('one day after the upload deadline → errorEntUploadDeadlinePassed, no document', () => {
		givenOpen().then(entschuldigung => {
			backdate(entschuldigung, lastDayOfDeadline() + 1);
			edit(entschuldigung).then(res =>
				expectPhraseError(res, 'global/errorEntUploadDeadlinePassed', account(student().role)),
			);
			expectNoDocument(entschuldigung);
		});
	});

	it('FULL_ASSISTENZ one day after the upload deadline → the document is added', () => {
		givenOpen().then(entschuldigung => {
			backdate(entschuldigung, lastDayOfDeadline() + 1);
			edit(entschuldigung, account('FULL_ASSISTENZ')).fhcData();
			readEntschuldigung(entschuldigung.entschuldigung_id).its('document').should('eq', true);
		});
	});

	// the admin has an exception for the deadline, not for a decided Entschuldigung
	[
		[true, 'errorEntAlreadyAccepted', 'STUDENT'],
		[false, 'errorEntAlreadyDeclined', 'STUDENT'],
		[true, 'errorEntAlreadyAccepted', 'FULL_ASSISTENZ'],
	].forEach(([status, phrase, role]) => {
		it(`${status ? 'accepted' : 'declined'}, as ${role} → ${phrase}, no document`, () => {
			givenOpen().then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, status);
				edit(entschuldigung, account(role)).then(res => expectPhraseError(res, `global/${phrase}`, account(role)));
				readEntschuldigung(entschuldigung.entschuldigung_id).its('entschuldigung.dms_id').should('eq', null);
			});
		});
	});

	it('the Entschuldigung of STUDENT2 with the own person_id → noAuthorization, no document', () => {
		givenOpen(ctx.testStudents.STUDENT2).then(entschuldigung => {
			edit(entschuldigung).then(res => expectPhraseError(res, 'global/noAuthorization', account(student().role)));
			readEntschuldigung(entschuldigung.entschuldigung_id)
				.its('entschuldigung.dms_id')
				.should('eq', null);
		});
	});
});
