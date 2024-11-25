export const StudentDropdown = {
	name: "StudentDropdown",
	emits: [
		'studentChanged'
	],
	data () {
		return {
			errors: null,
			internal_available_student_info: [],
			internal_selected_student_info: null
		};
	},
	props: {

	},
	methods: {
		studentChanged(e) {
			const selected = e.target.selectedOptions
			this.$entryParams.selected_student = selected[0]._value
			this.$entryParams.selected_student_info = this.$entryParams.availableStudents.find(s => s.prestudent_id === this.$entryParams.selected_student.prestudent_id)
			this.$emit('studentChanged', e)
		},
		async setupData() {
			if(!(this.$entryParams.permissions.assistenz || this.$entryParams.permissions.admin)) {
				return
			}
			await this.$entryParams.setupPromise.then(() => {
				this.internal_available_student_info =  this.$entryParams.availableStudents
			})
		},
		resetData() {
			this.internal_available_student_info =  this.$entryParams.availableStudents
			this.internal_selected_student_info =  this.$entryParams.selected_student_info
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div class="row">
			<div class="col-3 d-flex align-items-center"><label for="leSelect">{{ $p.t('global/students') }}</label></div>
			<div class="col-8">
				<select id="leSelect" @change="studentChanged" class="form-control">
					<option v-for="option in internal_available_student_info" :value="option" >
						<a> {{option.infoString}} </a>
					</option>
				</select>
			</div>
		</div>
	`
}