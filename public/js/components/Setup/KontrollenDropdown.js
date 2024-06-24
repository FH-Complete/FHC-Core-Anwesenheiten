export const KontrollenDropdown = {
	name: "KontrollenDropdown",
	emits: [
		'kontrolleChanged'
	],
	data () {
		return {
			errors: null,
			internal_available_kontrolle: [],
			internal_selected_kontrolle: null
		};
	},
	props: {

	},
	methods: {
		setKontrollen(data){
			console.log('setKontrollen dropdown', data)
			this.internal_available_kontrolle = data
			this.internal_selected_kontrolle = data[0]

			this.$emit('kontrolleChanged', this.internal_selected_kontrolle)
		},
		kontrolleChanged(e) {
			console.log('kontrolleChanged', e)
			const selected = e.target.selectedOptions

			this.internal_selected_kontrolle = selected[0]._value
			this.$emit('kontrolleChanged', this.internal_selected_kontrolle)
		},
	},
	mounted() {
	},
	template: `
		<div class="mt-2">
			<label for="kontrolleSelect">{{ $p.t('global/deletableKontrollen') }}</label>
			<select id="kontrolleSelect" v-model="internal_selected_kontrolle" @change="kontrolleChanged" class="form-control">
				<option v-for="kontrolle in internal_available_kontrolle" :value="kontrolle" >
					{{kontrolle.datum}}: {{kontrolle.von}} - {{kontrolle.bis}}
				</option>
			</select>
		</div>
	`
}