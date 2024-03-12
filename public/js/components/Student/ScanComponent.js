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

			Vue.$fhcapi.Anwesenheit.checkInAnwesenheit({zugangscode: this.internalZugangscode}).then(
				res => {
					console.log('checkInAnwesenheit', res)
					if(res.status === 200 && !res.data.error && res.data.data) {

						this.$fhcAlert.alertSuccess("Anwesenheit checked.")

						this.entry = JSON.parse(res.data.data.anwesenheitEntry)
						this.entry.von = new Date(this.entry.von)
						this.entry.bis = new Date(this.entry.bis)

						this.viewData = JSON.parse(res.data.data.viewData).retval[0]

						this.zugangscodeProcessed = true
					} else {
						this.$fhcAlert.alertError(res.data.data)
						this.internalZugangscode = ''
					}
				}
			).catch(err => {
				console.log(err)
				this.$fhcAlert.alertError(err.response.data.errors[0].message)
			})

		},
		checkValue(event) {
			this.internalZugangscode = event.target.value
			this.codeButtonDisabled = !(this.internalZugangscode && this.internalZugangscode.length === this.codeMaxlength)

			console.log('checkValue', this.codeButtonDisabled)
			// const inputVal = event.target.value
			// if(inputVal.length === this.codeMaxlength) {
			// 	this.internalZugangscode = inputVal
				// this.processAnwesenheit()
			// }

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
				return "Anfrage erfolgreich!"
			} else return "Bitte Zugangscode eingeben."
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
								<input :maxlength="calculatedMaxLength" class="form-control" :value="internalZugangscode" @input="checkValue($event)" :placeholder="Zugangscode">
							</div>
						</div>
						<div class="row mt-3">
							<div class="col-md-12">
								<button @click="sendCode" role="button" class="btn btn-primary align-self-center" :disabled=codeButtonDisabled>
									Code senden
								</button>
							</div>
						</div>
					</template>
					<template v-else> 
						<div v-if="viewData">
							<div>
								<p>{{viewData.bezeichnung}} ({{viewData.kurzbz}})</p>
								<p>{{entry.von.toLocaleDateString()}}:  {{entry.von.toLocaleTimeString()}} - {{entry.bis.toLocaleTimeString()}}</p>
								<p>{{viewData.vorname}} {{viewData.nachname}} wurde registriert.</p>
							</div>
						</div>
					</template>
				</template>
			</core-base-layout>
		</div>
	</div>



	
		
`
};


