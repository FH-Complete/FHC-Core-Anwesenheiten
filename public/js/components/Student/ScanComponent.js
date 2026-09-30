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
		},
		// inline styles: the dashboard does not load the extension css. The page gets a card
		// frame and bigger icon and title, the widget stays compact
		bodyStyle() {
			return this.standalone ? {
				padding: '2rem 1.5rem',
				border: '1px solid var(--bs-border-color, #dee2e6)',
				borderRadius: '0.5rem',
				backgroundColor: 'var(--bs-body-bg, #fff)',
				boxShadow: '0 0.125rem 0.5rem rgba(0, 0, 0, 0.06)'
			} : {}
		},
		// the icon colors reach 3:1 on the light and the dark background, --fhc-primary only 2.3:1 on the dark one
		iconStyle() {
			return {
				marginBottom: '0.75rem',
				color: 'var(--fhc-primary-highlight, #0086cb)',
				fontSize: this.standalone ? '3rem' : '2rem'
			}
		},
		titleStyle() {
			return {
				fontSize: this.standalone ? '1.5rem' : '1.125rem',
				fontWeight: 600
			}
		},
		// the code is short and random, a monospace font makes it easy to compare with the
		// projector. The empty input keeps the normal font for the placeholder
		inputStyle() {
			return this.internalZugangscode ? {
				fontFamily: 'var(--bs-font-monospace, monospace)',
				fontSize: '1.5rem',
				letterSpacing: '0.2em',
				textAlign: 'center'
			} : {
				textAlign: 'center'
			}
		}
	},
	template: `
	<div class="text-center" :class="standalone ? 'mx-auto px-0 py-3' : 'p-3'" :style="standalone ? {maxWidth: '30rem'} : {}">
		<div v-if="showBackButton" class="mb-3 text-start">
			<button type="button" class="btn btn-outline-secondary" @click="goBack">
				<i class="fa-solid fa-arrow-left me-2" aria-hidden="true"></i>{{ $p.t('global/zurueck') }}
			</button>
		</div>

		<div :style="bodyStyle">
			<template v-if="!zugangscodeProcessed">
				<i class="fa-solid fa-qrcode d-block" :style="iconStyle" aria-hidden="true"></i>
				<component :is="titleTag" class="mb-3" :style="titleStyle">{{ getBaseLayoutTitle }}</component>
				<form class="d-flex flex-column mx-auto" style="gap: 0.75rem; max-width: 22rem;" @submit.prevent="sendCode">
					<input
						:maxlength="calculatedMaxLength"
						class="form-control"
						:style="inputStyle"
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
			<div v-else-if="viewData" role="status">
				<i class="fa-solid fa-circle-check d-block" :style="[iconStyle, {color: 'var(--bs-success, #198754)'}]" aria-hidden="true"></i>
				<component :is="titleTag" class="mb-3" :style="titleStyle">{{ getBaseLayoutTitle }}</component>
				<p class="mb-1" style="font-weight: 600;">{{viewData.bezeichnung}} ({{viewData.kurzbz}})</p>
				<p class="mb-1">{{von.toLocaleDateString()}}: {{formatClock(von)}} - {{formatClock(bis)}}</p>
				<p class="mb-0">{{viewData.vorname}} {{viewData.nachname}} {{$p.t('global/wurdeRegistriert')}}.</p>
			</div>
		</div>
	</div>
`
};
