export const LehreinheitenDropdown = {
	name: "LehreinheitenDropdown",
	emits: [
		'leChanged'
	],
	data () {
		return {
			errors: null,
		};
	},
	created() {
		this.loadDropdown();
	},
	props: {

	},
	methods: {
		loadDropdown() {
			// load every LE for selected/given LVA
			// const lva_id = this._.root.appContext.config.globalProperties.$entryParams.lv_id
			// const sem_kz = 		this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
			// Vue.$fhcapi.Info.getLehreinheitenForLehrveranstaltung(lva_id, sem_kz).then(
			// 	res => {
			// 		console.log('getLehreinheitenForLehrveranstaltung', res)
			// 	}
			// )
		},
		leChanged(e) {
			console.log('leChanged', e)
			const selected = e.target.selectedOptions
			this._.root.appContext.config.globalProperties.$entryParams.selected_le_id = selected[0]._value.lehreinheit_id
			console.log(this._.root.appContext.config.globalProperties.$entryParams)
		}
	},

	template: `
		<div class="mt-2">
			<select id="leSelect" v-model="$entryParams.selected_le_info" @change="leChanged" class="form-control">
				<label for="leSelect">Lehreinheiten</label>
				<option v-for="option in $entryParams.available_le_info" :value="option" >
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}