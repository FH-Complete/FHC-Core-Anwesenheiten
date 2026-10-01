export const LehreinheitenDropdown = {
	name: "LehreinheitenDropdown",
	components: {
		Dropdown: primevue.dropdown,
	},
	emits: [
		'leChanged'
	],
	methods: {
		leChanged(e) {
			this.$entryParams.selected_le_id.value = e.value.lehreinheit_id
			this.$entryParams.selected_le_info.value = e.value

			this.$emit('leChanged')
		},
		getOptionLabel(option) {
			return option.infoString
		}
	},
	template: `
		<div>
			<Dropdown @change="leChanged" :style="{'width': '100%'}" :optionLabel="getOptionLabel" 
			v-model="this.$entryParams.selected_le_info.value" :options="$entryParams.available_le_info.value">
				<template #optionsgroup="slotProps">
					<div> {{ option.infoString }} </div>
				</template>
			</Dropdown>
		</div>
	`
}