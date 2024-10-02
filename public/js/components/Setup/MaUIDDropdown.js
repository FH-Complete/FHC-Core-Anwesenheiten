export const MaUIDDropdown = {
	name: "MaUIDDropdown",
	emits: [
		'maUIDChanged'
	],
	data () {
		return {
			errors: null,
			internal_available_maUID: Vue.ref([]),
			internal_selected_maUID: Vue.ref({mitarbeiter_uid: '', infoString: ''}),
			oldLeIds: []
		};
	},
	props: {
		title: ''
	},
	methods: {
		reloadAvailableLE() {
			console.log('reloadAvailableLE')
			const ma_uid = this.$entryParams.selected_maUID
			const sem_kurzbz = this.$entryParams.sem_kurzbz
			const lv_id = this.$entryParams.lv_id
			const le_ids = []

			this.oldLeIds = this.$entryParams.available_le_ids

			return new Promise(resolve => {

				this.$fhcApi.factory.Info.getLehreinheitenForLehrveranstaltungAndMaUid(lv_id, ma_uid, sem_kurzbz).then(res => {
					console.log('getLehreinheitenForLehrveranstaltungAndMaUid res', res)

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

				}).finally(() => {
					resolve()
				})
			})

		},
		maUIDChanged(e) {
			console.log('maUIDChanged', e)
			const selected = e.target.selectedOptions

			// reload LEs
			this.$entryParams.selected_maUID = selected[0]._value
			this.reloadAvailableLE().then(() => {
				this.$emit('maUIDchanged', this.oldLeIds)
			})
		},
		async setupData() {
			console.log('setupData')

			if(!(this.$entryParams?.permissions?.admin)) {
				return
			}
			await this.$entryParams.setupPromise.then(() => {
				console.log('this.$entryParams.setupPromise.then')
				this.internal_available_maUID.value = this.$entryParams.available_maUID
				this.internal_selected_maUID.mitarbeiter_uid =  this.$entryParams.selected_maUID.mitarbeiter_uid
				this.internal_selected_maUID.infoString =  this.$entryParams.selected_maUID.infoString
			})
		},
		resetData() {
			console.log('resetData')
			this.internal_available_maUID.value = this.$entryParams.available_maUID
			this.internal_selected_maUID.mitarbeiter_uid =  this.$entryParams.selected_maUID.mitarbeiter_uid
			this.internal_selected_maUID.infoString =  this.$entryParams.selected_maUID.infoString
		},
		getSelected(option) {
			return option.mitarbeiter_uid === this.internal_selected_maUID.mitarbeiter_uid
		}
	},
	mounted() {
		this.setupData()
	},
	template: `
		<div>
			<label for="maSelect">{{ title }}</label>
			<select id="maSelect" @change="maUIDChanged" class="form-control" >
				<option v-for="option in internal_available_maUID.value" :value="option.mitarbeiter_uid" 
				:selected="getSelected(option)">
				
					<a> {{option.infoString}} </a>
				</option>
			</select>
		</div>
	`
}