
export const AnwCountDisplay = {
	name: 'AnwCountDisplay',
	props: {
		anwesend: '/',
		abwesend: '/',
		entschuldigt: '/'
	},
	template:`	
	
		<div class="text-center">
			<div style="display: flex; justify-content: center; align-items: center;">
				<div style="color: #28a745;"><h3>{{anwesend}} <i class="fa fa-check"></i></h3></div>

				<div style="color: #dc3545; margin-left: 36px;"><h3>{{abwesend}} <i class="fa fa-xmark"></i></h3></div>

				<div style="color: #0335f5; margin-left: 36px;"><h3>{{entschuldigt}} <i class="fa-solid fa-user-shield"></i></h3></div>

			</div>
		</div>
	
	`
};