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
			codeMaxlength: 8
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

			Vue.$fhcapi.Anwesenheit.checkInAnwesenheit({zugangscode: this.internalZugangscode})

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

		<p>Hier könnte Zugangscode einlösen stehen {{ zugangscode }}</p>
		
		<template v-if=internalZugangscode>
			<template v-if="anwesenheitProcessing"> 
					<p> plz wait while processing the anwesenheit</p>
				</template>
				<template v-else-if="zugangscodeProcessed"> 
					<p> gz you are anwesend</p>
				</template>
		</template>
			
		<template v-else>
			<p>please enter Zugangscode</p>
			<input :maxlength="calculatedMaxLength" class="form-control" :value="internalZugangscode" @input="checkValue($event)" :placeholder="Zugangscode">

		</template>
		
	</div>
		
`
};


