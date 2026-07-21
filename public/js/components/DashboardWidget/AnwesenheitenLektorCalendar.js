import AbstractWidget from '../../../../../js/components/DashboardWidget/Abstract.js';

import FhcCalendar from '../../../../../js/components/Calendar/Base.js';
import ModeList from '../../../../../js/components/Calendar/Mode/List.js';
import { useEventLoader } from '../../../../../js/composables/EventLoader.js';

import ApiInfo from '../../api/factory/info.js';

const DEFAULT_TZ = 'Europe/Vienna';

function getTimezone() {
	return (typeof FHC_JS_DATA_STORAGE_OBJECT !== 'undefined' && FHC_JS_DATA_STORAGE_OBJECT.timezone)
		|| DEFAULT_TZ;
}

/**
 * Map one raw lesson row onto the event shape the calendar Base expects.
 */
function lessonToEvent(l) {
	const zone = getTimezone();
	const start = luxon.DateTime.fromFormat(`${l.datum} ${l.beginn}`, 'yyyy-MM-dd HH:mm:ss', { zone });
	const end = luxon.DateTime.fromFormat(`${l.datum} ${l.ende}`, 'yyyy-MM-dd HH:mm:ss', { zone });
	return {
		...l,
		type: 'anwlesson',
		anwlesson_id: `${l.lehreinheit_id}_${l.datum}_${l.beginn}`,
		isostart: start.toISO(),
		isoend: end.toISO()
	};
}

/**
 * Calendar-based CIS4 dashboard widget for teachers (Mitarbeiter/Lektor).
 *
 * Second version of AnwesenheitenLektor.js. Same purpose, but rendered through the shared
 * fhc-calendar instead of a hand-rolled mini timetable.
 * 
 */
export default {
	name: "WidgetsAnwesenheitenLektorCalendar",
	components: {
		FhcCalendar
	},
	mixins: [AbstractWidget],
	data() {
		const timezone = getTimezone();
		return {
			timezone,
			now: luxon.DateTime.now().setZone(timezone),
			nowTimer: null,
			modes: {
				list: Vue.markRaw(ModeList)
			},
			modeOptions: {
				list: {
					length: 7
				}
			}
		};
	},
	computed: {
		locale() {
			return this.$p?.user_locale?.value || 'de-AT';
		}
	},
	methods: {
		getLink(path) {
			return (FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router + path);
		},
		// deep link into the attendance tool with the params it needs to preselect the LV-Teil
		buildLink(l) {
			return this.getLink('/extensions/FHC-Core-Anwesenheiten/') +
				`?stg_kz=${encodeURIComponent(l.studiengang_kz)}` +
				`&sem=${encodeURIComponent(l.semester)}` +
				`&lvid=${encodeURIComponent(l.lehrveranstaltung_id)}` +
				`&sem_kurzbz=${encodeURIComponent(l.studiensemester_kurzbz)}`;
		},
		timeFormat(time) {
			// beginn/ende come as 'HH:mm:ss' strings -> show 'HH:mm'
			return time ? String(time).slice(0, 5) : '';
		},
		// per-tile styling: dim past lessons, tint the one running right now
		eventStyle(l) {
			const zone = this.timezone;
			const start = luxon.DateTime.fromISO(l.isostart, { zone });
			const end = luxon.DateTime.fromISO(l.isoend, { zone });
			if (this.now >= start && this.now <= end)
				return { backgroundColor: 'rgba(25, 135, 84, 0.12)' };
			if (this.now > end)
				return { opacity: 0.5 };
			return {};
		},
		isCurrent(l) {
			const zone = this.timezone;
			const start = luxon.DateTime.fromISO(l.isostart, { zone });
			const end = luxon.DateTime.fromISO(l.isoend, { zone });
			return this.now >= start && this.now <= end;
		},
		// Base emits `click:event` (customEvent, lesson). We cancel the default (the standard
		// event modal) and open the attendance deep link instead. See CALENDAR INTEGRATION NOTES.
		onEventClick(evt, l) {
			if (evt && typeof evt.preventDefault === 'function')
				evt.preventDefault();
			if (l)
				window.open(this.buildLink(l), '_blank', 'noopener');
		},
		updateRange(rangeInterval) {
			this.rangeInterval = rangeInterval;
		}
	},
	setup() {
		// $api is provided app-wide; the composables use the same injection.
		const $api = Vue.inject('$api');
		const rangeInterval = Vue.ref(null);

		// The shared useEventLoader expects each promise to resolve to { meta:{status}, data:[events] }.
		// Our extension endpoint returns raw lesson rows, so we adapt them in the .then while keeping
		// the standard { meta, data } envelope that terminateWithSuccess produces.
		const getPromiseFunc = (start, end) => [
			$api.call(ApiInfo.getLektorLessons(start.toISODate(), end.toISODate()))
				.then(res => ({
					meta: res.meta,
					data: Array.isArray(res.data) ? res.data.map(lessonToEvent) : []
				}))
		];

		const { events } = useEventLoader(rangeInterval, getPromiseFunc);

		return {
			rangeInterval,
			events
		};
	},
	created() {
		// keep the "now" marker fresh while the dashboard stays open (past/current tinting)
		this.nowTimer = setInterval(() => { this.now = luxon.DateTime.now().setZone(this.timezone); }, 60000);
		this.$emit('setConfig', false);
	},
	beforeUnmount() {
		if (this.nowTimer)
			clearInterval(this.nowTimer);
	},
	template: /*html*/`
	<div class="dashboard-widget-anwesenheiten-lektor-cal d-flex flex-column h-100">
		<fhc-calendar
			:modes="modes"
			:mode-options="modeOptions"
			:timezone="timezone"
			:locale="locale"
			:events="events || []"
			@update:range="updateRange"
			@click:event="onEventClick"
		>
			<template v-slot="{ event, mode }">
				<div
					v-if="!event"
					class="h-100 d-flex justify-content-center align-items-center text-muted text-center px-2"
				>
					{{ $p.t('global/anwKeinUnterricht') }}
				</div>
				<a
					v-else
					:href="buildLink(event)"
					target="_blank"
					rel="noopener"
					class="anw-lektor-cal-lesson d-flex align-items-center px-2 py-2 text-body text-decoration-none"
					:style="eventStyle(event)"
					:title="event.bezeichnung"
				>
					<div class="text-nowrap text-center me-3">
						<div class="fw-bold">{{ timeFormat(event.beginn) }}</div>
						<div class="small text-muted">{{ timeFormat(event.ende) }}</div>
					</div>
					<div class="flex-grow-1 overflow-hidden">
						<div class="fw-semibold text-truncate">
							{{ event.bezeichnung }}
							<span v-if="event.lehrform_kurzbz" class="ms-1 px-1 border rounded small text-muted fw-normal">{{ event.lehrform_kurzbz }}</span>
						</div>
						<div class="small text-muted text-truncate">
							<span v-if="event.kurzbz">{{ event.kurzbz }}</span>
							<span v-if="event.gruppen"> · {{ event.gruppen }}</span>
							<span v-if="event.ort_kurzbz"> · {{ event.ort_kurzbz }}</span>
						</div>
					</div>
					<span v-if="isCurrent(event)" class="badge bg-success ms-2">{{ $p.t('global/anwJetzt') }}</span>
					<i class="fa fa-arrow-up-right-from-square ms-2 text-muted"></i>
				</a>
			</template>
		</fhc-calendar>
	</div>`
};

