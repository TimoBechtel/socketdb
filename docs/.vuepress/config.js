const { description, name } = require('../../package');

module.exports = {
	/**
	 * Ref：https://v1.vuepress.vuejs.org/config/#title
	 */
	title: 'SocketDB',
	/**
	 * Ref：https://v1.vuepress.vuejs.org/config/#description
	 */
	description: description,
	base: '/socketdb/',

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
		domain: 'https://timobechtel.github.io/socketdb',
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
				{
					title: 'Advanced',
					children: ['persistence'],
				},
				{
					title: 'Extensions',
					children: ['plugins', 'custom-store'],
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
		'@vuepress/plugin-back-to-top',
		'@vuepress/plugin-medium-zoom',
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
