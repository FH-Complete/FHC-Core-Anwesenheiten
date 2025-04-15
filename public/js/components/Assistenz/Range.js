
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
		<div v-if="modelValue" style="max-height: 400px; overflow-y: auto; display: flex; gap: 2px;">
			<template v-for="key in modelKeys">
				<span style="display: inline-block; margin-right: 2px;"><span style="font-weight: bold">{{key}}</span>: {{modelValue[key]}} </span>
			</template>
		</div>
	`
}

export default Range;