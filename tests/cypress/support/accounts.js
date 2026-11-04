// The accounts of the suite per role, from the ANW_* keys of suite.js

// the roles of suite.js, from its ANW_<ROLE>_USER keys
export const ROLES = Object.keys(Cypress.env())
	.map(key => /^ANW_(.+)_USER$/.exec(key))
	.filter(Boolean)
	.map(match => match[1]);

export const account = role => {
	const username = Cypress.env(`ANW_${role}_USER`);
	const password = Cypress.env(`ANW_${role}_PASSWORD`);
	if (!username || !password) {
		throw new Error(`ANW_${role}_USER / ANW_${role}_PASSWORD missing, see tests/cypress/.env.example`);
	}
	return { username, password };
};
