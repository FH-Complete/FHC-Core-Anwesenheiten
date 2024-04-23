import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {StudiensemesterDropdown} from "../Student/StudiensemesterDropdown";
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown";

export default {
	name: 'SetupComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreFilterCmpt,
		CoreRESTClient,
		StudiensemesterDropdown,
		LehreinheitenDropdown
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
		},
		ssChangedHandler(e){
			console.log('ssChangedHandler Setup', e)
		},
		routeToLandingPage() {
			this.$router.push({
				name: 'LandingPage'
			})
		},
	},
	mounted() {

	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>

	<core-base-layout
		title="Setup">
		<template #main>
			<div class="row">
				<div class="col-2"><StudiensemesterDropdown @ssChanged="ssChangedHandler" id="studiensemester"></StudiensemesterDropdown></div>
			</div>
				<div class="col-6">
					<LehreinheitenDropdown id="lehreinheit">
					</LehreinheitenDropdown>
				</div>
				<div class="col-2">
					<button  class="btn btn-primary" @click="routeToLandingPage">Landing Page</button>
				</div>
		</template>
	</core-base-layout>
`
};


