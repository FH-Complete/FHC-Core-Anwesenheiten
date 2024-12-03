export default {
	name: 'QuotasOverview',
	components: {

	},
	data: () => {
		return {

		};
	},
	props: {
		quotas: {
			type: Array,
			default: []
		}
	},
	methods: {

	},
	mounted() {

	},
	computed: {

	},
	template: `
	<div class="row-cols mt-4">
		<div v-for="(quota, index) in quotas" class="progress mt-2">
			<div style="position: absolute; width: 90%; display: flex; justify-content: space-between;">
				<span>{{quota.bezeichnung}}</span><span>{{quota.anwesenheit}}%</span>
			</div>
			<div class="progress-bar bg-success" role="progressbar" :style="'width: ' + quota.anwesenheit+'%;'"  aria-valuemin="0" aria-valuemax="100"></div>
  			<div class="progress-bar bg-danger" role="progressbar" :style="'width: ' + (100 - quota.anwesenheit)+'%;'"  aria-valuemin="0" aria-valuemax="100"></div>
		</div>
	</div>



	
		
`
};


