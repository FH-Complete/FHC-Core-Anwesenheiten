/**
 * Timeline of the entschuldigungen and the anwesenheitskontrollen of one person.
 *
 * The component holds a time window [viewStart, viewEnd] and places every bar in
 * percent of that window. It therefore never builds a wide scroll canvas, it resizes
 * with its container and it renders the bars of the current window only.
 *
 * Interaction: the mouse wheel zooms around the cursor, a drag pans, and the overview
 * strip below the lanes shows where the window sits inside the whole data.
 */

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const MIN_SPAN = 30 * MINUTE
const MAX_SPAN = 12 * 366 * DAY

// ruler steps from a quarter hour up to a year. The unit tells the tick generator to
// count in calendar units instead of a fixed duration
const TICK_STEPS = [
	{ ms: 15 * MINUTE, unit: 'minute', value: 15 },
	{ ms: 30 * MINUTE, unit: 'minute', value: 30 },
	{ ms: HOUR, unit: 'hour', value: 1 },
	{ ms: 3 * HOUR, unit: 'hour', value: 3 },
	{ ms: 6 * HOUR, unit: 'hour', value: 6 },
	{ ms: 12 * HOUR, unit: 'hour', value: 12 },
	{ ms: DAY, unit: 'day', value: 1 },
	{ ms: 2 * DAY, unit: 'day', value: 2 },
	{ ms: 7 * DAY, unit: 'week', value: 1 },
	{ ms: 31 * DAY, unit: 'month', value: 1 },
	{ ms: 92 * DAY, unit: 'month', value: 3 },
	{ ms: 183 * DAY, unit: 'month', value: 6 },
	{ ms: 366 * DAY, unit: 'year', value: 1 }
]

const TICK_TARGET_WIDTH = 90 // px between two ruler labels
const WHEEL_ZOOM_FACTOR = 0.0015 // wheel pixels to zoom factor
const BUTTON_ZOOM_FACTOR = 1.6

const pad = (value) => String(value).padStart(2, '0')
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export const AnwTimeline = {
	name: "AnwTimeline",
	props: {
		modelValue: { type: Object, default: null }, // entschuldigung to focus on open
		anwArray: { type: Array, default: null },
		entArray: { type: Array, default: null }
	},
	data() {
		return {
			viewStart: 0,
			viewEnd: 0,
			plotWidth: 800,
			selected: null,
			drag: null,
			overviewDrag: false,
			panMoved: false,
			resizeObserver: null
		}
	},
	computed: {
		entItems() {
			if (!this.entArray) return []

			return this.entArray
				.map(ent => this.buildItem('ent', ent.entschuldigung_id, ent, this.entTone(ent)))
				.filter(item => item)
				.sort((a, b) => a.start - b.start)
		},
		anwItems() {
			if (!this.anwArray) return []

			return this.anwArray
				.map(anw => this.buildItem('anw', anw.anwesenheit_id, anw, this.anwTone(anw)))
				.filter(item => item)
				.sort((a, b) => a.start - b.start)
		},
		allItems() {
			return this.entItems.concat(this.anwItems)
		},
		lanes() {
			return [
				{
					key: 'ent',
					title: this.$capitalize(this.$p.t('global/entschuldigungen')),
					count: this.entItems.length,
					rows: this.packRows(this.entItems)
				},
				{
					key: 'anw',
					title: this.$capitalize(this.$p.t('global/kontrollen')),
					count: this.anwItems.length,
					rows: this.packRows(this.anwItems)
				}
			]
		},
		// the whole data plus today. It limits the panning and it is the scale of the
		// overview strip, so the user keeps the sense of scope
		extent() {
			const now = Date.now()
			let start = now
			let end = now

			this.allItems.forEach(item => {
				start = Math.min(start, item.start)
				end = Math.max(end, item.end)
			})

			const padding = Math.max((end - start) * 0.03, DAY)

			return { start: start - padding, end: end + padding }
		},
		extentSpan() {
			return Math.max(this.extent.end - this.extent.start, MIN_SPAN)
		},
		span() {
			return Math.max(this.viewEnd - this.viewStart, MIN_SPAN)
		},
		tickStep() {
			const wanted = this.span / Math.max(this.plotWidth / TICK_TARGET_WIDTH, 2)

			return TICK_STEPS.find(step => step.ms >= wanted) ?? TICK_STEPS[TICK_STEPS.length - 1]
		},
		ticks() {
			const step = this.tickStep
			const ticks = []
			let time = this.floorToStep(this.viewStart, step)
			let guard = 0

			while (time <= this.viewEnd && guard < 400) {
				guard++
				if (time >= this.viewStart) {
					ticks.push({
						time,
						left: this.timeToPercent(time),
						label: this.formatTick(time, step)
					})
				}
				time = this.addStep(time, step)
			}

			return ticks
		},
		nowLeft() {
			const now = Date.now()
			if (now < this.viewStart || now > this.viewEnd) return null

			return this.timeToPercent(now)
		},
		windowStyle() {
			const left = clamp((this.viewStart - this.extent.start) / this.extentSpan * 100, 0, 100)
			const right = clamp((this.viewEnd - this.extent.start) / this.extentSpan * 100, 0, 100)

			return { left: left + '%', width: Math.max(right - left, 0.5) + '%' }
		},
		viewLabel() {
			const withTime = this.span <= 3 * DAY

			return this.formatMoment(this.viewStart, withTime) + ' – ' + this.formatMoment(this.viewEnd, withTime)
		},
		legend() {
			return [
				{ tone: 'accepted', label: this.$capitalize(this.$p.t('global/akzeptiert')) },
				{ tone: 'rejected', label: this.$capitalize(this.$p.t('global/abgelehnt')) },
				{ tone: 'open', label: this.$capitalize(this.$p.t('global/offen')) },
				{ tone: 'present', label: this.$capitalize(this.$p.t('global/anwesend')) },
				{ tone: 'absent', label: this.$capitalize(this.$p.t('global/abwesend')) },
				{ tone: 'excused', label: this.$capitalize(this.$p.t('global/entschuldigt')) }
			]
		},
		emptyLabel() {
			return this.$p.t('global/noDataAvailable')
		},
		getTooltipAnwTimeline() {
			return {
				value: this.$p.t('global/tooltipAnwTimeline'),
				class: "custom-tooltip"
			}
		}
	},
	methods: {
		// ------------------------------------------------------------------- data
		parseTime(value) {
			if (value instanceof Date) return value.getTime()
			if (!value) return NaN

			// postgres timestamps arrive as '2026-03-01 08:00:00'
			return new Date(String(value).replace(' ', 'T')).getTime()
		},
		buildItem(kind, id, raw, tone) {
			const start = this.parseTime(raw.von)
			const end = this.parseTime(raw.bis)
			if (isNaN(start) || isNaN(end)) return null

			const item = {
				kind,
				id,
				raw,
				tone: tone.tone,
				statusLabel: tone.label,
				key: kind + '-' + (raw.anwesenheit_user_id ?? id),
				start,
				end: Math.max(end, start)
			}

			item.rangeLabel = kind === 'anw'
				? this.formatMoment(item.start, true) + ' – ' + this.formatTime(item.end)
				: this.formatMoment(item.start, false) + ' – ' + this.formatMoment(item.end, false)
			item.tooltip = item.statusLabel + ': '
				+ this.formatMoment(item.start, true) + ' – ' + this.formatMoment(item.end, true)

			return item
		},
		entTone(ent) {
			if (ent.akzeptiert === true) return { tone: 'accepted', label: this.$capitalize(this.$p.t('global/akzeptiert')) }
			if (ent.akzeptiert === false) return { tone: 'rejected', label: this.$capitalize(this.$p.t('global/abgelehnt')) }

			return { tone: 'open', label: this.$capitalize(this.$p.t('global/offen')) }
		},
		anwTone(anw) {
			const permissions = this.$entryParams?.permissions ?? {}

			if (anw.status === (permissions.anwesend_status ?? 'anwesend')) {
				return { tone: 'present', label: this.$capitalize(this.$p.t('global/anwesend')) }
			}
			if (anw.status === (permissions.abwesend_status ?? 'abwesend')) {
				return { tone: 'absent', label: this.$capitalize(this.$p.t('global/abwesend')) }
			}
			if (anw.status === (permissions.entschuldigt_status ?? 'entschuldigt')) {
				return { tone: 'excused', label: this.$capitalize(this.$p.t('global/entschuldigt')) }
			}

			return { tone: 'unknown', label: anw.status ?? '' }
		},
		// items of one lane share a row as long as they do not overlap in time. The
		// packing uses the time only, so a bar never changes its row while zooming
		packRows(items) {
			const rows = []
			const rowEnds = []

			items.forEach(item => {
				let index = rowEnds.findIndex(end => end <= item.start)

				if (index === -1) {
					index = rows.length
					rows.push([])
					rowEnds.push(-Infinity)
				}

				rows[index].push(item)
				rowEnds[index] = Math.max(rowEnds[index], item.end)
			})

			return rows
		},
		visibleItems(row) {
			return row.filter(item => item.end >= this.viewStart && item.start <= this.viewEnd)
		},
		// ------------------------------------------------------------------- view
		setView(start, end) {
			const span = clamp(end - start, MIN_SPAN, MAX_SPAN)

			// the window stays next to the data, this stops the endless empty panning
			const center = clamp((start + end) / 2, this.extent.start - span / 2, this.extent.end + span / 2)

			this.viewStart = center - span / 2
			this.viewEnd = center + span / 2
		},
		panBy(milliseconds) {
			this.setView(this.viewStart + milliseconds, this.viewEnd + milliseconds)
		},
		zoomAt(factor, ratio) {
			const anchor = this.viewStart + ratio * this.span
			const span = clamp(this.span * factor, MIN_SPAN, MAX_SPAN)

			this.setView(anchor - ratio * span, anchor + (1 - ratio) * span)
		},
		zoomIn() {
			this.zoomAt(1 / BUTTON_ZOOM_FACTOR, 0.5)
		},
		zoomOut() {
			this.zoomAt(BUTTON_ZOOM_FACTOR, 0.5)
		},
		fitAll() {
			this.setView(this.extent.start, this.extent.end)
		},
		goToday() {
			const now = Date.now()

			this.setView(now - this.span / 2, now + this.span / 2)
		},
		focusItem(item) {
			this.selected = item

			const span = Math.max((item.end - item.start) * 3, 12 * HOUR)
			const center = (item.start + item.end) / 2

			this.setView(center - span / 2, center + span / 2)
		},
		selectItem(item) {
			// a pan ends with a click, it must not select the bar below the cursor
			if (this.panMoved) {
				this.panMoved = false
				return
			}

			this.selected = this.isSelected(item) ? null : item
		},
		isSelected(item) {
			return !!this.selected && this.selected.key === item.key
		},
		initView() {
			const focus = this.modelValue
				? this.entItems.find(item => item.id === this.modelValue.entschuldigung_id)
				: null

			if (focus) {
				this.focusItem(focus)
				return
			}

			this.fitAll()
		},
		onDataChanged(focus) {
			if (!this.anwArray || !this.entArray) return

			this.$nextTick(() => {
				this.observePlotWidth()
				if (focus || !this.viewEnd) this.initView()
			})
		},
		observePlotWidth() {
			const plot = this.$refs.plot
			if (!plot || this.resizeObserver) return

			this.plotWidth = plot.clientWidth || this.plotWidth

			if (typeof ResizeObserver === 'undefined') return

			this.resizeObserver = new ResizeObserver(entries => {
				this.plotWidth = entries[0].contentRect.width || this.plotWidth
			})
			this.resizeObserver.observe(plot)
		},
		// ------------------------------------------------------------------ input
		wheelDelta(event) {
			if (event.deltaMode === 1) return event.deltaY * 16 // lines
			if (event.deltaMode === 2) return event.deltaY * 400 // pages

			return event.deltaY
		},
		onWheel(event) {
			const rect = this.$refs.plot.getBoundingClientRect()
			if (!rect.width) return

			// shift and a horizontal wheel pan, the plain wheel zooms
			if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
				const pixels = event.shiftKey ? this.wheelDelta(event) : event.deltaX

				this.panBy(pixels / rect.width * this.span)
				return
			}

			const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)

			this.zoomAt(Math.exp(this.wheelDelta(event) * WHEEL_ZOOM_FACTOR), ratio)
		},
		onPointerDown(event) {
			if (event.button !== 0) return

			this.panMoved = false
			this.drag = {
				x: event.clientX,
				width: this.$refs.plot.getBoundingClientRect().width,
				start: this.viewStart,
				end: this.viewEnd
			}
			event.currentTarget.setPointerCapture(event.pointerId)
		},
		onPointerMove(event) {
			if (!this.drag || !this.drag.width) return

			const distance = event.clientX - this.drag.x
			if (Math.abs(distance) > 3) this.panMoved = true

			const shift = -distance / this.drag.width * (this.drag.end - this.drag.start)
			this.setView(this.drag.start + shift, this.drag.end + shift)
		},
		onPointerUp(event) {
			if (!this.drag) return

			this.drag = null
			this.releasePointer(event)
		},
		onOverviewDown(event) {
			this.overviewDrag = true
			event.currentTarget.setPointerCapture(event.pointerId)
			this.moveWindowTo(event)
		},
		onOverviewMove(event) {
			if (!this.overviewDrag) return

			this.moveWindowTo(event)
		},
		onOverviewUp(event) {
			this.overviewDrag = false
			this.releasePointer(event)
		},
		releasePointer(event) {
			if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return

			event.currentTarget.releasePointerCapture(event.pointerId)
		},
		moveWindowTo(event) {
			const rect = this.$refs.overview.getBoundingClientRect()
			if (!rect.width) return

			const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
			const center = this.extent.start + ratio * this.extentSpan

			this.setView(center - this.span / 2, center + this.span / 2)
		},
		// ----------------------------------------------------------------- render
		timeToPercent(time) {
			return (time - this.viewStart) / this.span * 100
		},
		barStyle(item) {
			return {
				left: this.timeToPercent(item.start) + '%',
				width: Math.max((item.end - item.start) / this.span * 100, 0.05) + '%'
			}
		},
		overviewBarStyle(item) {
			return {
				left: clamp((item.start - this.extent.start) / this.extentSpan * 100, 0, 100) + '%',
				width: Math.max((item.end - item.start) / this.extentSpan * 100, 0.2) + '%',
				top: item.kind === 'ent' ? '3px' : '13px'
			}
		},
		// ----------------------------------------------------------------- format
		formatTime(time) {
			const date = new Date(time)

			return pad(date.getHours()) + ':' + pad(date.getMinutes())
		},
		formatMoment(time, withTime) {
			const date = new Date(time)
			const day = pad(date.getDate()) + '.' + pad(date.getMonth() + 1) + '.' + date.getFullYear()

			return withTime ? day + ' ' + this.formatTime(time) : day
		},
		floorToStep(time, step) {
			const date = new Date(time)
			date.setSeconds(0, 0)

			if (step.unit === 'minute') {
				date.setMinutes(Math.floor(date.getMinutes() / step.value) * step.value)
				return date.getTime()
			}

			date.setMinutes(0)

			if (step.unit === 'hour') {
				date.setHours(Math.floor(date.getHours() / step.value) * step.value)
				return date.getTime()
			}

			date.setHours(0)

			if (step.unit === 'day') return date.getTime()

			if (step.unit === 'week') {
				date.setDate(date.getDate() - ((date.getDay() + 6) % 7)) // back to monday
				return date.getTime()
			}

			date.setDate(1)

			if (step.unit === 'month') {
				date.setMonth(Math.floor(date.getMonth() / step.value) * step.value)
				return date.getTime()
			}

			date.setMonth(0)

			return date.getTime()
		},
		addStep(time, step) {
			if (step.unit === 'minute' || step.unit === 'hour') return time + step.ms

			const date = new Date(time)

			if (step.unit === 'day') date.setDate(date.getDate() + step.value)
			else if (step.unit === 'week') date.setDate(date.getDate() + 7 * step.value)
			else if (step.unit === 'month') date.setMonth(date.getMonth() + step.value)
			else date.setFullYear(date.getFullYear() + step.value)

			return date.getTime()
		},
		formatTick(time, step) {
			const date = new Date(time)

			// a tick at midnight carries the date, otherwise a window over several days
			// would only show times and the day would stay unclear
			if (step.unit === 'minute' || step.unit === 'hour') {
				if (date.getHours() === 0 && date.getMinutes() === 0) return pad(date.getDate()) + '.' + pad(date.getMonth() + 1) + '.'

				return this.formatTime(time)
			}
			if (step.unit === 'day' || step.unit === 'week') return pad(date.getDate()) + '.' + pad(date.getMonth() + 1) + '.'
			if (step.unit === 'month') return date.toLocaleDateString(undefined, { month: 'short' }) + ' ' + String(date.getFullYear()).slice(2)

			return String(date.getFullYear())
		}
	},
	watch: {
		entArray() {
			this.onDataChanged(false)
		},
		anwArray() {
			this.onDataChanged(false)
		},
		modelValue: {
			handler() {
				this.onDataChanged(true)
			},
			deep: true
		}
	},
	mounted() {
		this.onDataChanged(false)
	},
	unmounted() {
		if (!this.resizeObserver) return

		this.resizeObserver.disconnect()
		this.resizeObserver = null
	},
	template: /*html*/ `
	<div v-if="anwArray && entArray" class="anw-tl row g-3">

		<div class="col-xl-3">
			<div class="card h-100">
				<div class="card-header py-2 d-flex align-items-center justify-content-between">
					<span class="fw-bold">{{ lanes[0].title }}</span>
					<span class="badge bg-secondary">{{ lanes[0].count }}</span>
				</div>
				<div class="anw-tl-list list-group list-group-flush">
					<button
						v-for="item in entItems"
						:key="item.key"
						type="button"
						class="list-group-item list-group-item-action d-flex align-items-center gap-2 py-1 px-2"
						:class="{ 'anw-tl-list-item--selected': isSelected(item) }"
						@click="focusItem(item)"
					>
						<span class="anw-tl-dot" :class="'anw-tl-tone--' + item.tone"></span>
						<span class="flex-grow-1 text-start small">{{ item.rangeLabel }}</span>
						<span class="small text-muted">#{{ item.id }}</span>
					</button>
					<div v-if="!entItems.length" class="list-group-item small text-muted py-1 px-2">{{ emptyLabel }}</div>
				</div>

				<div class="card-header border-top py-2 d-flex align-items-center justify-content-between">
					<span class="fw-bold">{{ lanes[1].title }}</span>
					<span class="badge bg-secondary">{{ lanes[1].count }}</span>
				</div>
				<div class="anw-tl-list list-group list-group-flush">
					<button
						v-for="item in anwItems"
						:key="item.key"
						type="button"
						class="list-group-item list-group-item-action d-flex align-items-center gap-2 py-1 px-2"
						:class="{ 'anw-tl-list-item--selected': isSelected(item) }"
						@click="focusItem(item)"
					>
						<span class="anw-tl-dot" :class="'anw-tl-tone--' + item.tone"></span>
						<span class="flex-grow-1 text-start small">{{ item.rangeLabel }}</span>
						<span class="small text-muted">#{{ item.id }}</span>
					</button>
					<div v-if="!anwItems.length" class="list-group-item small text-muted py-1 px-2">{{ emptyLabel }}</div>
				</div>
			</div>
		</div>

		<div class="col-xl-9">
			<div class="card h-100">
				<div class="card-header py-2 d-flex flex-wrap align-items-center gap-2">
					<span class="fw-bold">{{ viewLabel }}</span>

					<div class="btn-group btn-group-sm ms-auto">
						<button type="button" class="btn btn-outline-secondary" title="Zoom -" @click="zoomOut">
							<i class="fa-solid fa-magnifying-glass-minus"></i>
						</button>
						<button type="button" class="btn btn-outline-secondary" title="Zoom +" @click="zoomIn">
							<i class="fa-solid fa-magnifying-glass-plus"></i>
						</button>
					</div>
					<div class="btn-group btn-group-sm">
						<button type="button" class="btn btn-outline-secondary" title="Heute" @click="goToday">
							<i class="fa-solid fa-calendar-day"></i>
						</button>
						<button type="button" class="btn btn-outline-secondary" @click="fitAll">
							{{ $capitalize($p.t('global/alle')) }}
						</button>
					</div>
					<span v-tooltip.bottom="getTooltipAnwTimeline" class="text-muted ms-1">
						<i class="fa fa-circle-question"></i>
					</span>
				</div>

				<div class="card-body py-2">
					<div
						ref="plot"
						class="anw-tl-plot"
						:class="{ 'anw-tl-plot--panning': !!drag }"
						@wheel.prevent="onWheel"
						@pointerdown="onPointerDown"
						@pointermove="onPointerMove"
						@pointerup="onPointerUp"
						@pointercancel="onPointerUp"
					>
						<div class="anw-tl-ruler">
							<div
								v-for="tick in ticks"
								:key="'label-' + tick.time"
								class="anw-tl-ruler-label"
								:style="{ left: tick.left + '%' }"
							>{{ tick.label }}</div>
						</div>

						<div class="anw-tl-grid">
							<div
								v-for="tick in ticks"
								:key="'line-' + tick.time"
								class="anw-tl-gridline"
								:style="{ left: tick.left + '%' }"
							></div>
							<div v-if="nowLeft !== null" class="anw-tl-now" :style="{ left: nowLeft + '%' }"></div>
						</div>

						<div v-for="lane in lanes" :key="lane.key" class="anw-tl-lane">
							<div class="anw-tl-lane-title">{{ lane.title }}</div>
							<div class="anw-tl-band">
								<div v-for="(row, index) in lane.rows" :key="lane.key + '-row-' + index" class="anw-tl-row">
									<div
										v-for="item in visibleItems(row)"
										:key="item.key"
										class="anw-tl-bar"
										:class="['anw-tl-tone--' + item.tone, { 'anw-tl-bar--selected': isSelected(item) }]"
										:style="barStyle(item)"
										:title="item.tooltip"
										@click.stop="selectItem(item)"
									></div>
								</div>
								<div v-if="!lane.rows.length" class="anw-tl-row"></div>
							</div>
						</div>
					</div>

					<div
						ref="overview"
						class="anw-tl-overview"
						@pointerdown="onOverviewDown"
						@pointermove="onOverviewMove"
						@pointerup="onOverviewUp"
						@pointercancel="onOverviewUp"
					>
						<div
							v-for="item in allItems"
							:key="'overview-' + item.key"
							class="anw-tl-overview-bar"
							:class="'anw-tl-tone--' + item.tone"
							:style="overviewBarStyle(item)"
						></div>
						<div class="anw-tl-window" :style="windowStyle"></div>
					</div>
					<div class="d-flex justify-content-between small text-muted">
						<span>{{ formatMoment(extent.start, false) }}</span>
						<span>{{ formatMoment(extent.end, false) }}</span>
					</div>
				</div>

				<div class="card-footer py-2">
					<div class="d-flex flex-wrap gap-3 small">
						<span v-for="entry in legend" :key="entry.tone" class="d-flex align-items-center gap-1">
							<span class="anw-tl-dot" :class="'anw-tl-tone--' + entry.tone"></span>{{ entry.label }}
						</span>
					</div>

					<div class="anw-tl-details d-flex flex-wrap align-items-baseline gap-3 small mt-2">
						<template v-if="selected">
							<span class="anw-tl-badge" :class="'anw-tl-tone--' + selected.tone">{{ selected.statusLabel }}</span>
							<span><span class="text-muted">{{ $capitalize($p.t('ui/von')) }}:</span> {{ formatMoment(selected.start, true) }}</span>
							<span><span class="text-muted">{{ $capitalize($p.t('global/bis')) }}:</span> {{ formatMoment(selected.end, true) }}</span>
							<span v-if="selected.raw.le_bezeichnung">
								<span class="text-muted">{{ $capitalize($p.t('lehre/lehreinheit')) }}:</span>
								{{ selected.raw.le_bezeichnung }}
								<template v-if="selected.raw.lehrform_kurzbz">({{ selected.raw.lehrform_kurzbz }})</template>
							</span>
							<span v-if="selected.raw.notiz">
								<span class="text-muted">{{ $capitalize($p.t('global/notiz')) }}:</span> {{ selected.raw.notiz }}
							</span>
							<span class="ms-auto text-muted">#{{ selected.id }}</span>
						</template>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div v-else class="text-center py-5">
		<i class="fa-solid fa-spinner fa-pulse fa-3x"></i>
	</div>
	`
}

export default AnwTimeline;
