import AbstractWidget from '../../../../../js/components/DashboardWidget/Abstract.js';

import ApiInfo from '../../api/factory/info.js';

/**
 * Lightweight CIS4 dashboard widget for teachers (Mitarbeiter/Lektor).
 * Shows the Lektor's lessons as a rolling 7-day mini timetable (navigable ±7 days) and links
 * each lesson directly into the attendance tool
 * (/extensions/FHC-Core-Anwesenheiten/?stg_kz=..&sem=..&lvid=..&sem_kurzbz=..) in a new tab,
 * where the matching LV-Teil (Lehreinheit) gets preselected automatically.
 */
export default {
	name: "WidgetsAnwesenheitenLektor",
	mixins: [AbstractWidget],
	data() {
		const timezone = (typeof FHC_JS_DATA_STORAGE_OBJECT !== 'undefined' && FHC_JS_DATA_STORAGE_OBJECT.timezone)
			|| 'Europe/Vienna';
		return {
			timezone,
			now: luxon.DateTime.now().setZone(timezone),
			// start of the rolling 7-day window (defaults to today)
			rangeStart: luxon.DateTime.now().setZone(timezone).startOf('day'),
			lessons: [],
			loaded: false,
			loading: false,
			nowTimer: null,
			windowDays: 7
		};
	},
	methods: {
		getLink(path) {
			return (FHC_JS_DATA_STORAGE_OBJECT.app_root +
				FHC_JS_DATA_STORAGE_OBJECT.ci_router + path)
		},
		buildLink(l) {
			return this.getLink('/extensions/FHC-Core-Anwesenheiten/') +
				`?stg_kz=${encodeURIComponent(l.studiengang_kz)}` +
				`&sem=${encodeURIComponent(l.semester)}` +
				`&lvid=${encodeURIComponent(l.lehrveranstaltung_id)}` +
				`&sem_kurzbz=${encodeURIComponent(l.studiensemester_kurzbz)}`
		},
		fmt(time) {
			// beginn/ende come as 'HH:mm:ss' strings -> show 'HH:mm'
			return time ? String(time).slice(0, 5) : ''
		},
		lessonStatus(l) {
			const zone = this.timezone
			const start = luxon.DateTime.fromFormat(`${l.datum} ${l.beginn}`, 'yyyy-MM-dd HH:mm:ss', { zone })
			const end = luxon.DateTime.fromFormat(`${l.datum} ${l.ende}`, 'yyyy-MM-dd HH:mm:ss', { zone })
			const now = this.now

			if (now >= start && now <= end) return 'current'
			if (now < start) return 'future'
			return 'past'
		},
		rowStyle(status) {
			if (status === 'current') return { backgroundColor: 'rgba(25, 135, 84, 0.12)' }
			if (status === 'past') return { opacity: 0.5 }
			return {}
		},
		dayLabel(dt) {
			return dt.setLocale(this.locale).toFormat('ccc, dd.LL.yyyy')
		},
		prev() {
			this.rangeStart = this.rangeStart.minus({ days: this.windowDays })
			this.fetchData()
		},
		next() {
			this.rangeStart = this.rangeStart.plus({ days: this.windowDays })
			this.fetchData()
		},
		today() {
			this.rangeStart = luxon.DateTime.now().setZone(this.timezone).startOf('day')
			this.fetchData()
		},
		fetchData() {
			this.loading = true
			const von = this.rangeStart.toFormat('yyyy-MM-dd')
			const bis = this.rangeEnd.toFormat('yyyy-MM-dd')
			this.$api.call(ApiInfo.getLektorLessons(von, bis))
				.then(res => {
					this.lessons = Array.isArray(res.data) ? res.data : []
				})
				.finally(() => {
					this.loaded = true
					this.loading = false
				})
		}
	},
	computed: {
		locale() {
			return this.$p?.user_locale?.value || 'de-AT'
		},
		rangeEnd() {
			return this.rangeStart.plus({ days: this.windowDays - 1 })
		},
		rangeLabel() {
			return `${this.rangeStart.toFormat('dd.LL.yyyy')} – ${this.rangeEnd.toFormat('dd.LL.yyyy')}`
		},
		todayIso() {
			return this.now.toFormat('yyyy-MM-dd')
		},
		// lessons bucketed into the (non-empty) days of the current window, in order
		days() {
			const byDate = {}
			for (const l of this.lessons) {
				(byDate[l.datum] || (byDate[l.datum] = [])).push({ ...l, _status: this.lessonStatus(l) })
			}
			const out = []
			for (let i = 0; i < this.windowDays; i++) {
				const d = this.rangeStart.plus({ days: i })
				const iso = d.toFormat('yyyy-MM-dd')
				const dayLessons = byDate[iso]
				if (dayLessons && dayLessons.length) {
					out.push({
						iso,
						label: this.dayLabel(d),
						isToday: iso === this.todayIso,
						lessons: dayLessons
					})
				}
			}
			return out
		}
	},
	created() {
		this.fetchData()
		// keep the today marker fresh while the dashboard stays open
		this.nowTimer = setInterval(() => { this.now = luxon.DateTime.now().setZone(this.timezone) }, 60000)
		this.$emit('setConfig', false)
	},
	beforeUnmount() {
		if (this.nowTimer) clearInterval(this.nowTimer)
	},
	template: /*html*/ `
	<div class="widgets-anw-lektor w-100 h-100 d-flex flex-column">
		<div class="d-flex align-items-center gap-1 px-2 py-1 border-bottom">
			<button type="button" class="btn btn-sm btn-outline-secondary" @click="prev" :disabled="loading" title="Vorherige 7 Tage">
				<i class="fa fa-chevron-left"></i>
			</button>
			<button type="button" class="btn btn-sm btn-outline-secondary" @click="next" :disabled="loading" title="Nächste 7 Tage">
				<i class="fa fa-chevron-right"></i>
			</button>
			<button type="button" class="btn btn-sm btn-outline-secondary" @click="today" :disabled="loading">Heute</button>
			<i v-if="loading" class="fa fa-spinner fa-spin text-muted ms-1"></i>
			<span class="small text-muted ms-auto text-nowrap">{{ rangeLabel }}</span>
		</div>

		<div v-if="!loaded" class="flex-grow-1 d-flex justify-content-center align-items-center text-muted">
			<i class="fa fa-spinner fa-spin"></i>
		</div>
		<div v-else-if="!days.length" class="flex-grow-1 d-flex justify-content-center align-items-center text-muted text-center px-2">
			Kein Unterricht in diesem Zeitraum
		</div>
		<div v-else class="flex-grow-1" style="overflow-y: auto">
			<div v-for="day in days" :key="day.iso">
				<div class="anw-lektor-dayhdr small fw-bold px-2 py-1 border-bottom bg-body-secondary"
					:class="{ 'text-primary': day.isToday }">
					{{ day.label }}<span v-if="day.isToday"> · Heute</span>
				</div>
				<a v-for="l in day.lessons" :key="day.iso + '-' + l.lehreinheit_id"
					:href="buildLink(l)"
					target="_blank"
					class="anw-lektor-lesson d-flex align-items-center border-bottom px-2 py-2 text-body text-decoration-none"
					:style="rowStyle(l._status)"
					:title="l.bezeichnung">
					<div class="text-nowrap text-center me-3">
						<div class="fw-bold">{{ fmt(l.beginn) }}</div>
						<div class="small text-muted">{{ fmt(l.ende) }}</div>
					</div>
					<div class="flex-grow-1 overflow-hidden">
						<div class="fw-semibold text-truncate">
							{{ l.bezeichnung }}
							<span v-if="l.lehrform_kurzbz" class="ms-1 px-1 border rounded small text-muted fw-normal">{{ l.lehrform_kurzbz }}</span>
						</div>
						<div class="small text-muted text-truncate">
							<span v-if="l.kurzbz">{{ l.kurzbz }}</span>
							<span v-if="l.gruppen"> · {{ l.gruppen }}</span>
							<span v-if="l.ort_kurzbz"> · {{ l.ort_kurzbz }}</span>
						</div>
					</div>
					<span v-if="l._status === 'current'" class="badge bg-success ms-2">Jetzt</span>
					<i class="fa fa-arrow-up-right-from-square ms-2 text-muted"></i>
				</a>
			</div>
		</div>
	</div>`
};
