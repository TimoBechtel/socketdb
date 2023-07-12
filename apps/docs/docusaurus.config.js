// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/palenight');
const darkCodeTheme = require('prism-react-renderer/themes/palenight');

const { npm2yarn2pnpm } = require('@sapphire/docusaurus-plugin-npm2yarn2pnpm');

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'SocketDB',
	tagline: 'Easy to use data storage that syncs across browsers in realtime.',
	url: 'https://socketdb.com',
	baseUrl: '/',
	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',
	favicon: 'logo.png',
	organizationName: 'TimoBechtel', // Usually your GitHub org/user name.
	projectName: 'socketdb', // Usually your repo name.

	plugins: [
		[
			'docusaurus-plugin-typedoc',
			{
				entryPoints: ['./packages/*'],
				entryPointStrategy: 'packages',
				readme: 'none',
			},
		],
	],

	presets: [
		[
			'@docusaurus/preset-classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					routeBasePath: '/',
					sidebarPath: require.resolve('./sidebars.js'),
					editUrl:
						'https://github.com/TimoBechtel/socketdb/edit/main/apps/docs',
					remarkPlugins: [[npm2yarn2pnpm, { sync: true }]],
				},
				pages: {
					remarkPlugins: [[npm2yarn2pnpm, { sync: true }]],
				},
				blog: false,
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
			}),
		],
	],
	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			navbar: {
				title: 'SocketDB',
				logo: {
					alt: 'SocketDB Logo',
					src: 'logo.png',
				},
				items: [
					{
						type: 'doc',
						docId: 'guide/README',
						position: 'left',
						label: 'Guide',
					},
					{
						to: '/api',
						position: 'left',
						label: 'API Reference',
					},
					{
						href: 'https://twitter.com/TimoBechtel',
						label: 'Twitter',
						position: 'right',
					},
					{
						href: 'https://github.com/TimoBechtel/socketdb',
						label: 'GitHub',
						position: 'right',
					},
				],
			},
			footer: {
				style: 'light',
				links: [],
				copyright: `MIT Licensed | Copyright © ${new Date().getFullYear()} | Build with ❤️ by Timo Bechtel`,
			},
			prism: {
				theme: lightCodeTheme,
				darkTheme: darkCodeTheme,
			},
		}),
};

module.exports = config;
