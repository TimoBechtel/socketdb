const fs = require('fs');
const path = require('path');
const apps = fs.readdirSync(path.resolve(__dirname, 'apps'));
const libs = fs.readdirSync(path.resolve(__dirname, 'packages'));

/** @type {import('cz-git').UserConfig} */
module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'scope-enum': [2, 'always', [...apps, ...libs]],
	},
	prompt: {
		defaultScope: '',
		emptyScopesAlias: '-- empty --',
		customScopesAlign: 'top',
		customScopesAlias: '-- other --',
		scopes: [...apps, ...libs],
		// allow custom scopes to be able to use multiple
		allowCustomScopes: true,
		confirmColorize: true,
		markBreakingChangeMode: true,
		allowBreakingChanges: ['feat', 'fix', 'refactor'],
	},
};
