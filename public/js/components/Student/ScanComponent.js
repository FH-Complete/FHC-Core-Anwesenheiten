import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';

export default {
	name: 'ScanComponent',
	components: {
		CoreNavigationCmpt,
		CoreRESTClient
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			internalZugangscode: this.zugangscode,
			anwesenheitProcessing: true,
			zugangscodeProcessed: false,
			codeMaxlength: 8,
			lehreinheit: null
		};
	},
	props: {
		zugangscode: null
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		processAnwesenheit() {
			// TODO: send request to backend with code and enter anwesenheit for students LE
			// in backend do a bunch of checks to ensure validity of data

			Vue.$fhcapi.Anwesenheit.checkInAnwesenheit({zugangscode: this.internalZugangscode}).then(
				res => {
					this.anwesenheitProcessing = false
					console.log(res)

					if(res?.status === 200 && !res.data.error) {

						this.$fhcAlert.alertSuccess("Anwesenheit checked.")
						this.lehreinheit = JSON.parse(res.data.retval.lehreinheit)
						// TODO: show date/time/stunden && person data from return!

						this.zugangscodeProcessed = true
					} else {
						this.$fhcAlert.alertError(res.data.retval)
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
		}
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries">
	</core-navigation-cmpt>

	<div id="content">
		
		<template v-if=internalZugangscode>
			<template v-if="anwesenheitProcessing"> 
					<p> Anfrage wird bearbeitet. </p>
				</template>
				<template v-else-if="zugangscodeProcessed"> 
					<p> Glückwunsch, sie sind anwesend </p>
					<div v-if="lehreinheit">
						In Lehreinheit {{lehreinheit.lehreinheit_id}}
						In Lehrveranstaltung {{lehreinheit.lehrveranstaltung_id}}
						In Studiensemester {{lehreinheit.studiensemester_kurzbz}}
						etc.
					</div>
				</template>
		</template>
			
		<template v-else>
			<p>Bitte Zugangscode eingeben</p>
			<input :maxlength="calculatedMaxLength" class="form-control" :value="internalZugangscode" @input="checkValue($event)" :placeholder="Zugangscode">

		</template>
		
	</div>
		
`
};


