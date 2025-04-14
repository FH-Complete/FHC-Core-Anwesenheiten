export const TermineDropdown = {
	name: "TermineDropdown",
	components: {
		Dropdown: primevue.dropdown,
	},
	emits: [
		'terminChanged'
	],
	methods: {
		terminChanged(e) {
			this.$entryParams.selected_termin.value = e.value
			this.$emit('terminChanged')
		},
		getOptionLabel(option) {
			return option.datumFrontend + ': ' + option.beginn + ' - ' + option.ende
		}
	},
	mounted() {
	},
	template: `
		<div class="mt-2">
			<Dropdown @change="terminChanged" :style="{'width': '100%'}" :optionLabel="getOptionLabel" 
			v-model="this.$entryParams.selected_termin.value" :options="$entryParams.available_termine.value" :placeholder="$p.t('global/termineAusStundenplan')">
				<template #optionsgroup="slotProps">
					<div> {{option.datumFrontend}}: {{option.beginn}} - {{option.ende}} </div>
				</template>
			</Dropdown>
		</div>
	`
}