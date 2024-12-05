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
			default: null
		}
	},
	methods: {
		showLvaAnw(quota){
			// todo: show seperate anw entries of that lva
		}
	},
	mounted() {

	},
	computed: {

	},
	template: `
		<div class="flex-grow-1" style="overflow-y: auto; overflow-x: hidden">
			<div v-if="quotas === null" class="d-flex h-100 justify-content-center align-items-center">
				<i class="fa-solid fa-spinner fa-pulse fa-3x"></i>
			</div>
			<template v-else-if="quotas.length" v-for="(quota, index) in quotas" :key="'quota-'+index" style="margin-top: 8px;">
				<div class="card-header d-grid p-0" >
					<div class="btn btn-link link-secondary text-decoration-none" @click="showLvaAnw(quota)">
						<p>{{ quota.bezeichnung }} - {{ quota.anwesenheit }} % </p>
						<div class="progress">
							<div class="progress-bar bg-success" role="progressbar" :style="'width: ' + quota.anwesenheit+'%;'"  aria-valuemin="0" aria-valuemax="100"></div>
							<div class="progress-bar bg-danger" role="progressbar" :style="'width: ' + (100 - quota.anwesenheit)+'%;'"  aria-valuemin="0" aria-valuemax="100"></div>
						</div>
					</div>
				</div>
				<div v-if="!quotas?.length" class="list-group-item small text-center">
					{{ $p.t('global/noDataAvailable') }}
				</div>
			</template>
			<div v-else class="d-flex h-100 justify-content-center align-items-center fst-italic text-center">
				{{ $p.t('global/noDataAvailable') }}
			</div>
		</div>
`
};


