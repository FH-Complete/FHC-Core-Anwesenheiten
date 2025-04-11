export const KontrollenDropdown = {
	name: "KontrollenDropdown",
	components: {
		Dropdown: primevue.dropdown,
	},
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
	methods: {
		setKontrollen(data){
			this.internal_available_kontrolle = data
			this.internal_selected_kontrolle = data[0]

			this.$emit('kontrolleChanged', this.internal_selected_kontrolle)
		},
		kontrolleChanged(e) {
			this.internal_selected_kontrolle = e.value
			this.$emit('kontrolleChanged', this.internal_selected_kontrolle)
		},
		getOptionLabel(option) {
			return option.datum + ': ' + option.von + ' - ' + option.bis
		}
	},
	mounted() {
	},
	template: `
		<div class="mt-2">
			<Dropdown @change="kontrolleChanged" :style="{'width': '100%'}" :optionLabel="getOptionLabel" 
			v-model="internal_selected_kontrolle" :options="internal_available_kontrolle">
				<template #optionsgroup="slotProps">
					<div> {{kontrolle.datum}}: {{kontrolle.von}} - {{kontrolle.bis}} </div>
				</template>
			</Dropdown>
		</div>
	`
}