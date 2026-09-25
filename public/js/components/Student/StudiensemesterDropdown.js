import ApiInfo from '../../api/factory/info.js';

export const StudiensemesterDropdown = {
	name: "StudiensemesterDropdown",
	emits: [
		'ssChanged'
	],
	data () {
		return {
			options: [],
			selectedOption: [],
		};
	},
	created() {
		this.loadDropdown();
	},
	methods: {
		loadDropdown() {
			this.$api.call(ApiInfo.getStudiensemester())
				.then(res => {

				if(res.meta.status !== "success") return
				this.options = res.data?.[0] ?? [];
				const aktuell = res.data?.[1]?.[0].studiensemester_kurzbz

				this.selectedOption = aktuell ?? this.$entryParams.sem_kurzbz
			});
		},
		ssChanged(e) {
			this.$emit("ssChanged", e.target.value);
		}
	},

	template: `
		<div class="input-group">
			<label class="input-group-text" for="studiensemester">{{ $capitalize($p.t('lehre/studiensemester')) }}</label>
			<select v-model="selectedOption" @change="ssChanged" class="form-select" id="studiensemester">
				<option v-for="option in options" :value="option.studiensemester_kurzbz">
					{{ option.studiensemester_kurzbz }}
				</option>
			</select>
		</div>
	`
}