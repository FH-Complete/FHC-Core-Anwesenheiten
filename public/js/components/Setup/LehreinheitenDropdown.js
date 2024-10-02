export const LehreinheitenDropdown = {
	name: "LehreinheitenDropdown",
	emits: [
		'leChanged'
	],
	props: {
		title: ''
	},
	methods: {
		leChanged(e) {

			const selected = e.target.selectedOptions

			this.$entryParams.selected_le_id.value = selected[0]._value.lehreinheit_id
			this.$entryParams.selected_le_info.value = selected[0]._value


			this.$emit('leChanged')
		},
		getSelected(option) {
			return option?.infoString === this.$entryParams.selected_le_info.value?.infoString
		}
	},
	mounted() {
		console.log('le dd mounted')
		console.log('this.$entryParams.selected_le_info.value', this.$entryParams.selected_le_info.value)
		console.log('this.$entryParams.available_le_info.value', this.$entryParams.available_le_info.value)
		console.log('this.$entryParams.selected_le_id', this.$entryParams.selected_le_id)
		console.log('this.$entryParams.available_le_ids.value', this.$entryParams.available_le_ids.value)
	},
	template: `
		<div>
			<label for="leSelect">{{ title }}</label>
			<select id="leSelect" @change="leChanged" class="form-control">
				<option v-for="option in $entryParams.available_le_info.value" :value="option" :selected="getSelected(option)">
					<a> {{option?.infoString}} </a>
				</option>
			</select>
		</div>
	`
}