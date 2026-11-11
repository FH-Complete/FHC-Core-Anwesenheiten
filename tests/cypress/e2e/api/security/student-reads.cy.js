// How far a student reads: the data of other students, the fields of the staff and the documents.
// The IDOR tests of ProfilApi are in profil/idor.cy.js.

import { account } from '../../../support/accounts';
import { entschuldigungFile, infoApi, profilApi } from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { decide, entryOf, givenEntschuldigung, givenKontrolle, givenStatus, NOTIZ } from '../../../support/anwScenario';

// the fields of an entry of the LV detail that a student gets: no note of the lektor, no uid of the staff
const STUDENT_ANW_FIELDS = [
	'anwesenheit_user_id',
	'datum',
	'status',
	'lehreinheit_id',
	'lehrform',
	'lehrfach_bez',
	'von',
	'bis',
	'fehlminuten',
	'dauer',
];

// the fields of an Entschuldigung that a student gets: no uid of the staff
const STUDENT_ENT_FIELDS = [
	'entschuldigung_id',
	'person_id',
	'von',
	'bis',
	'akzeptiert',
	'notiz',
	'dms_id',
	'version',
	'insertamum',
	'updateamum',
	'statussetamum',
];

describe('security: what a student reads', () => {
	const ctx = useAnwContext({ pdf: true });

	const as = () => account(ctx.student.role);
	const other = () => (ctx.student.role === 'STUDENT' ? ctx.testStudents.STUDENT2 : ctx.testStudents.STUDENT);
	const range = () => ({ von: `${ctx.today} 08:00:00`, bis: `${ctx.today} 12:00:00` });

	it('InfoApi::getStudentInfo with the own prestudent_id → the own data', () => {
		infoApi
			.getStudentInfo(ctx.student.prestudentId, ctx.lvId, ctx.semKurzbz, as())
			.fhcData()
			.its('0.person_id')
			.should('eq', ctx.student.personId);
	});

	it('InfoApi::getStudentInfo with the prestudent_id of another student → noAuthorization', () => {
		infoApi
			.getStudentInfo(other().prestudentId, ctx.lvId, ctx.semKurzbz, as())
			.then(res => expectPhraseError(res, 'global/noAuthorization', as()));
	});

	it('the entries of the LV with a note of the lektor → only the student fields', () => {
		givenKontrolle(ctx).then(state => {
			givenStatus(ctx, [
				{ anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id, status: ctx.config.anwesend_status, notiz: NOTIZ },
			]);

			profilApi
				.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, ctx.lvId, ctx.student.prestudentId, as().username, as())
				.fhcData()
				.then(rows => {
					expect(rows).to.have.length.greaterThan(0);
					rows.forEach(row => expect(STUDENT_ANW_FIELDS).to.include.members(Object.keys(row)));
				});
		});
	});

	it('FULL_ASSISTENZ reads the same entries → with the note of the lektor', () => {
		givenKontrolle(ctx).then(state => {
			givenStatus(ctx, [
				{ anwesenheit_user_id: entryOf(state, ctx.student).anwesenheit_user_id, status: ctx.config.anwesend_status, notiz: NOTIZ },
			]);

			profilApi
				.getAllAnwesenheitenByStudentByLva(
					ctx.semKurzbz,
					ctx.lvId,
					ctx.student.prestudentId,
					ctx.student.uid,
					account('FULL_ASSISTENZ'),
				)
				.fhcData()
				.then(rows => expect(rows.map(row => row.notiz)).to.include(NOTIZ));
		});
	});

	it('a decided Entschuldigung in getEntschuldigungenByPersonID and getAllAnwByUID → only the student fields', function () {
		skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');

		givenEntschuldigung(ctx.student, range())
			.its('entschuldigung')
			.then(entschuldigung => {
				decide(entschuldigung.entschuldigung_id, false, { notiz: 'Bestätigung fehlt' });

				const expectStudentFields = rows => {
					const row = rows.find(r => r.entschuldigung_id === entschuldigung.entschuldigung_id);
					expect(row, 'the Entschuldigung').to.exist;
					expect(STUDENT_ENT_FIELDS).to.include.members(Object.keys(row));
					expect(row.notiz, 'the reason of the assistenz').to.eq('Bestätigung fehlt');
				};

				profilApi.getEntschuldigungenByPersonID(ctx.student.personId, as()).fhcData().then(expectStudentFields);
				profilApi
					.getAllAnwByUID(ctx.semKurzbz, as().username, ctx.student.personId, as())
					.fhcData()
					.then(([, ent]) => expectStudentFields(ent.retval));
			});
	});

	describe('the document of an Entschuldigung', () => {
		beforeEach(function () {
			skipIf(this, !ctx.config.entschuldigungen_enabled, 'ENTSCHULDIGUNGEN_ENABLED is off');
		});

		const givenDocument = owner =>
			givenEntschuldigung(owner, { ...range(), pdf: ctx.pdf }).its('entschuldigung.dms_id');

		it('the own document → the PDF as attachment, the name without a path', () => {
			givenDocument(ctx.student).then(dmsId => {
				entschuldigungFile(dmsId, as()).then(res => {
					expect(res.status).to.eq(200);
					expect(res.headers['content-disposition']).to.match(/^attachment; filename="[^/"]+"$/);
					expect(res.body).to.eq(ctx.pdf);
				});
			});
		});

		it('the document of another student → no file', () => {
			givenDocument(other()).then(dmsId => {
				entschuldigungFile(dmsId, as()).then(res => {
					expect(res.headers['content-disposition'], 'a file').to.be.undefined;
					expect(String(res.body)).to.not.include('%PDF');
				});
			});
		});
	});

	describe('ids that are no ids', () => {
		[
			[
				'getAllAnwesenheitenByStudentByLva with lv_id "abc"',
				() => profilApi.getAllAnwesenheitenByStudentByLva(ctx.semKurzbz, 'abc', ctx.student.prestudentId, as().username, as()),
			],
			[
				'InfoApi::getStudentInfo with prestudent_id "1 OR 1=1"',
				() => infoApi.getStudentInfo('1 OR 1=1', ctx.lvId, ctx.semKurzbz, as()),
			],
			['InfoApi::getLvViewDataInfo with lv_id "abc"', () => infoApi.getLvViewDataInfo('abc', as())],
			[
				'getAnwesenheitSumByLva with the own prestudent_id and lv_id "abc"',
				() => profilApi.getAnwesenheitSumByLva('abc', ctx.semKurzbz, ctx.student.prestudentId, as()),
			],
			['InfoApi::getStudiengaenge with allowed_stg "x"', () => infoApi.getStudiengaenge('x', as())],
		].forEach(([label, call]) => {
			it(`${label} → wrongParameters, no database text`, () => {
				call().then(res => {
					expectNoDbText(res);
					expectPhraseError(res, 'global/wrongParameters', as());
				});
			});
		});

		[
			['a number', 12345678],
			['an array', ['00000000']],
			['an object', { code: '00000000' }],
			['null', null],
			['SQL', "' OR '1'='1"],
		].forEach(([label, zugangscode]) => {
			it(`checkInAnwesenheit with ${label} as code → errorInvalidCode, no database text`, () => {
				givenKontrolle(ctx, { qr: true });
				profilApi.checkInAnwesenheit(zugangscode, as()).then(res => {
					expectNoDbText(res);
					expectPhraseError(res, 'global/errorInvalidCode', as());
				});
			});
		});
	});
});
