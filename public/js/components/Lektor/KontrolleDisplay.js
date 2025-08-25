
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
	template:`
		<div v-if="kontrolle" class="row">
			<div class="col-1 ml-4 d-flex align-items-center">
				<div style="position: relative; display: inline-block;">
					<h6 @mouseover="hovered = true" @mouseleave="hovered = false">
						<i class="fa-solid fa-circle-info"></i> 
						<div class="legend-info" v-show="hovered" style="min-width: 400px; z-index: 8500;">
							<div class="row"><p>Anwesenheit_id: {{kontrolle.anwesenheit_id}}</p></div>
							<div class="row"><p>Lehreinheit_id: {{kontrolle.lehreinheit_id}}</p></div>
							<div class="row"><p>insertvon: {{kontrolle.insertvon}}</p></div>
							<div class="row"><p>insertamum: {{kontrolle.insertamum}}</p></div>
							<div class="row"><p>updatevon: {{kontrolle.updatevon}}</p></div>
							<div class="row"><p>updateamum: {{kontrolle.updateamum}}</p></div>
						</div>
					</h6>
				</div>
			</div>
			<div class="col-11"><h4>{{kontrolle.datum}}: {{kontrolle.von}} - {{kontrolle.bis}}</h4></div>
			
		</div>
		
	
	`
};