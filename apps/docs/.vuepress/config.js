const { description, name } = require('../../../package.json');

module.exports = {
	/**
	 * Ref：https://v1.vuepress.vuejs.org/config/#title
	 */
	title: 'SocketDB',
	/**
	 * Ref：https://v1.vuepress.vuejs.org/config/#description
	 */
	description: description,
	base: '/',

	/**
	 * Extra tags to be injected to the page HTML `<head>`
	 *
	 * ref：https://v1.vuepress.vuejs.org/config/#head
	 */
	head: [
		['meta', { name: 'theme-color', content: '#FF5F5F' }],
		['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
		[
			'meta',
			{ name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
		],
		[
			'link',
			{
				rel: 'apple-touch-icon',
				href: '/apple-touch-icon.png',
			},
		],
		[
			'link',
			{
				rel: 'icon',
				type: 'image/png',
				href: '/logo.png',
			},
		],
		[
			'link',
			{
				rel: 'manifest',
				href: '/manifest.json',
			},
		],
	],

	/**
	 * Theme configuration, here is the default theme configuration for VuePress.
	 *
	 * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
	 */
	themeConfig: {
		author: 'Timo Bechtel',
		domain: 'https://socketdb.com',
		repo: 'https://github.com/TimoBechtel/socketdb',
		editLinks: true,
		docsDir: 'docs',
		docsBranch: 'main',
		editLinkText: '',
		lastUpdated: true,
		logo: '/logo.png',
		nav: [
			{
				text: 'Guide',
				link: '/guide/',
			},
			{
				text: 'API',
				link: '/api/',
			},
			{
				text: 'Twitter',
				link: 'https://twitter.com/TimoBechtel',
			},
		],
		sidebar: {
			'/guide/': [
				{
					title: 'Guide',
					collapsable: false,
					children: ['', 'quick-start', 'client', 'server'],
				},
				'plugins',
				{
					title: 'Extending SocketDB',
					children: [
						'create-plugins',
						'custom-store',
						'custom-server-implementation',
					],
					collapsable: true,
				},
				{
					title: 'Advanced',
					children: ['persistence'],
					collapsable: true,
				},
				{
					title: 'Migration Guides',
					children: ['migration-guides/v3-to-v4'],
					collapsable: false,
				},
			],
			'/api/': [
				{
					title: 'API',
					collapsable: false,
					children: ['client', 'server'],
				},
			],
		},
	},

	/**
	 * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
	 */
	plugins: [
		[
			'vuepress-plugin-seo',
			{
				twitterCard: (_) => 'summary',
			},
		],
		[
			'vuepress-plugin-one-click-copy',
			{
				copyMessage: 'Copied to clipboard',
				duration: 800,
			},
		],
		'vuepress-plugin-check-md',
	],
};
