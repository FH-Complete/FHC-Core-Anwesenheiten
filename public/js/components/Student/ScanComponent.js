import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

export default {
	name: 'ScanComponent',
	components: {
		CoreNavigationCmpt,
		CoreBaseLayout,
		CoreRESTClient
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			internalZugangscode: this.zugangscode,
			zugangscodeProcessed: false,
			codeMaxlength: 8,
			viewData: null,
			entry: null,
			codeButtonDisabled: true
		};
	},
	props: {
		zugangscode: null
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		sendCode() {
			this.processAnwesenheit()
		},
		processAnwesenheit() {

			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/studentCheckInAnwesenheit',
				{zugangscode: this.internalZugangscode}
			).then(
				res => {
					console.log('checkInAnwesenheit', res)
					if(res.meta.status === "success" && res.data) {

						this.$fhcAlert.alertSuccess(this.$p.t('global/eintragErfolgreich'))

						this.entry = JSON.parse(res.data.anwesenheitEntry)
						this.entry.von = new Date(this.entry.von)
						this.entry.bis = new Date(this.entry.bis)

						this.viewData = JSON.parse(res.data.viewData).retval[0]

						this.zugangscodeProcessed = true
					} else {
						this.$fhcAlert.alertError(res.data.data)
						this.internalZugangscode = ''
					}
				}
			).catch(err => {
				this.$fhcAlert.alertError(err.message)
			})

		},
		checkValue(event) {
			this.internalZugangscode = event.target.value
			this.codeButtonDisabled = !(this.internalZugangscode && this.internalZugangscode.length === this.codeMaxlength)

			console.log('checkValue', this.codeButtonDisabled)
		}
	},
	mounted() {
		if(this.internalZugangscode) {
			this.processAnwesenheit()
		}
	},
	computed: {
		calculatedMaxLength() {
			return '' + this.codeMaxlength
		},
		getBaseLayoutTitle() {
			if (this.internalZugangscode && this.zugangscodeProcessed) {
				return this.$p.t('global/eintragErfolgreich')
			} else return this.$p.t('global/bitteZugangscodeEingeben')
		}
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>

	<div class="row-cols">
		<div class="row-col-4 mt-3 text-center">
			<core-base-layout
				:title=getBaseLayoutTitle>
				<template #main>
					<template v-if="!zugangscodeProcessed">
						<div class="row">
							<div class="col-sm-10 col-10 mx-auto">
								<input :maxlength="calculatedMaxLength" class="form-control" :value="internalZugangscode" @input="checkValue($event)" :placeholder=$p.t('global/code')>
							</div>
						</div>
						<div class="row mt-3">
							<div class="col-md-12">
								<button @click="sendCode" role="button" class="btn btn-primary align-self-center" :disabled=codeButtonDisabled>
									{{ $p.t('global/codeSenden') }}
								</button>
							</div>
						</div>
					</template>
					<template v-else> 
						<div v-if="viewData">
							<div>
								<p>{{viewData.bezeichnung}} ({{viewData.kurzbz}})</p>
								<p>{{entry.von.toLocaleDateString()}}:  {{entry.von.toLocaleTimeString()}} - {{entry.bis.toLocaleTimeString()}}</p>
								<p>{{viewData.vorname}} {{viewData.nachname}} {{$p.t('global/wurdeRegistriert')}}.</p>
							</div>
						</div>
					</template>
				</template>
			</core-base-layout>
		</div>
	</div>



	
		
`
};


