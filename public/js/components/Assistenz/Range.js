
export const Range = {
	name: "Range",
	data () {
		return {

		};
	},
	props: {
		modelValue: null
	},
	created() {

	},

	methods: {

	},
	watch:{

	},
	computed: {
		modelKeys() {
			if(!this.modelValue) return []
			return Object.keys(this.modelValue)
		}
	},
	template: `
		<div v-if="modelValue" style="max-height: 400px; overflow-y: auto;">
			<template v-for="key in modelKeys">
				<p>{{key}}: {{modelValue[key]}}</p>
			</template>
		</div>
	`
}

export default Range;