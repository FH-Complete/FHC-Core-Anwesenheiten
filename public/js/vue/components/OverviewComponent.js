

export default {

	components: {
	},
	data() {
		return {
			internalStudents: students,
			internalDates: dates,
			internalParameters: parameters
		}
	},
	props: {
		students: [],
		dates: [],
		parameters: []

	},
	methods: {

	},
	created(){

	},
	mounted() {

	},
	updated(){
	},
	computed: {
		// datesFiltered(internalDates) {
		// 	console.log(internalDates)
		// 	const ret = new Set(internalDates.map(d => d.datum));
		// 	console.log(ret);
		// 	return ret;
		// }
	},
	template:`
	<div>
		<p>Overview Component </p>
		
		<p>Semester: {{internalParameters.semester}} Verband: {{internalParameters.verband}} Gruppe: {{internalParameters.gruppe}} 
		Orgeinheit: {{internalParameters.orgeinheit}} Lehrveranstaltung_id: {{internalParameters.lehrveranstaltung_id}} 
		lehreinheit_id: {{internalParameters.lehreinheit_id}} studiengang_kz: {{internalParameters.studiengang_kz}}
		studiensemester_kurzbz: {{internalParameters.studiensemester_kurzbz}}</p>
		
		<lh>Vorname </lh>
		<lh>Nachname</lh>
		
		<li v-for="student in internalStudents">
			{{student.vorname}} {{student.nachname}}
		</li>
			
	</div>`


};
