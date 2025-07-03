
export const Statuslegende = {
	name: 'Statuslegende',
	template:`	
		<div class="text-center">
			<div class="col">
				<div class="row" style="color: #28a745;"><h3>{{$capitalize($p.t('global/anwesend'))}} = <i class="fa fa-check"></i></h3></div>

				<div class="row" style="color: #dc3545;"><h3>{{$capitalize($p.t('global/abwesend'))}} = <i class="fa fa-xmark"></i></h3></div>

				<div v-if="this.$entryParams.permissions.entschuldigungen_enabled" class="row" style="color: #0335f5;"><h3>{{$capitalize($p.t('global/entschuldigt'))}} = <i class="fa-solid fa-user-shield"></i></h3></div>

				<div class="row"><h3>{{$capitalize($p.t('global/studentenInLVTeil'))}} = 👥</h3></div>
				<div class="row"><h3>{{$capitalize($p.t('global/termineAusStundenplan'))}} = 📅</i></h3></div>

			</div>
		</div>	
	`
};

export default Statuslegende;