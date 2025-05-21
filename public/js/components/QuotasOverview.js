import ApiProfil from '../api/factory/profil.js';

export default {
	name: 'QuotasOverview',
	props: {
		quotas: {
			type: Array,
			default: null
		},
		uid: {
			type: String,
			default: null
		}
	},
	methods: {
		showLvaAnw(quota){
			if(!quota.showDetails && !quota.detailsLoaded) {
				this.$api.call(ApiProfil.getAnwesenheitenByLva(null, quota.lehrveranstaltung_id, quota.prestudent_id, this.uid))
					.then(res => {
						quota.showDetails = true
						quota.detailsLoaded = true
						quota.details = res?.data?.retval
						quota.details.forEach(d => {
							d.vonShort = this.formatShortDate(new Date(d.von)) 
							d.bisShort = this.formatShortDate(new Date(d.bis))
						})
					})
			} else if (quota.showDetails && quota.detailsLoaded) {
				quota.showDetails = false
			} else if (!quota.showDetails && quota.detailsLoaded) {
				quota.showDetails = true
			}
			
		},
		formatShortDate(date) {
			// handle missing leading 0
			const padZero = (num) => String(num).padStart(2, '0');

			const month = padZero(date.getMonth() + 1); // Months are zero-based
			const day = padZero(date.getDate());
			const year = date.getFullYear();
			const hours = padZero(date.getHours());
			const minutes = padZero(date.getMinutes());

			return `${month}/${day}/${year}, ${hours}:${minutes}`;
		}
	},
	template: `
		<div class="flex-grow-1" style="overflow-y: auto; overflow-x: hidden">
			<div v-if="quotas === null" class="d-flex h-100 justify-content-center align-items-center">
				<i class="fa-solid fa-spinner fa-pulse fa-3x"></i>
			</div>
			<template v-else-if="quotas.length" v-for="(quota, index) in quotas" :key="'quota-'+index" style="margin-top: 8px;">
				<div class="d-grid p-0" >
					<div class="btn btn-link link-secondary text-decoration-none" @click="showLvaAnw(quota)">
						<p>{{ quota.bezeichnung }} - {{ quota.anwesenheit }} % </p>
						<div class="progress">
							<div class="progress-bar bg-success" role="progressbar" :style="'width: ' + quota.anwesenheit+'%;'"  aria-valuemin="0" aria-valuemax="100"></div>
							<div class="progress-bar bg-danger" role="progressbar" :style="'width: ' + (100 - quota.anwesenheit)+'%;'"  aria-valuemin="0" aria-valuemax="100"></div>
						</div>
					</div>
					<div v-if="quota.showDetails && quota.details.length" v-for="(anw, index) in quota.details" class="row row-cols-auto" style="padding: 2px; margin: 0px;">
						<div class="col-5 text-center">{{ anw.vonShort }}</div>
						<div class="col-1 text-center">-</div>
						<div class="col-5 text-center">{{ anw.bisShort }} </div>
						<div class="col-1">
							<i v-if="anw.status === 'anwesend'" class="fa fa-check" style="color: green"></i>
							<i v-else-if="anw.status === 'abwesend'" class="fa fa-xmark" style="color: red"></i>
							<i v-else-if="anw.status === 'entschuldigt'" class="fa fa-shield" style="color: blue"></i>
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


