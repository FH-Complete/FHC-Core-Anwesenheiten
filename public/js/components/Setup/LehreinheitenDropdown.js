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

	},
	methods: {
		leChanged(e) {
			console.log('leChanged', e)
			const selected = e.target.selectedOptions
			this.$entryParams.selected_le_id = selected[0]._value.lehreinheit_id
		},
		async setupData() {
			await this.$entryParams.lePromise.then(() => {
				this.internal_available_le_info = this.$entryParams.available_le_info
				this.internal_selected_le_info =  this.$entryParams.selected_le_info
			})
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div class="mt-2">
			<label for="leSelect">{{ $p.t('lehre/lehreinheit') }}</label>
			<select id="leSelect" v-model="internal_selected_le_info" @change="leChanged" class="form-control">
				<option v-for="option in internal_available_le_info" :value="option" >
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}