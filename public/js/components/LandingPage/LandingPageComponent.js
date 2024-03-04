import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

export default {
	name: 'LandingPageComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreRESTClient,
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
		};
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		}
	},
	mounted() {

	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries">
	</core-navigation-cmpt>

	<core-base-layout
		title="Anwesenheiten"
		mainCols="8"
		asideCols="4">
		<template #main>
			
		</template>
		<template #aside>
				
		</template>
	</core-base-layout>
`
};


