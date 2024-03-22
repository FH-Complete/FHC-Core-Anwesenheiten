export const LehreinheitenDropdown = {
	name: "LehreinheitenDropdown",
	emits: [
		'leChanged'
	],
	data () {
		return {
			selectedOptions: [...this.options],
			errors: null,
		};
	},
	created() {
		this.loadDropdown();
	},
	props: {
		options: []
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
			this.selectedOptions = []
			const selected = e.target.selectedOptions//.forEach(option => this.selectedOptions.push(option.value))

			for (let i = 0; i < selected.length; i++) {
				this.selectedOptions.push(selected[i].value)
			}

			this._.root.appContext.config.globalProperties.$entryParams.le_ids = this.selectedOptions

			console.log(this._.root.appContext.config.globalProperties.$entryParams)
		}
	},

	template: `
		<div>
			<select multiple id="leSelect" v-model="$entryParams.le_ids" @change="leChanged" class="form-control">
				<label for="leSelect">Lehreinheiten</label>
				<option v-for="option in options" :value="option" >
					{{ option }}
				</option>
			</select>
			<div>
			</div>
		</div>
	`
}