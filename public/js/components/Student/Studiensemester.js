export const StudiensemesterDropdown = {
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
				this.options = response;
				if (this.options.length > 0) {
					Vue.$fhcapi.Info.getAktStudiensemester().then(response => {
						this.selectedOption = response[0].studiensemester_kurzbz;
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
		<div class="col-md-2">
			<select v-model="selectedOption" @change="ssChanged" class="form-control">
				<option>Studiensemester</option>
				<option v-for="option in options" :value="option.studiensemester_kurzbz" >
					{{ option.studiensemester_kurzbz }}
				</option>
			</select>
		</div>
	`
}