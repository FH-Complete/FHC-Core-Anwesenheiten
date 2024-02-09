import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';

export default {
	name: 'StudentComponent',
	components: {
		CoreNavigationCmpt,
		CoreFilterCmpt,
		CoreRESTClient
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
		};
	},
	methods: {

	},
	mounted() {

	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries">
	</core-navigation-cmpt>

	<div id="content">
		<p>Hier könnte Assistenz Component stehen</p>
	</div>
		
`
};


