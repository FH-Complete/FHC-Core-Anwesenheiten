import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';

export const EntschuldigungEdit = {
	name: "EntschuldigungEdit",
	components: {
		Datepicker: VueDatePicker,
		Textarea: primevue.textarea,
		Tristate: primevue.tristatecheckbox
	},
	emits: [
		'validate'
	],
	data () {
		return {
			minDate: this.calcMinDate(),
			form: Vue.reactive({
				von: null,
				bis: null,
				notiz: '',
				akzeptiert: '',
				// todo: column examberechtigt default false?
			})
		};
	},
	props: {
		modelValue: null
	},
	created() {

	},
	
	methods: {
		setForm(newVal) {
			this.form.von = new Date(newVal.von)
			this.form.bis = new Date(newVal.bis)
			this.form.uploaddatum = new Date(newVal.uploaddatum)
			this.form.notiz = newVal.notiz
			this.form.akzeptiert = newVal.akzeptiert
		},
		calcMinDate(){
			// assistenz minDate further in the past than students by design
			let d = new Date();

			d.setFullYear(d.getFullYear() - 1)

			return d
		},
		formatDate(date) {
			const day = date.getDate();
			const month = date.getMonth() + 1;
			const year = date.getFullYear();
			const hrs = String(date.getHours()).padStart(2, '0')
			const min = String(date.getMinutes()).padStart(2, '0')
			
			return `${day}.${month}.${year} ${hrs}:${min}`;
		},
		validate(entschuldigung) {
			if (entschuldigung === null) {
				this.$emit('validate', false)
				return
			}

			if (!entschuldigung.von) {
				this.$emit('validate', false)
				// this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterVonZeit'));
				return false
			}
			if (!entschuldigung.bis) {
				this.$emit('validate', false)
				// this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterBisZeit'));
				return false
			}
			
			this.$emit('validate', true)
		}
	},
	watch:{
		modelValue: {
			handler(newVal) {
				if(!this.validate(newVal)) return
				this.setForm(newVal)
			},
			deep: true
		},
		form: {
			handler(newVal) {
				this.validate(newVal)
			},
			deep: true
		}
	},
	computed: {
		getStatusLabel() {
			if(this.modelValue.akzeptiert === null) {
				return 'Entschuldigung Status offen'
			} else if (this.modelValue.akzeptiert === true) {
				return 'Entschuldigung akzeptiert'
			} else {
				return 'Entschuldigung abgelehnt'
			}
		}	
	},
	template: `
		<div v-if="modelValue">
			<div class="row">
				<p>
					{{ modelValue.vorname }} {{ modelValue.nachname }}
				</p>
				<p>
					{{ modelValue.kurzbzlang }} {{ modelValue.bezeichnung }} {{ modelValue.studentorgform }}
				</p>
				<p>
					{{$p.t('global/uploaddatum')}}: {{modelValue.uploaddatum }}
				</p>
			</div>
			
			<div class="row">
				<div class="col-6 d-flex align-items-center">
					<Tristate v-model="modelValue.akzeptiert" :disabled="true"></Tristate>
					<span class="ms-2">{{getStatusLabel}}</span>
				</div>
				<div v-if="!modelValue.dms_id" class="col-6">
					<span class="ms-2" style="color: red">{{$p.t('global/missingEntschuldigungFile')}}</span>
				</div>
			</div>
			<div class="row mt-4">
				<div class="col-6">
					<datepicker
						id="von"
						v-model="modelValue.von"
						:clearable="false"
						auto-apply
						:disabled="modelValue.akzeptiert !== null"
						:format="formatDate"
						:enable-time-picker="true"
						:min-date="minDate"
						:start-date="minDate">
					</datepicker>
				</div>
				<div class="col-6">
					<datepicker
						id="bis"
						v-model="modelValue.bis"
						:clearable="false"
						:disabled="modelValue.akzeptiert !== null"
						auto-apply
						:format="formatDate"
						:enable-time-picker="true"
						:min-date="minDate"
						:start-date="minDate">
					</datepicker>
				</div>
			</div>
			<div class="row mt-4">
				<Textarea v-model="modelValue.notiz" rows="5" maxlength="255"></Textarea>
				<p>{{ modelValue.notiz?.length ? modelValue.notiz.length : 0 }} / 255 characters</p>
			</div>
			
		</div>
	`
}