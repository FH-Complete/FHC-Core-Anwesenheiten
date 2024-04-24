import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import ChartComponent from '../LandingPage/ChartComponent.js'

export default {
	name: 'LandingPageComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreRESTClient,
		ChartComponent
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			internalPermissions: JSON.parse(this.permissions),
			titleText: ''
		};
	},
	props: {
		permissions: null,
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		routeToStudent() {
			this.$router.push({
				name: 'Student'
			})
		},
		routeToLektor() {
			this.$router.push({
				name: 'Lektor'
			})
		},
		routeToAssistenz() {
			this.$router.push({
				name: 'Assistenz'
			})
		},
		routeToSetup() {
			this.$router.push({
				name: 'Setup'
			})
		},
		routeToLanding() {
			this.$router.push({
				name: 'LandingPage'
			})
		},
		async setupPhrasen() {
			await this._.root.appContext.config.globalProperties.$p.loadCategory('global')
			await this._.root.appContext.config.globalProperties.$p.loadCategory('ui')
			await this._.root.appContext.config.globalProperties.$p.loadCategory('person')
			await this._.root.appContext.config.globalProperties.$p.loadCategory('lehre')
			await this._.root.appContext.config.globalProperties.$p.loadCategory('table')
			await this._.root.appContext.config.globalProperties.$p.loadCategory('filter')

			this.titleText = this._.root.appContext.config.globalProperties.$p.t('global/digitalesAnwManagement')
		}
	},
	created() {
		this.setupPhrasen()
	},
	mounted() {
	},
	watch: {

	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>

	<core-base-layout
		:title=titleText >
		<template #main>
			<div class="row">
				<div class="col-2" v-if="internalPermissions.student || internalPermissions.admin">
					<button  class="btn btn-primary" @click="routeToStudent">Student</button>
				</div>
				<div class="col-2" v-if="internalPermissions.lektor || internalPermissions.admin">
					<button  class="btn btn-primary" @click="routeToLektor">Lektor</button>
				</div>
				<div class="col-2" v-if="internalPermissions.assistenz || internalPermissions.admin">
					<button  class="btn btn-primary" @click="routeToAssistenz">Assistenz</button>
				</div>
				<div class="col-2">
					<button  class="btn btn-primary" @click="routeToSetup">Setup</button>
				</div>
				
			</div>
			<ChartComponent></ChartComponent>
			
		</template>
	</core-base-layout>
`
};


