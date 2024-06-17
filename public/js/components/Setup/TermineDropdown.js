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
			console.log('setTermine dropdown', data)
			this.internal_available_termine = data
			this.internal_selected_termin = data[0]
		},
		terminChanged(e) {
			console.log('terminChanged', e)
			const selected = e.target.selectedOptions

			this.internal_selected_termin = selected[0]._value
			this.$emit('terminChanged', this.internal_selected_termin)
		},
	},
	mounted() {
	},
	template: `
		<div class="mt-2">
			<label for="terminSelect">{{ $p.t('global/termine') }}</label>
			<select id="terminSelect" v-model="internal_selected_termin" @change="terminChanged" class="form-control">
				<option v-for="termin in internal_available_termine" :value="termin" >
					{{termin.datumFrontend}}: {{termin.beginn}} - {{termin.ende}}
				</option>
			</select>
		</div>
	`
}