
export const KontrolleDisplay = {
	name: 'KontrolleDisplay',
	data: function() {
		return {
			hovered: false,
		}
	},
	props: {
		kontrolle: null,
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
				<div style="position: relative; display: inline-block;">
					<h6 @mouseover="hovered = true" @mouseleave="hovered = false">
						<i class="fa-solid fa-circle-info"></i> 
						<div class="legend-info" v-show="hovered" style="min-width: 400px; z-index: 8500;">
							<div class="row"><p>{{ $p.t('global/anwKontrolleId') }}: {{kontrolle.anwesenheit_id}}</p></div>
							<div class="row"><p>{{ $p.t('global/anwLvTeilId') }}: {{kontrolle.lehreinheit_id}}</p></div>
							<div class="row"><p>{{ $p.t('global/insertvon') }}: {{kontrolle.insertvon ?? '-'}}</p></div>
							<div class="row"><p>{{ $p.t('global/insertamum') }}: {{formatTimestamp(kontrolle.insertamum)}}</p></div>
							<div class="row"><p>{{ $p.t('global/updatevon') }}: {{kontrolle.updatevon ?? '-'}}</p></div>
							<div class="row"><p>{{ $p.t('global/updateamum') }}: {{formatTimestamp(kontrolle.updateamum)}}</p></div>
						</div>
					</h6>
				</div>
			</div>
			<div class="col-11"><h4>{{kontrolle.datum}}: {{kontrolle.von}} - {{kontrolle.bis}}</h4></div>
			
		</div>
		
	
	`
};