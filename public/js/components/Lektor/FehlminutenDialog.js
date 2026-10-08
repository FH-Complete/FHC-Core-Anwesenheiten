import BsModal from '../../../../../js/components/Bootstrap/Modal.js';

// dialog for the fehlminuten of one or more anwesenheiten. open() resolves with {fehlminuten, notiz},
// or with null when the user cancels. The minutes go from 1 up to one minute less than the
// (shortest) kontrolle, the full duration is the status abwesend. The notiz holds the reason
export const FehlminutenDialog = {
	name: 'FehlminutenDialog',
	components: {
		BsModal
	},
	data() {
		return {
			// {name, kontrolle, dauerLabel, dauer, value, notiz, resolve} while the dialog is open
			dialog: null,
			// the lektor table and the detail view both hold a dialog, the label needs a unique id
			inputId: 'anwFehlminuten-' + Math.random().toString(36).slice(2)
		}
	},
	computed: {
		max() {
			return (this.dialog?.dauer ?? 0) - 1
		},
		valid() {
			const value = this.dialog?.value
			return Number.isInteger(value) && value >= 1 && value <= this.max
		},
		showInvalid() {
			const value = this.dialog?.value
			return value !== null && value !== undefined && value !== '' && !this.valid
		},
		presets() {
			return [5, 10, 15, 30, 45, 60, 90, 120].filter(minuten => minuten <= this.max)
		},
		// common reasons, a click writes the text into the notiz
		reasons() {
			return ['global/anwFehlminutenGrundVerspaetung', 'global/anwFehlminutenGrundFrueherGegangen']
				.map(phrase => this.$p.t(phrase))
		}
	},
	methods: {
		// options: name, kontrolle (label of the kontrolle), dauerLabel, dauer (minutes), value and notiz (prefill)
		open(options) {
			// a dialog that is still open gets cancelled
			this.dialog?.resolve?.(null)

			return new Promise(resolve => {
				this.dialog = {...options, value: options.value || null, notiz: options.notiz ?? '', resolve}
				this.$refs.modal.show()
			})
		},
		confirm() {
			if (!this.valid) return

			const resolve = this.dialog.resolve
			this.dialog.resolve = null
			resolve({fehlminuten: this.dialog.value, notiz: this.dialog.notiz.trim()})

			this.$refs.modal.hide()
		},
		handleHidden() {
			// closed without confirm
			this.dialog?.resolve?.(null)
			this.dialog = null

			// opened above the detail view: bootstrap removes the body class of the still open modal
			if (document.querySelector('.modal.show')) document.body.classList.add('modal-open')
		},
		focusInput() {
			this.$refs.input?.focus()
			this.$refs.input?.select()
		}
	},
	template: `
		<bs-modal ref="modal" class="bootstrap-prompt" dialogClass="anw-fehlminuten-dialog" bodyClass="px-4 py-4"
			@hidden-bs-modal="handleHidden" @shown-bs-modal="focusInput">
			<template v-slot:title>
				{{ $p.t('global/anwFehlminutenErfassen') }}
			</template>
			<template v-slot:default>
				<div v-if="dialog">
					<p class="mb-0 fw-semibold">{{ dialog.name }}</p>
					<p class="small text-body-secondary">{{ dialog.kontrolle }} · {{ dialog.dauerLabel }}</p>

					<label :for="inputId" class="form-label fw-semibold">{{ $p.t('global/anwFehlminutenLabelV2') }}</label>
					<div v-if="presets.length" class="btn-group btn-group-sm w-100 mb-2 anw-fehlminuten-presets" role="group">
						<button v-for="preset in presets" :key="preset" type="button"
							class="btn" :class="dialog.value === preset ? 'btn-primary' : 'btn-outline-primary'"
							:aria-pressed="dialog.value === preset"
							@click="dialog.value = preset">
							{{ preset }}
						</button>
					</div>
					<div class="input-group">
						<input :id="inputId" ref="input" type="number" class="form-control"
							:class="{'is-invalid': showInvalid}"
							min="1" :max="max" step="1"
							v-model.number="dialog.value"
							@keyup.enter="confirm">
						<span class="input-group-text">{{ $p.t('global/minuten') }}</span>
					</div>
					<div v-if="showInvalid" class="invalid-feedback d-block">
						{{ $p.t('global/anwFehlminutenUngueltig', {max: Math.max(max, 1)}) }}
					</div>
					<div class="form-text">{{ $p.t('global/anwFehlminutenPosition') }}</div>
					<div class="form-text">{{ $p.t('global/anwFehlminutenHinweisV2') }}</div>

					<label :for="inputId + '-notiz'" class="form-label fw-semibold mt-3">{{ $p.t('global/anwFehlminutenBegruendung') }}</label>
					<div class="d-flex flex-wrap gap-1 mb-2" role="group">
						<button v-for="reason in reasons" :key="reason" type="button"
							class="btn btn-sm" :class="dialog.notiz === reason ? 'btn-primary' : 'btn-outline-primary'"
							:aria-pressed="dialog.notiz === reason"
							@click="dialog.notiz = reason">
							{{ reason }}
						</button>
					</div>
					<input :id="inputId + '-notiz'" type="text" class="form-control" maxlength="255"
						v-model="dialog.notiz"
						@keyup.enter="confirm">
				</div>
			</template>
			<template v-slot:footer>
				<button type="button" class="btn btn-outline-secondary" @click="$refs.modal.hide()">{{ $p.t('ui/abbrechen') }}</button>
				<button type="button" class="btn btn-primary" :disabled="!valid" @click="confirm">{{ $p.t('ui/anwenden') }}</button>
			</template>
		</bs-modal>
	`
};

export default FehlminutenDialog;
