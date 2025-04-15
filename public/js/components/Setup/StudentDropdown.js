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
			errors: null,
			internal_available_student_info: [],
			internal_selected_student_info: null
		};
	},
	props: {

	},
	methods: {
		studentChanged(e) {

			this.$entryParams.selected_student = e.value
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
		resetData() {
			this.internal_available_student_info =  this.$entryParams.availableStudents
			this.internal_selected_student_info =  this.$entryParams.selected_student_info
		},
		getOptionLabel(option) {
			return option.semester + option.verband + option.gruppe + ' ' + option.vorname + ' ' + option.nachname
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div class="row">
			<div class="col-3 d-flex align-items-center"><label for="leSelect">{{ $p.t('global/students') }}</label></div>
			<div class="col-8">
				<Dropdown @change="studentChanged" :style="{'width': '100%'}" :optionLabel="getOptionLabel" 
				v-model="internal_selected_student_info" :options="internal_available_student_info">
					<template #optionsgroup="slotProps">
						<div class="row">
							<div class="col-2">{{option.semester}}{{option.verband}}{{option.gruppe}}</div>
							<div class="col-10 d-flex justify-content-between align-items-center">
								<div>{{option.vorname}}</div>
								<div>{{option.nachname}}</div>
							</div>
						</div>				
					</template>
				</Dropdown>
			</div>
		</div>
	`
}