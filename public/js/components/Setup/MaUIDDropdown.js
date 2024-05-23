export const MaUIDDropdown = {
	name: "MaUIDDropdown",
	emits: [
		'maUIDChanged'
	],
	data () {
		return {
			errors: null,
			internal_available_maUID: [],
			internal_selected_maUID: null
		};
	},
	props: {

	},
	methods: {
		reloadAvailableLE() {
			const ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid
			const sem_kurzbz = this.$entryParams.sem_kurzbz
			const lv_id = this.$entryParams.lv_id
			const le_ids = []

			return new Promise(resolve => {

				this.$fhcApi.get(
					`extensions/FHC-Core-Anwesenheiten/Api/infoGetLehreinheitenForLehrveranstaltungAndMaUid?lva_id=${lv_id}&ma_uid=${ma_uid}&sem_kurzbz=${sem_kurzbz}`,
					null, null
				).then(res => {
					console.log('getLehreinheitenForLehrveranstaltung Res', res)

					// merge entries with same LE
					const data = []

					res.data?.forEach(entry => {

						const existing = data.find(e => e.lehreinheit_id === entry.lehreinheit_id)
						if (existing) {
							// supplement info
							existing.infoString += ', '
							if (entry.gruppe_kurzbz !== null) {
								existing.infoString += entry.gruppe_kurzbz
							} else {
								existing.infoString += entry.kurzbzlang + '-' + entry.semester
									+ (entry.verband ? entry.verband : '')
									+ (entry.gruppe ? entry.gruppe : '')
							}
						} else {
							// entries are supposed to be fetched ordered by non null gruppe_kurzbz first
							// so a new entry will always start with those groups, others are appended afterwards
							entry.infoString = entry.kurzbz + ' - ' + entry.lehrform_kurzbz + ' - '
							if (entry.gruppe_kurzbz !== null) {
								entry.infoString += entry.gruppe_kurzbz
							} else {
								entry.infoString += entry.kurzbzlang + '-' + entry.semester
									+ (entry.verband ? entry.verband : '')
									+ (entry.gruppe ? entry.gruppe : '')
							}

							data.push(entry)
						}
					})

					this.$entryParams.selected_le_info = data.length ? data[0] : null
					this.$entryParams.available_le_info = [...data]
					data.forEach(leEntry => le_ids.push(leEntry.lehreinheit_id))
					this.$entryParams.selected_le_id = le_ids.length ? le_ids[0] : null
					this.$entryParams.available_le_ids = [...le_ids]

					resolve()
				}).finally(() => {
					// TODO: le promise never enters then case... set properties somewhere


					console.log('LEs reloaded from MAUID dropdown')
					console.log('$entryParams', this.$entryParams)

				})
			})

		},
		maUIDChanged(e) {
			console.log('maUIDChanged', e)
			const selected = e.target.selectedOptions

			// reload LEs
			console.log('selected', selected)
			this.$entryParams.selected_maUID = selected[0]._value
			this.reloadAvailableLE().then(() => {
				this.$emit('maUIDchanged')
			})
		},
		async setupData() {
			if(!(this.$entryParams?.permissions?.assistenz
				|| this.$entryParams?.permissions?.admin)) {
				return
			}
			await this.$entryParams.setupPromise.then(() => {
				console.log('mauid dropdown setupPromise then')

				this.internal_available_maUID = this.$entryParams.available_maUID
				this.internal_selected_maUID =  this.$entryParams.selected_maUID
				console.log('this.internal_selected_maUID', this.internal_selected_maUID)

			})
		},
		resetData() {
			console.log('mauidDD resetData')
			this.internal_available_maUID = this.$entryParams.available_maUID
			this.internal_selected_maUID =  this.$entryParams.selected_maUID
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div class="mt-2">
			<label for="maSelect">{{ $p.t('lehre/lektor') }}</label>
			<select id="maSelect" v-model="internal_selected_maUID" @change="maUIDChanged" class="form-control">
				<option v-for="option in internal_available_maUID" :value="option" >
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}