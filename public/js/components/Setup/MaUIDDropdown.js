export const MaUIDDropdown = {
	name: "MaUIDDropdown",
	emits: [
		'maUIDChanged'
	],
	data () {
		return {
			errors: null,
			oldLeIds: []
		};
	},
	props: {
		title: ''
	},
	methods: {
		maUIDChanged(e) {
			const selected = e.target.selectedOptions

			// reload LEs
			this.$entryParams.selected_maUID = selected[0]._value
			this.$emit('maUIDchanged')

		},
		async setupData() {
			if(!(this.$entryParams?.permissions?.admin)) {
				return
			}
			await this.$entryParams.setupPromise.then(() => {
				this.internal_available_maUID.value = this.$entryParams.available_maUID
				this.internal_selected_maUID.mitarbeiter_uid =  this.$entryParams.selected_maUID.mitarbeiter_uid
				this.internal_selected_maUID.infoString =  this.$entryParams.selected_maUID.infoString
			})
		},
		resetData() {
			console.log('resetData')
			this.internal_available_maUID.value = this.$entryParams.available_maUID
			this.internal_selected_maUID.mitarbeiter_uid =  this.$entryParams.selected_maUID.mitarbeiter_uid
			this.internal_selected_maUID.infoString =  this.$entryParams.selected_maUID.infoString
		},
		getSelected(option) {
			return option.mitarbeiter_uid === this.internal_selected_maUID.mitarbeiter_uid
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div>
			<label for="maSelect">{{ title }}</label>
			<select id="maSelect" @change="maUIDChanged" class="form-control" >
				<option v-for="option in internal_available_maUID.value" :value="option.mitarbeiter_uid" 
				:selected="getSelected(option)">
				
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}