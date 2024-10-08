export const TermineDropdown = {
	name: "TermineDropdown",
	emits: [
		'terminChanged'
	],
	methods: {
		terminChanged(e) {
			const selected = e.target.selectedOptions

			this.$entryParams.selected_termin.value = selected[0]._value
			this.$emit('terminChanged')
		}
	},
	mounted() {
	},
	template: `
		<div class="mt-2">
			<label for="terminSelect">{{ $p.t('global/termineLautStundenplan') }}</label>
			
			<select id="terminSelect" @change="terminChanged" class="form-control" v-model="$entryParams.selected_termin.value">
				<option v-for="option in $entryParams.available_termine.value" :value="option">
					<a>{{option.datumFrontend}}: {{option.beginn}} - {{option.ende}}</a>
				</option>
			</select>
		</div>
	`
}