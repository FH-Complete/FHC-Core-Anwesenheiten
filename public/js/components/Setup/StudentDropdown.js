export const StudentDropdown = {
	name: "StudentDropdown",
	components: {
		Dropdown: primevue.dropdown,
	},
	emits: [
		'studentChanged'
	],
	data () {
		return {
			internal_available_student_info: [],
			internal_selected_student_info: null
		};
	},
	methods: {
		studentChanged(e) {

			this.$entryParams.selected_student_info = this.$entryParams.availableStudents.find(s => s.prestudent_id === e.value.prestudent_id)
			this.$emit('studentChanged', e)
		},
		async setupData() {
			if(!(this.$entryParams.permissions.assistenz || this.$entryParams.permissions.admin)) {
				return
			}
			await this.$entryParams.setupPromise.then(() => {
				this.internal_available_student_info =  this.$entryParams.availableStudents
				this.internal_selected_student_info =  this.$entryParams.selected_student_info
			})
		},
		getOptionLabel(option) {
			const gruppe = ' (' + option.semester + option.verband + option.gruppe + ')'
			return option.nachname + ' ' + option.vorname + ' ' + gruppe.replace(/\s+/g, '') // remove spaces
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div class="d-flex align-items-center gap-2">
			<label for="studentSelect" class="mb-0 text-nowrap">{{ $p.t('global/students') }}</label>
			<Dropdown @change="studentChanged" class="flex-grow-1" style="min-width: 0;" inputId="studentSelect" :optionLabel="getOptionLabel"
			v-model="internal_selected_student_info" :options="internal_available_student_info">
			</Dropdown>
		</div>
	`
}