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
	methods: {
		leChanged(e) {
			const selected = e.target.selectedOptions
			this.$entryParams.selected_le_id = selected[0]._value.lehreinheit_id
			this.$entryParams.selected_le_info = selected[0]._value
			this.$emit('leChanged')
		},
		async setupData() {
			if(!(this.$entryParams.permissions.lektor || this.$entryParams.permissions.admin)) {
				return
			}
			await this.$entryParams.setupPromise.then(() => {
				this.internal_available_le_info = this.$entryParams.available_le_info
				this.internal_selected_le_info =  this.$entryParams.selected_le_info
			})
		},
		resetData() {
			this.internal_available_le_info = this.$entryParams.available_le_info
			this.internal_selected_le_info =  this.$entryParams.selected_le_info
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div class="mt-2">
			<label for="leSelect">{{ $p.t('lehre/lehreinheit') }}</label>
			<select id="leSelect" @change="leChanged" class="form-control">
				<option v-for="option in internal_available_le_info" :value="option" >
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}