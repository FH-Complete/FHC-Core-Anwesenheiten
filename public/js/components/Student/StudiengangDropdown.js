export const StudiengangDropdown = {
	name: "StudiengangDropdown",
	emits: [
		'sgChanged'
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
			this.$fhcApi.get('extensions/FHC-Core-Anwesenheiten/Api/infoGetStudiengaenge').then(res => {
				console.log('getStudiengänge', res)

				if(res.meta.status !== "success") return
				this.options = res.data.retval ?? [];

				this.selectedOption = this.$entryParams.stg_kz
				this.$emit("sgChanged", this.selectedOption);

			});
		},
		sgChanged(e) {
			this.$emit("sgChanged", e.target.value);
		}
	},

	template: `
		<div class="col-3"><label for="sgSelect">{{ $p.t('lehre/studiengang') }}</label></div>
		<div class="col-9">
			<select id="sgSelect" v-model="selectedOption" @change="sgChanged" class="form-control">
				<option v-for="option in options" :value="option.studiengang_kz" >
					{{ option.kurzbzlang }} {{ option.bezeichnung }}
				</option>
			</select>
		</div>
	`
}