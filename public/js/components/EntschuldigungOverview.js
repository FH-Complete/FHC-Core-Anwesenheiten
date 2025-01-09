export default {
	name: 'EntschuldigungenOverview',
	components: {
	},
	data: () => {
		return {

		};
	},
	props: {
		entschuldigungen: {
			type: Array,
			default: null
		}
	},
	methods: {
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
	mounted() {

	},
	computed: {
		datesFormatted() {
			const datesFormatted = []
			
			this.entschuldigungen.forEach(ent => {
				const von = new Date(ent.von)
				const bis = new Date(ent.bis)
				datesFormatted.push({von , bis, vonShort: this.formatShortDate(von), bisShort: this.formatShortDate(bis)})
			})
			
			return datesFormatted
		}
	},
	template: `
		<div class="flex-grow-1" style="overflow-y: auto; overflow-x: hidden">
			<div v-if="entschuldigungen === null" class="d-flex h-100 justify-content-center align-items-center">
				<i class="fa-solid fa-spinner fa-pulse fa-3x"></i>
			</div>
			<template v-else-if="entschuldigungen.length" v-for="(entschuldigung, index) in entschuldigungen" :key="'entschuldigung-'+index">
				<div class="row row-cols-auto" style="padding: 2px; margin: 0px;">
					<div class="col-5 text-center">{{ datesFormatted[index].vonShort }}</div>
					<div class="col-1 text-center">-</div>
					<div class="col-5 text-center">{{ datesFormatted[index].bisShort }} </div>
					<div class="col-1">
						<i v-if="entschuldigung.akzeptiert === null" class="fa fa-circle-info text-info" style="transform: translateX(-2px)"></i>
						<i v-else-if="entschuldigung.akzeptiert" class="fa fa-check" style="color: green"></i>
						<i v-else-if="!entschuldigung.akzeptiert" class="fa fa-xmark" style="color: red"></i>
					</div>
				</div>
			</template>
			<div v-else class="d-flex h-100 justify-content-center align-items-center fst-italic text-center">
				{{ $p.t('global/noDataAvailable') }}
			</div>
		</div>
`
};


