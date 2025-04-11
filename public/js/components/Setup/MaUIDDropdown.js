export const MaUIDDropdown = {
	name: "MaUIDDropdown",
	components: {
		Dropdown: primevue.dropdown,
	},
	emits: [
		'maUIDChanged'
	],
	props: {
		title: ''
	},
	methods: {
		maUIDChanged(e) {

			// reload LEs
			this.$entryParams.selected_maUID.value = e.value
			this.$entryParams.handleLeSetup(
				this.$entryParams.lv_id,
				this.$entryParams.selected_maUID.value.mitarbeiter_uid,
				this.$entryParams.sem_kurzbz,
				[]
			).then(() => {
				this.$emit('maUIDchanged')
			})
		},
		getSelected(option) {
			return option.mitarbeiter_uid === this.$entryParams.selected_maUID.value?.mitarbeiter_uid
		},
		getOptionLabel(option) {
			return option.infoString
		}
	},
	template: `
		<div>
			<Dropdown @change="maUIDChanged" :style="{'width': '100%'}" :optionLabel="getOptionLabel" 
				v-model="this.$entryParams.selected_maUID.value" :options="$entryParams.available_maUID.value">
				<template #optionsgroup="slotProps">
					<div> {{ option.infoString }} </div>
				</template>
			</Dropdown>
		</div>
	`
}