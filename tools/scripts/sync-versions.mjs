/**
 * sync individual version numbers in the package.json files with the root package.json
 *
 * This is required to run before building individual packages in order to ensure that
 * the version numbers for the dependencies in the individual packages are correct. (e.g. "@socketdb/core": "^4.0.0")
 *
 * Otherwise dependency versions will always be 0.0.0 resulting in a broken build.
 */

import chalk from 'chalk';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function invariant(condition, message) {
	if (!condition) {
		console.error(chalk.bold.red(message));
		process.exit(1);
	}
}

const rootPackageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = rootPackageJson.version;

// A simple SemVer validation to validate the version
const validVersion = /^\d+\.\d+\.\d+(-\w+\.\d+)?/;
invariant(
	version && validVersion.test(version),
	`No version provided or version did not match Semantic Versioning, expected: #.#.#-tag.# or #.#.#, got ${version}.`
);

const packagesRoot = join(process.cwd(), 'packages');
const packages = readdirSync('packages');

packages.forEach((packageDir) => {
	const path = join(packagesRoot, packageDir);

	process.chdir(path);

	// Updating the version in "package.json"
	try {
		const json = JSON.parse(readFileSync(`package.json`).toString());
		json.version = version;
		writeFileSync(`package.json`, JSON.stringify(json, null, 2));
	} catch (e) {
		console.log(
			chalk(
				`Project "${packageDir}" does not have a "package.json" file. Skipping...`
			)
		);
	}
});
