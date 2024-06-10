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
			this.$fhcApi.Info.getStudiensemester().then(res => {
				console.log('getStudiensemester', res)

				if(res.meta.status !== "success") return
				this.options = res.data ?? [];

				this.selectedOption = this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
				this.$emit("ssChanged", this.selectedOption);
			});
		},
		ssChanged(e) {
			this.$emit("ssChanged", e.target.value);
		}
	},

	template: `
		<div class="col-3"><label for="studiensemester">{{ $p.t('lehre/studiensemester') }}</label></div>
		<div class="col-3">
			<select v-model="selectedOption" @change="ssChanged" class="form-control" id="studiensemester">
				<option v-for="option in options" :value="option.studiensemester_kurzbz">
					{{ option.studiensemester_kurzbz }}
				</option>
			</select>
		</div>
	`
}