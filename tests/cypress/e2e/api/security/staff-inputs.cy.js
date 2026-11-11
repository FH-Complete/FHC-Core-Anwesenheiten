// Values of the wrong type in the requests of the staff: the answer is a phrase, never the text of a database error.
// The same for a student: security/student-reads.cy.js

import { account } from '../../../support/accounts';
import { administrationApi, infoApi, kontrolleApi } from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError, expectPhraseText } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import { dateParam } from '../../../support/anwDates';

describe('security: values of the wrong type from the staff', () => {
	const ctx = useAnwContext({ resets: [] });

	const lektor = () => account('LEKTOR');
	const full = () => account('FULL_ASSISTENZ');
	const ent = () => account('ENT_ASSISTENZ');
	const stg = () => [ctx.student.studiengangKz];
	const abwesend = id => [{ anwesenheit_user_id: id, status: ctx.config.abwesend_status }];

	// [the request, the account, the call, the phrase of the answer]
	[
		[
			'KontrolleApi::fetchAllAnwesenheitenByLvaAssigned with le_id "abc"',
			lektor,
			() => kontrolleApi.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, 'abc', lektor().username, lektor()),
			'notAuthorizedForLva',
		],
		[
			'KontrolleApi::fetchAllAnwesenheitenByLva with le_ids ["abc"]',
			lektor,
			() => kontrolleApi.fetchAllAnwesenheitenByLva(ctx.lvId, ctx.semKurzbz, ['abc'], lektor()),
			'notAuthorizedForLva',
		],
		[
			'KontrolleApi::getAllAnwesenheitenByStudentByLva with prestudent_id "abc"',
			lektor,
			() => kontrolleApi.getAllAnwesenheitenByStudentByLva('abc', ctx.lvId, ctx.semKurzbz, lektor()),
			'wrongParameters',
		],
		...[[], ['abc'], 'abc'].map(ids => [
			`KontrolleApi::getAnwQuoteForPrestudentIds with ids ${JSON.stringify(ids)}`,
			lektor,
			() => kontrolleApi.getAnwQuoteForPrestudentIds(ids, ctx.lvId, ctx.semKurzbz, lektor()),
			'wrongParameters',
		]),
		[
			'KontrolleApi::updateAnwesenheiten with le_id "abc"',
			lektor,
			() => kontrolleApi.updateAnwesenheiten('abc', abwesend(1), lektor()),
			'notAuthorizedForLe',
		],
		[
			'KontrolleApi::updateAnwesenheiten with anwesenheit_user_id "abc"',
			lektor,
			() => kontrolleApi.updateAnwesenheiten(ctx.le, abwesend('abc'), lektor()),
			'wrongParameters',
		],
		[
			'KontrolleApi::updateAnwesenheiten with a notiz that is a list',
			lektor,
			() => kontrolleApi.updateAnwesenheiten(ctx.le, [{ ...abwesend(1)[0], notiz: ['a'] }], lektor()),
			'wrongParameters',
		],
		[
			'KontrolleApi::regenerateQRCode with anwesenheit_id "abc"',
			lektor,
			() => kontrolleApi.regenerateQRCode('abc', lektor()),
			'errorKontrolleDoesNotExist',
		],
		[
			'KontrolleApi::pollAnwesenheiten with anwesenheit_id "abc"',
			lektor,
			() => kontrolleApi.pollAnwesenheiten('abc', ctx.lvId, lektor()),
			'notAuthorizedForLva',
		],
		[
			'KontrolleApi::deleteAnwesenheitskontrolle with anwesenheit_id "abc"',
			lektor,
			() => kontrolleApi.deleteAnwesenheitskontrolle(ctx.le, dateParam(ctx.today), 'abc', lektor()),
			'errorDeleteKontrolleKeineLEAnDatum',
		],
		[
			'InfoApi::getLektorsForLvaInSemester with lva_id "abc"',
			full,
			() => infoApi.getLektorsForLvaInSemester('abc', ctx.semKurzbz, full()),
			'wrongParameters',
		],
		[
			'InfoApi::getStudentsForLvaInSemester with lva_id "abc"',
			full,
			() => infoApi.getStudentsForLvaInSemester('abc', ctx.semKurzbz, full()),
			'wrongParameters',
		],
		['InfoApi::getStudiengaenge with allowed_stg ["x"]', ent, () => infoApi.getStudiengaenge(['x'], ent()), 'wrongParameters'],
		[
			'AdministrationApi::getOffeneTimespan with von "abc"',
			ent,
			() => administrationApi.getOffeneTimespan(stg(), 'abc', ctx.today, ent()),
			'wrongParameters',
		],
		[
			'AdministrationApi::getEntschuldigungen with von "abc"',
			ent,
			() => administrationApi.getEntschuldigungen(stg(), 'abc', ctx.today, false, ent()),
			'wrongParameters',
		],
		[
			'AdministrationApi::updateEntschuldigung with entschuldigung_id "abc"',
			ent,
			() => administrationApi.updateEntschuldigung('abc', true, '', ent()),
			'wrongParameters',
		],
		[
			'AdministrationApi::getTimeline with person_id "abc"',
			ent,
			() => administrationApi.getTimeline('abc', ent()),
			'noAuthorization',
		],
	].forEach(([label, as, call, phrase]) => {
		it(`${label} → ${phrase}, no database text`, () => {
			call().then(res => {
				expectNoDbText(res);
				expectPhraseError(res, `global/${phrase}`, as());
			});
		});
	});

	it('KontrolleApi::getExistingQRCode with le_id "abc" → noExistingKontrolleFound, no database text', () => {
		kontrolleApi.getExistingQRCode('abc', lektor()).then(res => {
			expectNoDbText(res);
			expectPhraseText(res, 'global/noExistingKontrolleFound', lektor());
		});
	});
});
