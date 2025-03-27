export const StudiengangDropdown = {
	name: "StudiengangDropdown",
	components: {
		Dropdown: primevue.dropdown,
	},
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
	props: {
		allowedStg: {
			type: Array,
			default: null
		},
		isAdmin: false,
	},
	methods: {
		loadDropdown() {
			this.$fhcApi.factory.Anwesenheiten.Info.getStudiengaenge(this.allowedStg).then(res => {
				if(res.meta.status !== "success") return
				this.options = res.data.retval ?? [];

				this.$entryParams.studiengaengeAdmin = res.data.retval.map(e => e.studiengang_kz)
			});
		},
		sgChanged(e) {
			this.$emit("sgChanged", e);
		},
		getOptionLabel(option) {
			return option.kurzbzlang + ' ' + option.bezeichnung
		}
	},

	template: `
		<div class="col-12">
			<Dropdown @change="sgChanged" :placeholder="$p.t('lehre/studiengang')" :style="{'width': '100%'}" :optionLabel="getOptionLabel" v-model="selectedOption" :options="options" showClear>
				<template #optionsgroup="slotProps">
					<div> {{ option.kurzbzlang }} {{ option.bezeichnung }} </div>
				</template>
			</Dropdown>
		</div>
	`
}