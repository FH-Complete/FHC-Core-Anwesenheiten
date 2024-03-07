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
	methods: {
		loadDropdown() {
			//TODO (david) bessere lösung finden
			Vue.$fhcapi.Info.getStudiensemester().then(response => {
				console.log('getStudiensemester', response)

				// TODO(johann): rework status check once fhcapi plugin is installed

				this.options = response.data.data ?? [];
				if (this.options.length > 0) {
					Vue.$fhcapi.Info.getAktStudiensemester().then(response => {

						// TODO(johann): rework status check once fhcapi plugin is installed
						console.log('getAktStudiensemester', response)
						this.selectedOption = response.data.data[0].studiensemester_kurzbz;
						this.$emit("ssChanged", this.selectedOption);
					})
				}
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