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
			this.$fhcApi.get('extensions/FHC-Core-Anwesenheiten/Api/infoGetStudiensemester').then(res => {
				console.log('getStudiensemester', res)

				if(res.meta.status !== "success") return
				this.options = res.data ?? [];

				// TODO: if using this component inside setup globalProp is not set
				this.selectedOption = this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
				this.$emit("ssChanged", this.selectedOption);

				// no need to fetch current semester when it has to be set in global Props
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