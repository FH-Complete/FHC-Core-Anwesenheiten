import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {lektorFormatters} from "../../formatters/formatters.js";
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import AnwHelp from '../AnwHelp.js';
import NarrowScreen from '../../mixins/NarrowScreen.js';

import {StudiensemesterDropdown} from './StudiensemesterDropdown.js';

import ApiProfil from '../../api/factory/profil.js';

const escapeHtml = (value) => String(value ?? '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')

export default {
	name: 'StudentAnwesenheitComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		StudiensemesterDropdown,
		AnwHelp
	},
	mixins: [NarrowScreen],
	data: function() {
		return {
			tabulatorUuid: Vue.ref(0),
			studiensemester: [],
			tableBuiltPromise: null,
			// the rows of the table, the list below md shows the same rows
			anwesenheiten: null,
			// lehrveranstaltung_ids of the groups that the list shows open
			openGroups: [],
			studentViewTabulatorOptions: {
				debugInvalidComponentFuncs:false,
				// fitColumns keeps the table inside its container. With fitDataStretch the
				// status column and the quote in the group header ended behind a scrollbar
				layout: 'fitColumns',
				selectable: false,
				height: this.$entryParams.tabHeights.studentAnw,
				renderVerticalBuffer: 2000,
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: 'Lehrveranstaltung', visible: false},
					{title: this.$capitalize(this.$p.t('global/datum')), field: 'datum', formatter: lektorFormatters.formDateOnly, tooltip:false, widthGrow: 1, minWidth: 100},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: lektorFormatters.dateOnlyTimeFormatter, tooltip:false, widthGrow: 1, minWidth: 70},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: lektorFormatters.dateOnlyTimeFormatter, tooltip:false, widthGrow: 1, minWidth: 70},
					{title: this.$capitalize(this.$p.t('global/einheiten')), field: 'dauer', formatter: this.einheitenFormatter, tooltip:false, widthGrow: 2, minWidth: 180},
					{title: this.$capitalize(this.$p.t('global/anteilAnw')), field: 'anteil', bottomCalcFormatter: this.sumBottomCalcFormatter, bottomCalcParams: this.bottomCalcParamLookup, tooltip:false, bottomCalc: this.anwCalc, formatter: this.percentFormatter, widthGrow: 1, minWidth: 80},
					{title: this.$capitalize(this.$p.t('global/anwesend')), field: 'student_status', formatter: this.formAnwesenheit, tooltip:false, widthGrow: 2, minWidth: 190},
				],
				groupBy: ['lehrveranstaltung_id'],
				groupStartOpen:false,
				groupHeader: this.customGroupHeader,
				groupToggleElement:"header",
				persistence: {
					sort: false,
					filter: true,
					headerFilter: false,
					group: true,
					page: true,
					// visibility and order only. fitColumns computes the widths from the container,
					// a stored width became a fixed width and did not fit the next window size
					columns: ['visible'],
				},
				persistenceID: this.$entryParams.patchdate + "-studentAnwTable"
			},
			studentViewTabulatorEventHandlers: [{
				event: "tableBuilt",
				handler: async () => {
					await this.$entryParams.phrasenPromise

					this.tableBuiltResolve()
				}
			}, {
				event: "renderComplete",
				handler: () => this.fitToScrollbar()
			}],
			scrollbarWidth: 0,
			sums: {},
			filterTitle: ""
		};
	},
	methods: {
		lvTitle(row) {
			return this.$p.user_language.value == 'German' ? row.bezeichnung : (row.bezeichnung_english || row.bezeichnung)
		},
		isQuoteLow(quote) {
			return Number.parseFloat(quote) < (this.$entryParams.permissions.positiveRatingThreshold * 100)
		},
		customGroupHeader(value, count, data) {
			const first = data[0]
			const tone = this.isQuoteLow(first.anwesenheit) ? 'anw-quote--low' : 'anw-quote--ok'

			return '<div class="anw-group-head">' +
				'<div class="anw-group-title">' + escapeHtml(this.lvTitle(first)) + '</div>' +
				'<div class="anw-group-quote ' + tone + '">' + this.$p.t('global/anwesenheit') + ': ' + first.anwesenheit + ' %</div>' +
				'</div>';
		},
		percentFormatter: function (cell) {
			const data = cell.getData()
			const val = data.sum ??  data.anteil ?? '-'
			return '<div class="anw-cell-center">'+ val + ' %</div>'
		},
		bottomCalcParamLookup (values, data) {
			const first = data[0]
			return first ? first.anwesenheit + ' %' : ''
		},
		einheitenText(dauer) {
			const valInMin = Number(dauer)
			let valInEh = (dauer / 60 / this.$entryParams.permissions.einheitDauer)
			const rest = valInEh % 1
			if(rest > 0) valInEh = valInEh.toFixed(2).replace('.', ',')

			return valInMin + ' ' + this.$p.t('global/minuten') + ' / ' + valInEh + ' ' + this.$p.t('global/einheiten')
		},
		einheitenFormatter: function (cell) {
			return '<div class="anw-cell-center">' + this.einheitenText(cell.getValue()) + '</div>'
		},
		// status of one anwesenheit as the table and the list show it. anwesend and abwesend
		// show the icon only, an entschuldigung adds its state
		anwStatus(row) {
			const permissions = this.$entryParams.permissions

			if (row.student_status === permissions.anwesend_status)
				return {tone: 'present', icon: 'fa-check', status: this.$p.t('global/anwesend'), label: ''}
			if (row.student_status === permissions.entschuldigt_status)
				return {tone: 'present', icon: 'fa-check', status: this.$p.t('global/entschuldigt'), label: this.$p.t('global/entschuldigungAkzeptiert')}
			if (row.student_status === permissions.abwesend_status) {
				let label = ''
				if (row.hasOffene)
					label = this.$p.t('global/entschuldigungOffen')
				else if (row.hasAbgelehnte)
					label = this.$p.t('global/entschuldigungAbgelehnt')

				return {tone: 'absent', icon: 'fa-xmark', status: this.$p.t('global/abwesend'), label}
			}

			return null
		},
		formAnwesenheit: function(cell)
		{
			const status = this.anwStatus(cell.getData())
			if (!status) return '-'

			return '<div class="anw-cell-center anw-status anw-status--' + status.tone + '" title="' + escapeHtml(this.$capitalize(status.status)) + '">' +
				'<i class="fa ' + status.icon + '" aria-hidden="true"></i>' +
				(status.label ? '<span>' + escapeHtml(status.label) + '</span>' : '<span class="visually-hidden">' + escapeHtml(status.status) + '</span>') +
				'</div>';
		},
		ssChangedHandler: async function(studiensemester) {
			this.studiensemester = studiensemester
			this.loadAnwesenheitenByUID()
		},
		async loadAnwesenheitenByUID() {
			await this.$entryParams.profileViewDataPromise

			// toggle anwesenheiten loading procedure based on admin or student login
			const uid = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.uid : this.$entryParams.viewDataStudent.student_uid
			const person_id = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id

			if(!uid) return
				this.$api.call(ApiProfil.getAllAnwByUID(this.studiensemester, uid, person_id))
				.then(res => {
				if(res.meta.status !== "success") {
					this.$fhcAlert.alertError(this.$p.t('global/errorLoadingAnwesenheiten'))
				} else {
					const processedAnw = this.processAnw(res.data)

					this.anwesenheiten = processedAnw
					this.openGroups = []
					this.$refs.uebersichtTable?.tabulator?.setData(processedAnw);
				}
			});
		},
		anwCalc(values, data, percentage) {
			return percentage
		},
		// older safari versions only parse the iso form '2026-03-01T08:00:00' of a postgres timestamp
		parseDate(value) {
			const date = new Date(value)
			if (!isNaN(date)) return date

			return new Date(String(value).replace(' ', 'T'))
		},
		processAnw(data) {
			const anw = data[0]?.retval ?? []
			this.sums = {}
			// calc sum for each lva to display percentage
			anw.forEach(entry => {
				if(!this.sums[entry.lehrveranstaltung_id]) {
					this.sums[entry.lehrveranstaltung_id] = entry.dauer
				} else {
					this.sums[entry.lehrveranstaltung_id] += entry.dauer
				}
			})

			anw.forEach(a => {
				a.vonDate = this.parseDate(a.von)
				a.bisDate = this.parseDate(a.bis)
				a.anteil = (a.dauer / this.sums[a.lehrveranstaltung_id] * 100).toFixed(2)
			})

			if(this.$entryParams.permissions.entschuldigungen_enabled) {
				const ent = data[1]?.retval ?? []
				ent.forEach(e => {
					e.vonDate = this.parseDate(e.von)
					e.bisDate = this.parseDate(e.bis)
				})

				// filter entschuldigungen into offene and abgelehnte (entschuldigt status already in anw_user)
				const offene = ent.filter(e => e.akzeptiert === null)
				const abgelehnte = ent.filter(e => e.akzeptiert === false)

				// for every offene set anw_user entry property to true for every eligible date & abgelehnt combo
				offene.forEach(o => {
					const anwInDateRange = anw.filter(a => a.vonDate >= o.vonDate && a.bisDate <= o.bisDate && a.student_status === this.$entryParams.permissions.abwesend_status)
					anwInDateRange.forEach(a => a.hasOffene = true)
				})

				// for every abgelehnte set anw_user entry property to true for every eligible date & abgelehnt combo
				abgelehnte.forEach(abg => {
					const anwInRange = anw.filter(a => a.vonDate >= abg.vonDate && a.bisDate <= abg.bisDate && a.student_status === this.$entryParams.permissions.abwesend_status)
					anwInRange.forEach(a => a.hasAbgelehnte = true)
				})
			}

			return anw
		},
		async reload() {
			this.loadAnwesenheitenByUID()
		},
		redrawTable() {
			if(this.isNarrow) return
			if(this.$refs.uebersichtTable?.tabulator) this.$refs.uebersichtTable.tabulator.redraw(true)
		},
		// fitColumns sizes the columns when the table lays out. A vertical scrollbar that shows up
		// later (an opened group) pushes the columns behind it, so they need a new layout
		fitToScrollbar() {
			const tabulator = this.$refs.uebersichtTable?.tabulator
			const holder = tabulator?.element.querySelector('.tabulator-tableholder')
			if(!holder) return

			const scrollbarWidth = holder.offsetWidth - holder.clientWidth
			if(scrollbarWidth === this.scrollbarWidth) return

			this.scrollbarWidth = scrollbarWidth
			tabulator.redraw()
		},
		async setup(){
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise
			await this.tableBuiltPromise

			this.loadAnwesenheitenByUID()

			this.studiensemester = this.$entryParams.sem_kurzbz

		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		},
		sumBottomCalcFormatter(cell) {
			const val = Number.parseFloat(cell.getValue())
			if(Number.isNaN(val)) return cell.getValue()
			if (this.isQuoteLow(val)) {
				const el = cell.getElement()
				el.style.setProperty('color', 'red')
			}

			return cell.getValue()
		},
		calculateTableHeight() {
			// below md the list replaces the hidden table
			if(this.isNarrow) return

			const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
			const tableDataSet = document.getElementById('filterTableDataset' + tableID);
			if(!tableDataSet) return

			const collapsables = document.getElementById('filterCollapsables' + tableID);
			const rect = tableDataSet.getBoundingClientRect();
			const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight :  window.visualViewport.height
			this.$entryParams.tabHeights['studentAnw'].value = screenY - rect.top - collapsables.clientHeight - this.$contentBottomOffset()

			if(this.$refs.uebersichtTable.tabulator) this.$refs.uebersichtTable.tabulator.redraw(true)

		},
		// ------------------------------------------------------------------- list
		isGroupOpen(id) {
			return this.openGroups.includes(id)
		},
		toggleGroup(id) {
			this.openGroups = this.isGroupOpen(id)
				? this.openGroups.filter(open => open !== id)
				: [...this.openGroups, id]
		},
		formatDate(value) {
			const date = this.parseDate(value)
			if (isNaN(date)) return value

			return this.$formatTime(date, '.', 'DD-MM-YYYY')
		},
		formatClock(value) {
			const date = this.parseDate(value)
			if (isNaN(date)) return ''

			return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
		}
	},
	watch: {
		// the table was hidden, it measures its height again once it shows
		isNarrow(narrow) {
			if (!narrow) this.$nextTick(this.calculateTableHeight)
		}
	},
	mounted() {
		this.tableBuiltPromise = new Promise(this.tableResolve)
		this.setup()

		this.calculateTableHeight()
		window.addEventListener('resize', this.calculateTableHeight)
		window.addEventListener('orientationchange', this.calculateTableHeight)
	},
	unmounted() {
		window.removeEventListener('resize', this.calculateTableHeight)
		window.removeEventListener('orientationchange', this.calculateTableHeight)
	},
	computed: {
		helpText() {
			return this.$p.t('global/tooltipStudentAnwesenheit')
		},
		// the groups of the table as the list shows them, in the order of the data
		lvGroups() {
			if (!this.anwesenheiten) return []

			const groups = new Map()
			this.anwesenheiten.forEach(row => {
				if (!groups.has(row.lehrveranstaltung_id)) {
					groups.set(row.lehrveranstaltung_id, {
						id: row.lehrveranstaltung_id,
						title: this.lvTitle(row),
						quote: row.anwesenheit,
						low: this.isQuoteLow(row.anwesenheit),
						rows: []
					})
				}
				groups.get(row.lehrveranstaltung_id).rows.push({
					key: row.von + '|' + row.bis + '|' + groups.get(row.lehrveranstaltung_id).rows.length,
					date: this.formatDate(row.datum),
					time: this.formatClock(row.von) + ' – ' + this.formatClock(row.bis),
					einheiten: this.einheitenText(row.dauer),
					anteil: row.anteil,
					status: this.anwStatus(row)
				})
			})

			return [...groups.values()]
		}
	},
	template: `
	<core-base-layout
		:title="filterTitle">
		<template #main>
			<div class="anw-toolbar">
				<StudiensemesterDropdown class="anw-toolbar-semester" @ssChanged="ssChangedHandler"></StudiensemesterDropdown>
				<anw-help class="ms-auto" button-class="fs-5 text-body-secondary" :text="helpText"></anw-help>
			</div>

			<div v-show="!isNarrow" class="anw-student-table">
				<core-filter-cmpt
					ref="uebersichtTable"
					@uuidDefined="handleUuidDefined"
					:tabulator-options="studentViewTabulatorOptions"
					:tabulator-events="studentViewTabulatorEventHandlers"
					:isUsingPresets="true"
					presetsId="anwesenheitenStudentUebersichtTable"
					:tableOnly="true"
					:sideMenu="false"
				></core-filter-cmpt>
			</div>

			<div v-if="isNarrow" class="anw-list">
				<div v-if="anwesenheiten === null" class="anw-list-empty">
					<i class="fa-solid fa-spinner fa-pulse fa-2x" aria-hidden="true"></i>
				</div>
				<div v-else-if="!lvGroups.length" class="anw-list-empty">{{ $p.t('global/noDataAvailable') }}</div>

				<div v-for="group in lvGroups" :key="group.id" class="anw-card">
					<button
						type="button"
						class="anw-lv-head"
						:aria-expanded="isGroupOpen(group.id)"
						@click="toggleGroup(group.id)"
					>
						<span class="anw-lv-title">{{ group.title }}</span>
						<span class="anw-lv-quote" :class="group.low ? 'anw-quote--low' : 'anw-quote--ok'">
							<span class="visually-hidden">{{ $p.t('global/anwesenheit') }}:</span>
							{{ group.quote }} %
						</span>
						<i class="fa-solid fa-chevron-down anw-lv-chevron" aria-hidden="true"></i>
						<span class="progress anw-lv-bar" aria-hidden="true">
							<span class="progress-bar" :class="group.low ? 'bg-danger' : 'bg-success'" :style="{width: group.quote + '%'}"></span>
						</span>
					</button>

					<ul v-if="isGroupOpen(group.id)" class="anw-termine">
						<li v-for="row in group.rows" :key="row.key" class="anw-termin">
							<div class="anw-termin-main">
								<div class="anw-termin-date">{{ row.date }}<span class="anw-termin-time">{{ row.time }}</span></div>
								<div class="anw-termin-meta">{{ row.einheiten }} · {{ $capitalize($p.t('global/anteilAnw')) }} {{ row.anteil }} %</div>
							</div>
							<div v-if="row.status" class="anw-status anw-status--stacked" :class="'anw-status--' + row.status.tone">
								<i class="fa" :class="row.status.icon" aria-hidden="true"></i>
								<span>{{ $capitalize(row.status.label || row.status.status) }}</span>
							</div>
						</li>
					</ul>
				</div>
			</div>
		</template>

	</core-base-layout>
`
};
