// below the bootstrap md breakpoint the student views show lists instead of tables. A table
// on a phone needs a horizontal scroll and hides its last columns behind it
const NARROW_QUERY = '(max-width: 767.98px)'

export default {
	data() {
		return {
			isNarrow: window.matchMedia(NARROW_QUERY).matches
		}
	},
	methods: {
		onNarrowChange(event) {
			this.isNarrow = event.matches
		}
	},
	mounted() {
		this.narrowQuery = window.matchMedia(NARROW_QUERY)
		this.narrowQuery.addEventListener('change', this.onNarrowChange)
	},
	unmounted() {
		this.narrowQuery.removeEventListener('change', this.onNarrowChange)
	}
}
