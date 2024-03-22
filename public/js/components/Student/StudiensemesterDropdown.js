export const StudiensemesterDropdown = {
	name: "StudiensemesterDropdown",
	emits: [
		'ssChanged'
	],
	data () {
		return {
			options: [],
			selectedOption: [],
			errors: null,
		};
	},
	created() {
		this.loadDropdown();
	},
	props() {

	},
	methods: {
		loadDropdown() {
			//TODO (david) bessere lösung finden
			Vue.$fhcapi.Info.getStudiensemester().then(response => {
				console.log('getStudiensemester', response)

				// TODO(johann): rework status check once fhcapi plugin is installed

				this.options = response.data.data ?? [];

				// TODO: if using this component inside setup globalProp is not set
				this.selectedOption = this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
				this.$emit("ssChanged", this.selectedOption);

				// no need to fetch current semester when it has to be set in global Props

				// if (this.options.length > 0) {
				// 	Vue.$fhcapi.Info.getAktStudiensemester().then(response => {
				//
				// 		// TODO(johann): rework status check once fhcapi plugin is installed
				// 		console.log('getAktStudiensemester', response)
				// 		this.selectedOption = response.data.data[0].studiensemester_kurzbz;
				// 		this.$emit("ssChanged", this.selectedOption);
				// 	})
				// }
			});
		},
		ssChanged(e) {
			this.$emit("ssChanged", e.target.value);
		}
	},

	template: `
		<div>
			<select v-model="selectedOption" @change="ssChanged" class="form-control">
				<label>Studiensemester</label>
				<option v-for="option in options" :value="option.studiensemester_kurzbz" >
					{{ option.studiensemester_kurzbz }}
				</option>
			</select>
		</div>
	`
}