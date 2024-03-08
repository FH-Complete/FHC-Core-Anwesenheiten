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
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		>
	</core-navigation-cmpt>


	<div class="row-cols">
		<core-base-layout>	
			<template #main>
				<div class="row">
					<div class="col-8">
						<h1 class="h2 mb-5">Anwesenheitsverwaltung Student</h1>
					</div>
					<div class="col-4 text-center">
						<button type="button" class="btn btn-primary" @click="routeToCodeScan">Code eingeben</button>
					</div>
				</div>
				<core-tabs class="mb-5" :config="tabs"></core-tabs>
			</template>
		</core-base-layout>
		
	</div>
		
`
};


