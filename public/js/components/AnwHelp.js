const PANEL_WIDTH = 512 // px, the panel on a wide screen
const PANEL_MARGIN = 16 // px between the panel and the viewport edge
const PANEL_GAP = 6 // px between the icon and the panel
const PANEL_MIN_HEIGHT = 240 // px, with less space below the icon the panel opens above it

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * Help icon with a text panel.
 *
 * A v-tooltip with the .custom-tooltip class runs out of the viewport on a phone and gets
 * squeezed at the right edge of the screen (.custom-tooltip adds 160 px to the left). This
 * panel is fixed and stays inside the viewport, so neither a scrolling container nor a
 * modal body can clip it.
 *
 * A mouse opens the panel on hover. Touch has no hover, a tap on the icon toggles it.
 */
export default {
	name: 'AnwHelp',
	props: {
		text: { type: String, default: '' },
		buttonClass: { type: [String, Array, Object], default: '' }
	},
	data() {
		return {
			open: false,
			panelStyle: null
		}
	},
	methods: {
		onHover(event, open) {
			if (event.pointerType === 'mouse') this.setOpen(open)
		},
		onClick(event) {
			// the hover already opened it for a mouse, the click must not close it again
			this.setOpen(event.pointerType === 'mouse' ? true : !this.open)
		},
		setOpen(open) {
			if (open) this.place()

			this.open = open
		},
		// the panel opens below the icon, above it when there is more space there. It grows
		// away from the nearer side of the viewport and stays inside it on a phone too
		place() {
			const icon = this.$refs.button?.getBoundingClientRect()
			if (!icon) return

			const viewWidth = document.documentElement.clientWidth
			const viewHeight = document.documentElement.clientHeight
			const width = Math.min(PANEL_WIDTH, viewWidth - 2 * PANEL_MARGIN)
			const below = viewHeight - icon.bottom - PANEL_GAP - PANEL_MARGIN
			const above = icon.top - PANEL_GAP - PANEL_MARGIN
			const left = icon.left + icon.width / 2 < viewWidth / 2 ? icon.left : icon.right - width
			const style = {
				left: clamp(left, PANEL_MARGIN, viewWidth - PANEL_MARGIN - width) + 'px',
				width: width + 'px'
			}

			if (below >= PANEL_MIN_HEIGHT || below >= above) {
				style.top = icon.bottom + PANEL_GAP + 'px'
				style.maxHeight = below + 'px'
			} else {
				style.bottom = viewHeight - icon.top + PANEL_GAP + 'px'
				style.maxHeight = above + 'px'
			}

			this.panelStyle = style
		},
		// a tap outside closes the help. A scroll moves the icon away from the fixed panel,
		// only the scroll inside the panel keeps it open
		onPointerDown(event) {
			if (!this.$el.contains(event.target)) this.setOpen(false)
		},
		onScroll(event) {
			if (event.target !== this.$refs.panel) this.setOpen(false)
		},
		removeListeners() {
			document.removeEventListener('pointerdown', this.onPointerDown, true)
			window.removeEventListener('scroll', this.onScroll, true)
			window.removeEventListener('resize', this.place)
		}
	},
	watch: {
		open(open) {
			if (!open) return this.removeListeners()

			document.addEventListener('pointerdown', this.onPointerDown, true)
			window.addEventListener('scroll', this.onScroll, true)
			window.addEventListener('resize', this.place)
		}
	},
	// the tabs of the student view stay alive, a hidden tab must not keep the panel open
	deactivated() {
		this.open = false
	},
	unmounted() {
		this.removeListeners()
	},
	template: /*html*/ `
	<span
		class="anw-help"
		@pointerenter="onHover($event, true)"
		@pointerleave="onHover($event, false)"
	>
		<button
			ref="button"
			type="button"
			class="btn btn-link p-0 anw-help-btn"
			:class="buttonClass"
			:aria-label="$p.t('ui/hilfe')"
			:aria-expanded="open"
			@click="onClick"
		>
			<i class="fa fa-circle-question" aria-hidden="true"></i>
		</button>
		<span
			v-if="open"
			ref="panel"
			class="anw-help-text"
			:style="panelStyle"
			role="tooltip"
			@click="setOpen(false)"
		>{{ text }}</span>
	</span>`
};
