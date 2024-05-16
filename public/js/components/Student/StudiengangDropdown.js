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
		allowedStg: []
	},
	methods: {
		loadDropdown() {
			console.log('loadDropdown', this.allowedStg)
			this.$fhcApi.post('extensions/FHC-Core-Anwesenheiten/Api/infoGetStudiengaenge',
				{allowed_stg: this.allowedStg}).then(res => {
				console.log('getStudiengänge', res)

				if(res.meta.status !== "success") return
				this.options = res.data.retval ?? [];

				// this.selectedOption = this.$entryParams.stg_kz

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
<!--		<div class="col-3"><label for="sgSelect">{{ $p.t('lehre/studiengang') }}</label></div>-->
		<div class="col-12">
<!--			<select id="sgSelect" v-model="selectedOption" @change="sgChanged" class="form-control">-->
<!--				<option v-for="option in options" :value="option.studiengang_kz" >-->
<!--					{{ option.kurzbzlang }} {{ option.bezeichnung }}-->
<!--				</option>-->
<!--			</select>-->
			<Dropdown @change="sgChanged" :placeholder="$p.t('lehre/studiengang')" :style="{'width': '100%'}" :optionLabel="getOptionLabel" v-model="selectedOption" :options="options" showClear>
				<template #optionsgroup="slotProps">
					<div> {{ option.kurzbzlang }} {{ option.bezeichnung }} </div>
				</template>
			</Dropdown>
		</div>
	`
}