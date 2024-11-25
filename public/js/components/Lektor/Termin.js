
export const Termin = {
	name: 'Termin',
	components: {

	},
	data() {
		return {
			internalValue: this.value
		}
	},
	props: {
		value: null
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

	},
	computed: {

	},
	template:`	
	
		
		<div v-if="internalValue">
			Termin laut Stundenplan {{internalValue.datumFrontend}}: {{internalValue.beginn}} - {{internalValue.ende}}
		</div>
	
	`
};