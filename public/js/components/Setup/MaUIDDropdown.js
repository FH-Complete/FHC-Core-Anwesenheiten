export const MaUIDDropdown = {
	name: "MaUIDDropdown",
	emits: [
		'maUIDChanged'
	],
	props: {
		title: ''
	},
	methods: {
		maUIDChanged(e) {
			const selected = e.target.selectedOptions

			// reload LEs
			this.$entryParams.selected_maUID.value = selected[0]._value
			this.$entryParams.handleLeSetup(
				this.$entryParams.lv_id,
				this.$entryParams.selected_maUID.value.mitarbeiter_uid,
				this.$entryParams.sem_kurzbz,
				[]
			).then(() => {
				this.$emit('maUIDchanged')
			})
		},
		getSelected(option) {
			return option.mitarbeiter_uid === this.$entryParams.selected_maUID.value?.mitarbeiter_uid
		}
	},
	template: `
		<div>
			<label for="maSelect">{{ title }}</label>
			<select id="maSelect" @change="maUIDChanged" class="form-control" >
				<option v-for="option in $entryParams.available_maUID.value" :value="option" 
				:selected="getSelected(option)">
				
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}