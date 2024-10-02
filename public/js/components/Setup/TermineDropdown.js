export const TermineDropdown = {
	name: "TermineDropdown",
	emits: [
		'terminChanged'
	],
	data () {
		return {
			errors: null,
			internal_available_termine: [],
			internal_selected_termin: null
		};
	},
	props: {

	},
	methods: {
		setTermine(data){
			this.internal_available_termine = data
		},
		terminChanged(e) {
			const selected = e.target.selectedOptions

			this.internal_selected_termin = selected[0]._value
			this.$emit('terminChanged', this.internal_selected_termin)
		},
		getSelected(option) {
			return option.datum === this.$entryParams.closestTermin?.datum
		}
	},
	mounted() {
	},
	template: `
		<div class="mt-2">
			<label for="terminSelect">{{ $p.t('global/termineLautStundenplan') }}</label>
			<select id="terminSelect" v-model="internal_selected_termin" @change="terminChanged" class="form-control">
				<option v-for="termin in internal_available_termine" :value="termin" :selected="getSelected(termin)">
					<a>{{termin.datumFrontend}}: {{termin.beginn}} - {{termin.ende}}</a>
				</option>
			</select>
		</div>
	`
}