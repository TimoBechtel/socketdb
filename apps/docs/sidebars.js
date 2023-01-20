/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
	guideSidebar: [
		{
			type: 'category',
			label: 'Guide',
			items: [
				'guide/README',
				'guide/quick-start',
				'guide/client',
				'guide/server',
			],
		},
		'guide/plugins',
		{
			type: 'category',
			label: 'Extending SocketDB',
			items: [
				'guide/create-plugins',
				'guide/custom-store',
				'guide/custom-server-implementation',
			],
		},
		{
			type: 'category',
			label: 'Advanced',
			items: ['guide/persistence'],
		},
		{
			type: 'category',
			label: 'Migration Guides',
			items: [
				'guide/migration-guides/v3-to-v4',
				'guide/migration-guides/v4-to-v5',
			],
		},
	],
	apiSidebar: [{ type: 'autogenerated', dirName: 'api' }],
};

module.exports = sidebars;
