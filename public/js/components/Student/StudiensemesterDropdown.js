
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
			this.$fhcApi.factory.Info.getStudiensemester().then(res => {

				if(res.meta.status !== "success") return
				this.options = res.data?.[0] ?? [];
				const aktuell = res.data?.[1]?.[0].studiensemester_kurzbz

				this.selectedOption = aktuell ?? this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
			});
		},
		ssChanged(e) {
			this.$emit("ssChanged", e.target.value);
		}
	},

	template: `
		<div>
			<select v-model="selectedOption" @change="ssChanged" class="form-control" id="studiensemester">
				<option v-for="option in options" :value="option.studiensemester_kurzbz">
					{{ option.studiensemester_kurzbz }}
				</option>
			</select>
		</div>
	`
}