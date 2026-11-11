// Error checks and skips of the suite

/**
 * Checks an error response by its phrase. The extension API sends the translated phrase as message. The text comes
 * from the phrase API in the language of the same account; a placeholder like {max} matches any value.
 * key: 'category/phrase'
 */
export const expectPhraseError = (response, key, account, status = 500) =>
	cy
		.wrap(response, { log: false })
		.fhcErrors(status)
		.then(errors =>
			phrasePattern(key, account).then(pattern => {
				const messages = errors.map(error => error.message);
				expect(messages, `${key}, got ${JSON.stringify(messages)}`).to.satisfy(all => all.some(m => pattern.test(m)));
			}),
		);

/** Checks a success response whose data is the text of a phrase */
export const expectPhraseText = (response, key, account) =>
	cy
		.wrap(response, { log: false })
		.fhcData()
		.then(text => phrasePattern(key, account).then(pattern => expect(text, key).to.match(pattern)));

// the phrases per account and category: the language of the account decides the text. One request per spec file
const phraseCache = new Map();

const loadPhrases = (category, account) => {
	const cacheKey = `${account ? account.username : ''}|${category}`;
	if (phraseCache.has(cacheKey)) return cy.wrap(phraseCache.get(cacheKey), { log: false });

	return cy
		.fhcGet(`api/frontend/v1/Phrasen/loadModule/${category}`, undefined, account)
		.fhcData()
		.then(phrases => {
			phraseCache.set(cacheKey, phrases || []);
			return phrases || [];
		});
};

/** The text of a phrase in the language of the account, with its {placeholders}. key: 'category/phrase' */
export const phraseText = (key, account) => {
	const [category, phrase] = key.split('/');

	return loadPhrases(category, account).then(phrases => {
		const found = (phrases || []).find(p => p.category === category && p.phrase === phrase);
		expect(found, `phrase ${key}`).to.exist;
		return found.text;
	});
};

const phrasePattern = (key, account) =>
	phraseText(key, account).then(text => {
		const parts = text.split(/\{\w+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		return new RegExp(`^${parts.join('[\\s\\S]+')}$`);
	});

// the text of a database error or of a PHP error that the client must never get. A test instance in development
// mode sends both: a production instance hides them, so a test that passes there can still fail here
const DB_TEXT = new RegExp(
	[
		'SQLSTATE|ERROR:\\s|invalid input syntax|syntax error at|pg_query|Severity:|A Database Error Occurred',
		'A PHP Error was encountered|Undefined (property|index|variable|offset)|"type":"php"',
	].join('|'),
	'i',
);

/** Checks that a response holds no text of a database error or of a PHP error */
export const expectNoDbText = response =>
	expect(JSON.stringify(response.body ?? ''), 'database or PHP error text in the response').to.not.match(DB_TEXT);

/**
 * A precondition of the test data that checks.js checks too. It fails the test instead of a skip: a broken seed shows
 * as a failure, not as a green run with more skips
 */
export const requireFixture = (value, what) => expect(value, `fixture: ${what}, see checks.js`).to.be.ok;

/** The only way to skip: call it in a test written as function () {}, the message names the reason */
export const skipIf = (test, condition, reason) => {
	if (!condition) return;
	Cypress.log({ name: 'skip', message: reason });
	test.skip();
};
