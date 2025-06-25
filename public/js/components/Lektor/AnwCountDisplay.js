
export const AnwCountDisplay = {
	name: 'AnwCountDisplay',
	data: function() {
		return {
			anwHovered: false,
			abwHovered: false,
			entHovered: false
		}
	},
	props: {
		anwesend: '/',
		abwesend: '/',
		entschuldigt: '/'
	},
	template:`	
		<div class="text-center">
			<div style="display: flex; justify-content: center; align-items: center;">
				<div @mouseover="anwHovered = true" @mouseleave="anwHovered = false" style="position: relative; display: inline-block; color: #28a745;">
					<h3>{{anwesend}} <i class="fa fa-check"></i>
						<div class="legend-info" v-show="anwHovered"> {{$capitalize($p.t('global/anwesend'))}}</div>
					</h3>
				</div>

				<div @mouseover="abwHovered = true" @mouseleave="abwHovered = false" style="position: relative; display: inline-block; color: #dc3545; margin-left: 36px;">
					<h3>{{abwesend}} <i class="fa fa-xmark"></i>
						<div class="legend-info" v-show="abwHovered"> {{$capitalize($p.t('global/abwesend'))}}</div>
					</h3>
				</div>

				<div @mouseover="entHovered = true" @mouseleave="entHovered = false" 
				v-if="this.$entryParams.permissions.entschuldigungen_enabled" 
				style="position: relative; display: inline-block; color: #0335f5; margin-left: 36px;">
					<h3>{{entschuldigt}} <i class="fa-solid fa-user-shield"></i>
						<div class="legend-info" v-show="entHovered"> {{$capitalize($p.t('global/entschuldigt'))}}</div>
					</h3>
				</div>

			</div>
		</div>
	
	`
};