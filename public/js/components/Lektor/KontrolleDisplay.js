
export const KontrolleDisplay = {
	name: 'KontrolleDisplay',
	props: {
		kontrolle: null,
	},
	computed: {
		// several rows: the sticky in-view tooltip, the user reads it longer than the hover pause
		infoText() {
			const k = this.kontrolle
			return [
				this.$p.t('global/anwKontrolleId') + ': ' + k.anwesenheit_id,
				this.$p.t('global/anwLvTeilId') + ': ' + k.lehreinheit_id,
				this.$p.t('global/insertvon') + ': ' + (k.insertvon ?? '-'),
				this.$p.t('global/insertamum') + ': ' + this.formatTimestamp(k.insertamum),
				this.$p.t('global/updatevon') + ': ' + (k.updatevon ?? '-'),
				this.$p.t('global/updateamum') + ': ' + this.formatTimestamp(k.updateamum)
			].join('\n')
		}
	},
	methods: {
		// '2026-09-28 10:12:33.123+02' -> '28.09.2026 10:12'
		formatTimestamp(timestamp) {
			if (!timestamp) return '-'
			const [date, time] = timestamp.split(/[ T]/)
			const [year, month, day] = date.split('-')
			return day + '.' + month + '.' + year + (time ? ' ' + time.substring(0, 5) : '')
		}
	},
	template:`
		<div v-if="kontrolle" class="row">
			<div class="col-1 ml-4 d-flex align-items-center">
				<button type="button" class="btn btn-link p-0 mb-2 fs-6 fhc-in-view-help-btn" :aria-label="$p.t('global/details')" v-tooltip.sticky="infoText">
					<i class="fa-solid fa-circle-info" aria-hidden="true"></i>
				</button>
			</div>
			<div class="col-11"><h4>{{kontrolle.datum}}: {{kontrolle.von}} - {{kontrolle.bis}}</h4></div>
			
		</div>
		
	
	`
};