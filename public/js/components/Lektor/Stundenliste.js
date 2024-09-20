
export const Stundenliste = {
	name: 'Stundenliste',
	components: {

	},
	data() {
		return {

		}
	},
	props: {
		stunden: null,
		entries: null
	},
	methods: {

	},
	created(){

	},
	mounted() {

	},
	updated(){

	},
	watch: {
		stunden(newVal) {
			console.log('stundenwatcher', newVal)
		}
	},
	computed: {

	},
	template:`	
		
		<div v-if="stunden">
			<div v-for="stunde in stunden" :key="stunde.stunde">
				{{stunde.beginn}} - {{stunde.ende}}
			</div>
		</div>
	
	`
};