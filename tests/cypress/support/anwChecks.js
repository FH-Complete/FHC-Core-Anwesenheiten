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

const phrasePattern = (key, account) => {
	const [category, phrase] = key.split('/');

	return cy
		.fhcGet(`api/frontend/v1/Phrasen/loadModule/${category}`, undefined, account)
		.fhcData()
		.then(phrases => {
			const found = (phrases || []).find(p => p.category === category && p.phrase === phrase);
			expect(found, `phrase ${key}`).to.exist;

			const parts = found.text.split(/\{\w+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
			return new RegExp(`^${parts.join('[\\s\\S]+')}$`);
		});
};

/** The only way to skip: call it in a test written as function () {}, the message names the reason */
export const skipIf = (test, condition, reason) => {
	if (!condition) return;
	Cypress.log({ name: 'skip', message: reason });
	test.skip();
};
