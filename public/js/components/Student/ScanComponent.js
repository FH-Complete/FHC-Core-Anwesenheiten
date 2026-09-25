import ApiProfil from '../../api/factory/profil.js';

export default {
	name: 'ScanComponent',
	data: function() {
		return {
			internalZugangscode: this.zugangscode,
			zugangscodeProcessed: false,
			codeMaxlength: 8,
			viewData: null,
			von: null,
			bis: null,
			codeButtonDisabled: true
		};
	},
	props: {
		zugangscode: null,
		// the extension shows the scan as a page of its own (route 'Scan'), the dashboard
		// widget embeds it. Only the page can lead back into the extension
		standalone: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		sendCode() {
			this.processAnwesenheit()
		},
		processAnwesenheit() {

			this.$api.call(ApiProfil.checkInAnwesenheit(this.internalZugangscode))
				.then(
				res => {
					if(res.meta.status === "success" && res.data) {

						this.$fhcAlert.alertSuccess(this.$p.t('global/eintragErfolgreich'))

						this.von = this.parseDate(JSON.parse(res.data.von))
						this.bis = this.parseDate(JSON.parse(res.data.bis))

						this.viewData = JSON.parse(res.data.viewData).retval[0]

						this.zugangscodeProcessed = true
					} else {
						this.$fhcAlert.alertError(res.data.data)
						this.internalZugangscode = ''
					}
				}
			)

		},
		checkValue(event) {
			this.internalZugangscode = event.target.value
			this.codeButtonDisabled = !(this.internalZugangscode && this.internalZugangscode.length === this.codeMaxlength)
		},
		// older safari versions only parse the iso form '2026-03-01T08:00:00' of a postgres timestamp
		parseDate(value) {
			const date = new Date(value)
			if (!isNaN(date)) return date

			return new Date(String(value).replace(' ', 'T'))
		},
		formatClock(date) {
			return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
		},
		goBack() {
			this.$router.back()
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
		},
		// vue router keeps the previous page of the app in the history state. A scanned qr code
		// opens the scan page directly, then there is no page of the extension to go back to
		showBackButton() {
			return this.standalone && !!this.$router?.options.history.state?.back
		},
		titleTag() {
			return this.standalone ? 'h1' : 'div'
		}
	},
	template: `
	<div class="anw-scan" :class="{'anw-scan--page': standalone}">
		<div v-if="showBackButton" class="anw-scan-back">
			<button type="button" class="btn btn-outline-secondary" @click="goBack">
				<i class="fa-solid fa-arrow-left me-2" aria-hidden="true"></i>{{ $p.t('global/zurueck') }}
			</button>
		</div>

		<div class="anw-scan-body">
			<template v-if="!zugangscodeProcessed">
				<i class="fa-solid fa-qrcode anw-scan-icon" aria-hidden="true"></i>
				<component :is="titleTag" class="anw-scan-title">{{ getBaseLayoutTitle }}</component>
				<form class="anw-scan-form" @submit.prevent="sendCode">
					<input
						:maxlength="calculatedMaxLength"
						class="form-control anw-scan-input"
						:value="internalZugangscode"
						@input="checkValue($event)"
						:placeholder="$p.t('global/code')"
						:aria-label="$p.t('global/code')"
						autocomplete="off"
						autocapitalize="off"
						autocorrect="off"
						spellcheck="false"
					>
					<button type="submit" class="btn btn-primary" :disabled=codeButtonDisabled>
						{{ $p.t('global/codeSenden') }}
					</button>
				</form>
			</template>
			<div v-else-if="viewData" class="anw-scan-success" role="status">
				<i class="fa-solid fa-circle-check anw-scan-icon anw-scan-icon--success" aria-hidden="true"></i>
				<component :is="titleTag" class="anw-scan-title">{{ getBaseLayoutTitle }}</component>
				<p class="anw-scan-lv">{{viewData.bezeichnung}} ({{viewData.kurzbz}})</p>
				<p>{{von.toLocaleDateString()}}: {{formatClock(von)}} - {{formatClock(bis)}}</p>
				<p class="mb-0">{{viewData.vorname}} {{viewData.nachname}} {{$p.t('global/wurdeRegistriert')}}.</p>
			</div>
		</div>
	</div>
`
};
