
export const Kontrolle = {
	name: 'Kontrolle',
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
			Kontrolle laut Anwesenheiten {{internalValue.datum}}: {{internalValue.von}} - {{internalValue.bis}}
<!--			Anwesend: {{internalValue.anw}} / {{internalValue.sumAnw}}-->
		</div>
	
	`
};