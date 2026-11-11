// KontrolleApi: the status of entries with updateAnwesenheiten

import { account } from '../../../support/accounts';
import { kontrolleApi } from '../../../support/anwApi';
import { expectNoDbText, expectPhraseError, requireFixture, skipIf } from '../../../support/anwChecks';
import { useAnwContext } from '../../../support/anwContext';
import {
	decide,
	entryById,
	entryOf,
	givenEntschuldigung,
	givenKontrolle,
	givenStatus,
	NOTIZ,
	readKontrolle,
} from '../../../support/anwScenario';

describe('KontrolleApi: change the status of entries', () => {
	const ctx = useAnwContext();

	const update = (entries, { le = ctx.le, as = account('LEKTOR') } = {}) =>
		kontrolleApi.updateAnwesenheiten(le, entries, as);

	it('anwesend → abwesend → saved, version + 1, a history row with anwesend', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			update([{ anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.abwesend_status }]).fhcData();

			entryById(kontrolle, entry.anwesenheit_user_id).then(changed => {
				expect(changed.status).to.eq(ctx.config.abwesend_status);
				expect(changed.version).to.eq(entry.version + 1);
			});
			cy.task('anw:db:readHistory', { anwesenheitUserIds: [entry.anwesenheit_user_id] })
				.then(history => history.map(row => row.status))
				.should('deep.equal', [ctx.config.anwesend_status]);
		});
	});

	it('status fehlminuten with 1 and with the counted duration − 1 → saved', () => {
		givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			const fehlminuten = ctx.config.fehlminuten_status;
			expect(kontrolle.dauer, 'counted minutes of 08:00 - 09:30').to.be.greaterThan(2);

			update([{ anwesenheit_user_id: id, status: fehlminuten, fehlminuten: 1 }]).fhcData();
			entryById(kontrolle, id).should('include', { status: fehlminuten, fehlminuten: 1 });

			const max = kontrolle.dauer - 1;
			update([{ anwesenheit_user_id: id, status: fehlminuten, fehlminuten: max }]).fhcData();
			entryById(kontrolle, id).should('include', { status: fehlminuten, fehlminuten: max });
		});
	});

	// a whole number from 1 to the counted duration − 1
	[
		['0', () => 0],
		['the counted duration', kontrolle => kontrolle.dauer],
		['"abc"', () => 'abc'],
		['-5', () => -5],
		['1.5', () => 1.5],
		['null', () => null],
		['an empty text', () => ''],
	].forEach(([label, value]) => {
		it(`status fehlminuten with ${label} → anwFehlminutenUngueltig, nothing saved`, () => {
			givenKontrolle(ctx, { von: '08:00', bis: '09:30' }).then(({ kontrolle, entries }) => {
				update([
					{
						anwesenheit_user_id: entries[0].anwesenheit_user_id,
						status: ctx.config.fehlminuten_status,
						fehlminuten: value(kontrolle),
					},
				]).then(res => expectPhraseError(res, 'global/anwFehlminutenUngueltig', account('LEKTOR')));
				readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
			});
		});
	});

	it('status fehlminuten with the text "15" → saved as the number 15', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			update([{ anwesenheit_user_id: id, status: ctx.config.fehlminuten_status, fehlminuten: '15' }]).fhcData();
			entryById(kontrolle, id).should('include', { status: ctx.config.fehlminuten_status, fehlminuten: 15 });
		});
	});

	it('status abwesend with 30 Fehlminuten in the request → saved abwesend, the Fehlminuten are 0', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			update([{ anwesenheit_user_id: id, status: ctx.config.abwesend_status, fehlminuten: 30 }]).fhcData();
			entryById(kontrolle, id).should('include', { status: ctx.config.abwesend_status, fehlminuten: 0 });
		});
	});

	it('status fehlminuten → anwesend → the Fehlminuten are 0', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			update([{ anwesenheit_user_id: id, status: ctx.config.fehlminuten_status, fehlminuten: 30 }]).fhcData();
			update([{ anwesenheit_user_id: id, status: ctx.config.anwesend_status }]).fhcData();

			entryById(kontrolle, id).should('include', { status: ctx.config.anwesend_status, fehlminuten: 0 });
		});
	});

	it('an entry of the LE of LEKTOR2 in the list → notAuthorizedForLe, nothing saved', () => {
		givenKontrolle(ctx).then(own => {
			givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(foreign => {
				update([
					{ anwesenheit_user_id: own.entries[0].anwesenheit_user_id, status: ctx.config.abwesend_status },
					{ anwesenheit_user_id: foreign.entries[0].anwesenheit_user_id, status: ctx.config.abwesend_status },
				]).then(res => expectPhraseError(res, 'global/notAuthorizedForLe', account('LEKTOR')));

				readKontrolle(own.kontrolle.anwesenheit_id).its('entries').should('deep.equal', own.entries);
				readKontrolle(foreign.kontrolle.anwesenheit_id).its('entries').should('deep.equal', foreign.entries);
			});
		});
	});

	it('an entry without anwesenheit_user_id → wrongParameters, nothing saved', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			update([{ status: ctx.config.abwesend_status }]).then(res =>
				expectPhraseError(res, 'global/wrongParameters', account('LEKTOR')),
			);
			readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
		});
	});

	it('LEKTOR sets entschuldigt → noAuthorization, nothing saved', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			update([{ anwesenheit_user_id: entries[0].anwesenheit_user_id, status: ctx.config.entschuldigt_status }]).then(res =>
				expectPhraseError(res, 'global/noAuthorization', account('LEKTOR')),
			);
			readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
		});
	});

	it('FULL_ASSISTENZ sets entschuldigt → saved', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			update([{ anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.entschuldigt_status }], {
				as: account('FULL_ASSISTENZ'),
			}).fhcData();
			entryById(kontrolle, entry.anwesenheit_user_id).its('status').should('eq', ctx.config.entschuldigt_status);
		});
	});

	it('LEKTOR saves a list with an entry that is entschuldigt already → saved, the entry stays entschuldigt', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			requireFixture(entries.length >= 2, 'two students in the test LE');
			const [kept, changed] = entries;
			update([{ anwesenheit_user_id: kept.anwesenheit_user_id, status: ctx.config.entschuldigt_status }], {
				as: account('FULL_ASSISTENZ'),
			}).fhcData();

			update([
				{ anwesenheit_user_id: kept.anwesenheit_user_id, status: ctx.config.entschuldigt_status },
				{ anwesenheit_user_id: changed.anwesenheit_user_id, status: ctx.config.abwesend_status },
			]).fhcData();

			entryById(kontrolle, kept.anwesenheit_user_id).its('status').should('eq', ctx.config.entschuldigt_status);
			entryById(kontrolle, changed.anwesenheit_user_id).its('status').should('eq', ctx.config.abwesend_status);
		});
	});

	it('a valid entry and an entry with an unknown status → wrongParameters, nothing saved, no history row', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			requireFixture(entries.length >= 2, 'two students in the test LE');
			update([
				{ anwesenheit_user_id: entries[0].anwesenheit_user_id, status: ctx.config.abwesend_status },
				{ anwesenheit_user_id: entries[1].anwesenheit_user_id, status: 'gelangweilt' },
			]).then(res => expectPhraseError(res, 'global/wrongParameters', account('LEKTOR')));

			readKontrolle(kontrolle.anwesenheit_id).then(state => {
				expect(state.entries).to.deep.equal(entries);
				expect(state.history).to.eq(0);
			});
		});
	});

	it('a notiz → saved, the lektor table shows it', () => {
		givenKontrolle(ctx).then(({ entries: [entry] }) => {
			const withNote = { anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.anwesend_status, notiz: 'kam später' };
			update([withNote]).fhcData();

			kontrolleApi
				.fetchAllAnwesenheitenByLvaAssigned(ctx.lvId, ctx.semKurzbz, ctx.le, account('LEKTOR').username, account('LEKTOR'))
				.fhcData()
				.then(({ anwEntries }) => {
					const row = anwEntries.find(e => e.anwesenheit_user_id === entry.anwesenheit_user_id);
					expect(row, 'the entry in the lektor table').to.exist;
					expect(row.notiz).to.eq('kam später');
				});
		});
	});

	it('a notiz with 300 characters → saved with 255, no database text', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			update([{ anwesenheit_user_id: id, status: ctx.config.anwesend_status, notiz: 'x'.repeat(300) }]).then(res => {
				expectNoDbText(res);
				cy.wrap(res).fhcData();
			});
			entryById(kontrolle, id).its('notiz').should('have.length', 255);
		});
	});

	// the server saves the entries in the order of the list
	it('one entry two times in a list with a different status → the last status wins', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			update([
				{ anwesenheit_user_id: id, status: ctx.config.abwesend_status },
				{ anwesenheit_user_id: id, status: ctx.config.fehlminuten_status, fehlminuten: 10 },
			]).fhcData();
			entryById(kontrolle, id).should('include', { status: ctx.config.fehlminuten_status, fehlminuten: 10 });
		});
	});

	it('a second change → the history row holds the status, the Fehlminuten, the notiz and the version before it', () => {
		givenKontrolle(ctx).then(({ entries: [entry] }) => {
			const id = entry.anwesenheit_user_id;
			update([{ anwesenheit_user_id: id, status: ctx.config.fehlminuten_status, fehlminuten: 20, notiz: NOTIZ }]).fhcData();
			update([{ anwesenheit_user_id: id, status: ctx.config.abwesend_status, notiz: 'ging früher' }]).fhcData();

			cy.task('anw:db:readHistory', { anwesenheitUserIds: [id] }).then(history => {
				expect(history).to.have.length(2);
				expect(history[1]).to.include({
					status: ctx.config.fehlminuten_status,
					fehlminuten: 20,
					notiz: NOTIZ,
					version: entry.version + 1,
				});
			});
		});
	});

	it('LEKTOR changes the status in a Kontrolle of FULL_ASSISTENZ → updatevon and statussetvon are LEKTOR', () => {
		givenKontrolle(ctx, { as: account('FULL_ASSISTENZ') }).then(({ kontrolle, entries: [entry] }) => {
			update([{ anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.abwesend_status }]).fhcData();

			const lektor = account('LEKTOR').username.toLowerCase();
			entryById(kontrolle, entry.anwesenheit_user_id).should('include', { updatevon: lektor, statussetvon: lektor });
		});
	});

	describe('an entry that is entschuldigt: only the admin of the LV changes it', () => {
		const noAuthorization = res => expectPhraseError(res, 'global/noAuthorization', account('LEKTOR'));

		// a Kontrolle with the entry of the test student entschuldigt. Yields { kontrolle, entries, id (of that entry) }
		const withId = state => ({ ...state, id: entryOf(state, ctx.student).anwesenheit_user_id });

		const byEntschuldigung = () =>
			givenEntschuldigung(ctx.student, { von: `${ctx.today} 07:00:00`, bis: `${ctx.today} 12:00:00` })
				.then(({ entschuldigung }) => decide(entschuldigung.entschuldigung_id, true))
				.then(() => givenKontrolle(ctx))
				.then(withId);

		const byHand = () =>
			givenKontrolle(ctx)
				.then(withId)
				.then(({ kontrolle, id }) =>
					givenStatus(ctx, [{ anwesenheit_user_id: id, status: ctx.config.entschuldigt_status }], {
						as: account('FULL_ASSISTENZ'),
					}).then(() => readKontrolle(kontrolle.anwesenheit_id)),
				)
				.then(withId);

		[
			['an accepted Entschuldigung', byEntschuldigung],
			['FULL_ASSISTENZ by hand', byHand],
		].forEach(([label, given]) => {
			it(`LEKTOR sets abwesend, anwesend or Fehlminuten, entschuldigt by ${label} → noAuthorization, nothing saved`, function () {
				skipIf(this, !ctx.config.entschuldigungen_enabled && given === byEntschuldigung, 'ENTSCHULDIGUNGEN_ENABLED is off');

				given().then(({ kontrolle, entries, id }) => {
					expect(entries.find(e => e.anwesenheit_user_id === id).status).to.eq(ctx.config.entschuldigt_status);

					[
						{ status: ctx.config.abwesend_status },
						{ status: ctx.config.anwesend_status },
						{ status: ctx.config.fehlminuten_status, fehlminuten: 10 },
					].forEach(change => update([{ anwesenheit_user_id: id, ...change }]).then(noAuthorization));

					readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
				});
			});
		});

		it('LEKTOR, a list with that entry and a valid change of another entry → noAuthorization, nothing of the list saved', () => {
			byHand().then(({ kontrolle, entries, id }) => {
				const other = entries.find(e => e.anwesenheit_user_id !== id);
				requireFixture(other, 'two students in the test LE');

				update([
					{ anwesenheit_user_id: other.anwesenheit_user_id, status: ctx.config.abwesend_status },
					{ anwesenheit_user_id: id, status: ctx.config.abwesend_status },
				]).then(noAuthorization);

				readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
			});
		});

		it('LEKTOR keeps entschuldigt and sends a new notiz → saved, the notiz changes', () => {
			byHand().then(({ kontrolle, id }) => {
				update([{ anwesenheit_user_id: id, status: ctx.config.entschuldigt_status, notiz: NOTIZ }]).fhcData();
				entryById(kontrolle, id).should('include', { status: ctx.config.entschuldigt_status, notiz: NOTIZ });
			});
		});

		it('FULL_ASSISTENZ sets abwesend → saved', () => {
			byHand().then(({ kontrolle, id }) => {
				update([{ anwesenheit_user_id: id, status: ctx.config.abwesend_status }], { as: account('FULL_ASSISTENZ') }).fhcData();
				entryById(kontrolle, id).its('status').should('eq', ctx.config.abwesend_status);
			});
		});
	});

	it('FULL_ASSISTENZ, an entry of the LE of LEKTOR2 → saved', () => {
		givenKontrolle(ctx, { le: ctx.foreignLe, as: account('FULL_ASSISTENZ') }).then(({ kontrolle, entries: [entry] }) => {
			update([{ anwesenheit_user_id: entry.anwesenheit_user_id, status: ctx.config.abwesend_status }], {
				le: ctx.foreignLe,
				as: account('FULL_ASSISTENZ'),
			}).fhcData();
			entryById(kontrolle, entry.anwesenheit_user_id).its('status').should('eq', ctx.config.abwesend_status);
		});
	});

	it('an empty list → success, nothing changed', () => {
		givenKontrolle(ctx).then(({ kontrolle, entries }) => {
			update([]).fhcData().should('deep.equal', []);
			readKontrolle(kontrolle.anwesenheit_id).its('entries').should('deep.equal', entries);
		});
	});
});
