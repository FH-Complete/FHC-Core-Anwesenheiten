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
			// console.log('studentChanged', e)
			const selected = e.target.selectedOptions
			this.$entryParams.selected_student = selected[0]._value
			this.$entryParams.selected_student_info = this.$entryParams.availableStudents.find(s => s.prestudent_id === this.$entryParams.selected_student.prestudent_id)
			console.log('this.$entryParams.selected_student', this.$entryParams.selected_student)
			this.$emit('studentChanged', e)
		},
		async setupData() {
			console.log('student dropdown setup data')
			if(!(this.$entryParams.permissions.assistenz
				|| this.$entryParams.permissions.admin)) {
				return
			}
			await this.$entryParams.setupPromise.then(() => {
				console.log('student dropdown setupPromise then')
				this.internal_available_student_info =  this.$entryParams.availableStudents
				console.log('this.internal_selected_student_info', this.internal_selected_student_info)
			})
		},
		resetData() {
			console.log('studentDD resetData')
			this.internal_available_student_info =  this.$entryParams.availableStudents
			this.internal_selected_student_info =  this.$entryParams.selected_student_info

		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div class="mt-2">
			<label for="leSelect">{{ $p.t('global/students') }}</label>
			<select id="leSelect" @change="studentChanged" class="form-control">
				<option v-for="option in internal_available_student_info" :value="option" >
					<a> {{option.infoString}} </a>
				</option>
			</select>

		</div>
	`
}