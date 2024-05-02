import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import ChartComponent from '../LandingPage/ChartComponent.js'

import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown";

export default {
	name: 'LandingPageComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreRESTClient,
		ChartComponent,
		BsModal,
		LehreinheitenDropdown
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			internalPermissions: JSON.parse(this.permissions),
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
		async routeToLektor() {
			await this.$entryParams.lePromise
			await this.$entryParams.phrasenPromise

			if(!this.$entryParams.selected_le_id && !this.$entryParams.available_le_ids.length) {
				// NO LE => NO KONTROLLE
				this.$fhcAlert.alertError(this.$p.t('global/keineAnwkontrolleMöglichWeilLEFehlt'))
				return
			} else if (this.$entryParams.selected_le_id && this.$entryParams.available_le_ids.length > 1) {
				// MULTIPLE LE SHOW SELECTION MODAL
				this.$refs.modalContainerLESelect.show()
				return
			} else {
				// ONE LE
				this.$router.push({
					name: 'Lektor'
				})
			}
		},
		routeToAssistenz() {
			this.$router.push({
				name: 'Assistenz'
			})
		},
		loadLE() {
			this.$refs.modalContainerLESelect.hide()
			this.$router.push({
				name: 'Lektor'
			})
		}
	},
	created() {
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
		:title="$p.t('global/digitalesAnwManagement')" >
		<template #main>
			<bs-modal ref="modalContainerLESelect" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>{{ $p.t('global/lehreinheitConfig') }}</template>
				<template v-slot:default>
					<LehreinheitenDropdown id="lehreinheit">
					</LehreinheitenDropdown>
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-primary" :disabled="$entryParams.selected_le_id === null" @click="loadLE"> Lehreinheit laden </button>
				</template>
			</bs-modal>
		
			<div style="margin-bottom: 12px;">
				<div class="col-sm-10 col-10 mx-auto">
					<div class="row" v-if="internalPermissions.lektor || internalPermissions.admin">
						<button  class="btn btn-primary btn-block btn-lg" @click="routeToLektor">Anwesenheiten verwalten</button>
					</div>
					<div class="row" v-if="internalPermissions.student || internalPermissions.admin">
						<button  class="btn btn-primary btn-block btn-lg" @click="routeToStudent">Anwesenheiten verwalten</button>
					</div>
				</div>
			</div>
			<div class="col-2" v-if="internalPermissions.assistenz || internalPermissions.admin">
				<button  class="btn btn-primary" @click="routeToAssistenz">Assistenz</button>
			</div>
			
			
			<ChartComponent></ChartComponent>
			
		</template>
	</core-base-layout>
`
};


