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
			entry: null
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
			// only exists so user switches focus from input field and changed event gets triggered when user copy pastes
			this.processAnwesenheit()
		},
		processAnwesenheit() {

			Vue.$fhcapi.Anwesenheit.checkInAnwesenheit({zugangscode: this.internalZugangscode}).then(
				res => {

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
				this.$fhcAlert.alertError("Something went terribly wrong.")
			})

		},
		checkValue(event) {
			const inputVal = event.target.value
			if(inputVal.length === this.codeMaxlength) {
				this.internalZugangscode = inputVal
				this.processAnwesenheit()
			}

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
		},
		getSendCodeButtonCondition() {
			return (this.internalZugangscode && this.internalZugangscode.length === this.codeMaxlength)
		}
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries">
	</core-navigation-cmpt>

	<div class="row-cols">
		<div class="row-col card card-body p-4 mt-3 text-center">
			<core-base-layout
				:title=getBaseLayoutTitle>
				<template #main>
					<template v-if="!zugangscodeProcessed">
						<div class="row">
							<div class="col-md-12">
								<input :maxlength="calculatedMaxLength" class="form-control" :value="internalZugangscode" @change="checkValue($event)" :placeholder="Zugangscode">
							</div>
							
<!--							TODO: maybe button for UX feel but input events should handle that all-->

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


