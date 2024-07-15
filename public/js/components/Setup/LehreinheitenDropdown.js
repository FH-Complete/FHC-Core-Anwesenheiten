export const LehreinheitenDropdown = {
	name: "LehreinheitenDropdown",
	emits: [
		'leChanged'
	],
	data () {
		return {
			errors: null,
			internal_available_le_info: [],
			internal_selected_le_info: null
		};
	},
	props: {
		title: ''
	},
	methods: {
		leChanged(e) {
			console.log('leChanged')
			const selected = e.target.selectedOptions
			this.$entryParams.selected_le_id = selected[0]._value.lehreinheit_id
			this.$entryParams.selected_le_info = selected[0]._value
			this.$emit('leChanged')
		},
		async setupData() {
			await this.$entryParams.setupPromise

			if(!(this.$entryParams.permissions.lektor || this.$entryParams.permissions.admin || this.$entryParams.permissions.assistenz)) {
				return
			}
			this.$entryParams.setupPromise.then(() => {
				this.internal_available_le_info = this.$entryParams.available_le_info
				this.internal_selected_le_info =  this.$entryParams.selected_le_info
			})
		},
		resetData() {
			console.log('resetData')
			this.internal_available_le_info = this.$entryParams.available_le_info
			this.internal_selected_le_info =  this.$entryParams.selected_le_info
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div>
			<label for="leSelect">{{ title }}</label>
			<select id="leSelect" @change="leChanged" class="form-control">
				<option v-for="option in internal_available_le_info" :value="option" >
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}