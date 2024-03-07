import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import CoreTabs from '../../../../../js/components/Tabs.js';

export default {
	name: 'StudentComponent',
	components: {
		CoreNavigationCmpt,
		CoreBaseLayout,
		CoreTabs
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			tabs: {
				tab1: { title: 'Anwesenheiten', component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentAnwesenheitComponent.js'},
				tab2: { title: 'Entschuldigungen', component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentEntschuldigungComponent.js'}
			}
		};
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		routeToCodeScan() {
			this.$router.push({
				name: 'Scan'
			})
		}
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries">
	</core-navigation-cmpt>


	<div class="row-cols">
		<div class="row">
			<div class="col-8">
				<h4>Anwesenheitsverwaltung Student</h4>
			</div>
			<div class="col-4">
				<button type="button" class="btn btn-primary" @click="routeToCodeScan">Code eingeben</button>
			</div>
		</div>
		
		<div class="row-col card card-body mt-3">
			<core-base-layout>	
				<template #main>
					<!-- Core Tabs-->
					<core-tabs class="mb-5" :config="tabs"></core-tabs>
				</template>
			</core-base-layout>
		</div>
		<!-- Code Documentation -->
		<doc-layout-base-tabs></doc-layout-base-tabs>
	</div>
		
`
};


