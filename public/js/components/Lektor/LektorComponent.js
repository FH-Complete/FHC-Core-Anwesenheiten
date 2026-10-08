import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import { lektorFormatters } from "../../formatters/formatters.js";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown.js";
import {MaUIDDropdown} from "../Setup/MaUIDDropdown.js";
import {TermineDropdown} from "../Setup/TermineDropdown.js";
import {AnwCountDisplay} from "./AnwCountDisplay.js";
import {KontrolleDisplay} from "./KontrolleDisplay.js";
import {Statuslegende} from "./Statuslegende.js";
import {HighlightModeSelector} from "./HighlightModeSelector.js";
import ApiKontrolle from '../../api/factory/kontrolle.js';
import {StudentByLvaComponent} from "./StudentByLvaComponent.js"
import { hoverTooltip, hideTooltip } from "../../../../../js/directives/inViewTooltip.js"
import {FehlminutenDialog} from "./FehlminutenDialog.js";

export const LektorComponent = {
	inheritAttrs: false,
	name: 'LektorComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		BsModal,
		Divider: primevue.divider,
		TermineDropdown,
		LehreinheitenDropdown,
		MaUIDDropdown,
		AnwCountDisplay,
		Dropdown: primevue.dropdown,
		Multiselect: primevue.multiselect,
		"datepicker": VueDatePicker,
		Statuslegende,
		KontrolleDisplay,
		StudentByLvaComponent,
		HighlightModeSelector,
		FehlminutenDialog
	},
	data() {
		return {
			showQRLoadingSpinner: false,
			selectedStudent: null,
			kontrolleVonBis: null,
			editKontrolle: null,
			highlightMode: 'allowed',
			selectedDateCount: 0,
			tabulatorUuid: Vue.ref(0),
			loading: false,
			tableBuiltResolve: null,
			tableBuiltPromise: null,
			lektorState: { // pretty much everything that is being set in setupData()
				students: [],
				studentsData: null,
				anwEntries: [],
				stsem: [],
				entschuldigtStati: [],
				kontrollen: [],
				viewData: [],
				dates: [], // all
				termine: [], // stundenplan
				showAllVar: false,
				tableStudentData: [],
				beginn: null,
				ende: null,
				tabulatorCols: null,
				gruppen: null
			},
			kontrollZeitSourceStundenplanBeginn: false,
			kontrollZeitSourceStundenplanEnde: false,
			kontrollDatumSourceStundenplan: false,
			// constant columns of the table. Their setup goes into the table presets and it
			// survives a column rebuild. The date columns stay out, they look different for
			// every lehreinheit and every date
			presetColumns: ['foto', 'prestudent_id', 'student_uid', 'vorname', 'nachname', 'gruppe', 'sum'],
			anwesenheitenTabulatorOptions: {
				rowFormatter: this.entschuldigtColoring,
				height: this.$entryParams.tabHeights.lektor,
				index: 'prestudent_id',
				debugInvalidComponentFuncs: false,
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: this.$capitalize(this.$p.t('global/foto')), field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: true, minWidth: 100, maxWidth: 100, download: false, tooltip: false},
					{title: this.$capitalize(this.$p.t('global/prestudentID')), field: 'prestudent_id', formatter: lektorFormatters.centeredFormatter, visible: false, minWidth: 150, download: true, tooltip: false},
					{title: this.$capitalize(this.$p.t('ui/student_uid')), field: 'student_uid', formatter: lektorFormatters.centeredFormatter, visible: false, minWidth: 150, download: true, tooltip: false},
					{title: this.$capitalize(this.$p.t('person/vorname')), field: 'vorname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1,  minWidth: 150, tooltip: false},
					{title: this.$capitalize(this.$p.t('person/nachname')), field: 'nachname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1, minWidth: 150, tooltip: false},
					{title: this.$capitalize(this.$p.t('lehre/gruppe')), field: 'gruppe', headerFilter: 'list', tooltip: false,
						headerFilterParams: {
							valuesLookup: true,
							clearable: true,
							autocomplete: true,
						},
						formatter: lektorFormatters.centeredFormatter, widthGrow: 1, minWidth: 100},
					{
						title: this.$capitalize(this.$p.t('global/datum')),
						field: 'status',
						editor: 'list',
						editorParams: {
							values: Vue.computed(() => this.statusEditorValues())
						},
						editable: this.checkCellEditability,
						formatter: this.anwesenheitFormatterValue,
						hozAlign:"center",
						widthGrow: 1,
						tooltip: false,
						minWidth: 150
					},
					{title: this.$capitalize(this.$p.t('global/summe')), field: 'sum', formatter: this.percentFormatter,widthGrow: 1, minWidth: 150, tooltip: false},
				],
				// every type on. Keep the keys instead of a plain true: the filter component
				// switches the column, the header filter and the sort persistence off in this
				// object as soon as a table preset is stored.
				// columns: only the layout keys. With true tabulator stores every definition key, the
				// Vue.computed in editorParams of the date columns cannot be serialized and the throw
				// inside setColumns leaves the table half rebuilt
				persistence: {
					sort: true,
					filter: true,
					headerFilter: true,
					group: true,
					page: true,
					columns: ['width', 'visible'],
				},
				persistenceID: this.$entryParams.patchdate + "-lektorOverviewLe"
			},
			anwesenheitenTabulatorEventHandlers: [{
				event: "cellClick",
				handler: async (e, cell) => {

					// on non date fields route to student by lva component
					const field = cell.getColumn().getField()

					const row = cell.getRow()
					const prestudent_id = row.getData().prestudent_id

					if(field === "gruppe" || field === "foto" || field === "prestudent_id" ||
						field === "vorname" || field === "nachname" || field === "sum") {

						if (await this.confirmDiscardChanges() === false) return

						// the detail view shows the stored data, so the table must show it too
						if (this.changedData.length) this.discardChanges()

						this.selectedStudent = {id: prestudent_id, lv_id: this.lv_id, sem_kz: this.sem_kurzbz, title: ''}
						Vue.nextTick(()=>{
							this.$refs.studentByLva.load()
							// just show studentByLva component in a fullscreen modal, avoid the routing shenanigans here
							this.$refs.modalContainerStudentByLva.show()
						})

					}
				}
			},
			// the entschuldigungen of the student in the in-view tooltip of the core, sticky for the list. The columns set tooltip: false,
			// else the columnDefaults of the core filter add the tabulator tooltip. A click on the cell has its
			// own action (studentByLva, status editor), it closes the tooltip. The delay is the tabulator default
			{
				event: "cellMouseEnter",
				handler: (e, cell) => hoverTooltip(cell.getElement(), () => this.tooltipTableRow(cell), { delay: 300, sticky: true, closeOnClick: true })
			},
			{
				event: "cellMouseLeave",
				handler: (e, cell) => hideTooltip(cell.getElement())
			},
			{
				event: "cellEdited",
				handler: async (cell) => {
					
					const row = cell.getRow()
					const prestudent_id = row.getData().prestudent_id

					if (cell.getValue() === this.$entryParams.permissions.fehlminuten_status) {
						const result = await this.askFehlminuten(cell)
						if (result === null) {
							// cancelled: back to the previous status, restoreOldValue fires no cellEdited
							cell.restoreOldValue()
							return
						}
						this.changeAnwStatus(cell, prestudent_id, result.fehlminuten, result.notiz)
						// the formatter ran before the dialog, show the confirmed minutes
						this.rerenderCell(cell)
					} else {
						this.changeAnwStatus(cell, prestudent_id)
					}

					this.markDirty(cell, prestudent_id)
				}
			},
			{
				event: "tableBuilt",
				handler: async () => {
					this.tableBuiltResolve()
				}
			}],
			boundProgressCounter: null,
			changedData: [],
			// combined read only view of several les (Gesamtansicht). Only the explicit button opens it,
			// the default stays the single le dropdown that most teachers need for their kontrolle
			multiLeMode: false,
			showFremdeLe: false, // colleagues les in the single le dropdown, off until the panel footer click
			selectedLehreinheiten: [],
			multiselectOpen: false,
			multiselectDebounceTimer: null,
			lastLoadedLeIds: [],
			selectedDateUnwatch: null,
			selectedDate: new Date(Date.now()),
			qr: null,
			url: null,
			code: null,
			timerIDPolling: null,
			progressTimerID: null,
			regenerateProgress: 0,
			progressMax: 0,
			polling: false,
			checkInCount: 0,
			abwesendCount: 0,
			entschuldigtCount: 0
		}
	},
	inject: {
		minDate: {
			type: Object
		},
		maxDate: {
			type: Object
		}
	},
	methods: {
		// load trigger strategy for the le multiselect: @change fires on every single option toggle
		// (too many requests while picking) and @blur even fires when nothing was selected at all.
		// instead the combined data is loaded once the overlay panel closes (@hide) and only if the
		// selection actually changed. @change events arriving while the panel is closed (chip remove
		// icon / clear icon) are debounced so quickly removing multiple chips causes one reload only.
		handleMultiselectShow() {
			this.multiselectOpen = true
		},
		handleMultiselectHide() {
			this.multiselectOpen = false
			this.loadSelectedLehreinheiten()
		},
		handleChangeLEMultiselect() {
			if (this.multiselectOpen) return // @hide will pick the final selection up
			clearTimeout(this.multiselectDebounceTimer)
			this.multiselectDebounceTimer = setTimeout(() => this.loadSelectedLehreinheiten(), 700)
		},
		loadSelectedLehreinheiten() {
			if (!this.multiLeMode) return // late @hide/@change after leaving the combined view

			const leIds = this.selectedLehreinheiten.map(le => le.lehreinheit_id).sort()

			if (leIds.join() === this.lastLoadedLeIds.join()) return // selection unchanged since last load
			this.lastLoadedLeIds = leIds

			if (!leIds.length) {
				this.setupData({}) // empty table until something is selected again
				this.refitTableHeight()
				return
			}

			// the combined view stays read only for any count of les, also for a single one.
			// kontrollen run in the single le dropdown view only.
			// setupData renders every kontrolle in the combined view
			this.loading = true
			this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLva(this.lv_id, this.sem_kurzbz, leIds))
				.then(res => {
					if (res.meta.status === 'success') this.setupData(res.data)
				}).catch(() => {
					if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
				}).finally(() => {
					this.loading = false
					this.refitTableHeight() // the new data can change the header height
				})
		},
		async enterCombinedView() {
			if (await this.confirmDiscardChanges() === false) return

			this.multiLeMode = true
			// main use case is the aggregated export of every le, so start with all of them
			this.selectedLehreinheiten = [...(this.$entryParams.available_le_info_lva.value ?? [])]
			this.lastLoadedLeIds = []
			this.loadSelectedLehreinheiten()
		},
		exitCombinedView() {
			clearTimeout(this.multiselectDebounceTimer)
			this.multiLeMode = false
			this.selectedLehreinheiten = []
			this.lastLoadedLeIds = []

			// selected_le_info stays untouched in the combined view, reload the le that was active before
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			this.reloadState(ma_uid, date).finally(() => this.refitTableHeight()) // the info bar is gone
		},
		refitTableHeight() {
			// call it after loading, the new data can change the header. A table that is too high adds
			// page scrollbars, these reduce visualViewport.height. So measure twice: the 1st pass
			// shrinks the table, the 2nd pass measures without the scrollbars
			this.$nextTick(() => requestAnimationFrame(() => {
				this.calculateTableHeight()
				requestAnimationFrame(() => this.calculateTableHeight())
			}))
		},
		async handleLeDropdownChanged(e) {
			// no v-model: a rejected confirm keeps the old le in the dropdown
			if (e.value?.lehreinheit_id === this.$entryParams.selected_le_info.value?.lehreinheit_id) return
			if (await this.confirmDiscardChanges() === false) return

			this.$entryParams.selected_le_info.value = e.value
			this.$entryParams.selected_le_id.value = e.value.lehreinheit_id
			this.handleLEChanged()
		},
		async confirmDiscardChanges() {
			if (!this.changedData.length) return true
			return await this.$fhcAlert.confirm({
				message: this.$p.t('global/anwUnsavedChangesConfirm'),
				acceptLabel: this.$p.t('global/anwDiscardAndContinue'),
				acceptClass: 'btn btn-danger',
				rejectLabel: this.$p.t('global/zurueck'),
				rejectClass: 'btn btn-outline-secondary'
			})
		},
		handleAutoApply(date) {
			this.selectedDate = date
			this.$refs.outsideDateSelect.closeMenu()	
			if(this.$refs.insideDateSelect) this.$refs.insideDateSelect.closeMenu()
		},
		// unique column key per kontrolle timeslot AND lehreinheit. Parallel le groups of a lva
		// often share the exact same timeslot, their kontrollen must not merge into one column
		anwColumnKey(datum, von, bis, le_id) {
			return datum + ' | ' + von + ' - ' + bis + ' | ' + le_id
		},
		isOwnLe(le) {
			// options built by processLeSetupResponse carry every lektor of the le,
			// entries from other sources may only have the single row uid
			if (Array.isArray(le?.mitarbeiter_uids)) return le.mitarbeiter_uids.includes(this.$entryParams.permissions.authID)
			return le?.mitarbeiter_uid === this.$entryParams.permissions.authID
		},
		async confirmFremdeLe(messageKey, acceptLabelKey, buttonClasses = {}) {
			// operating on a colleagues le is a valid use case (substitution) but rare enough
			// that starting/saving/deleting anything there by accident deserves a confirm popup
			const le = this.$entryParams.selected_le_info?.value
			if (!le || this.isOwnLe(le)) return true
			return await this.$fhcAlert.confirm({
				message: this.$p.t(messageKey, [le.lektor_names?.join(', ') ?? '']),
				acceptLabel: this.$p.t(acceptLabelKey),
				rejectLabel: this.$p.t('global/zurueck'),
				...buttonClasses
			})
		},
		confirmKontrolleFremdeLe() {
			return this.confirmFremdeLe('global/anwKontrolleFremdeLeConfirm', 'global/jetztStartenV2')
		},
		confirmEditFremdeLe() {
			return this.confirmFremdeLe('global/anwEditFremdeLeConfirm', 'global/anwFortfahren')
		},
		getLeLabel(le_id) {
			const options = this.$entryParams.available_le_info_lva.value?.length
				? this.$entryParams.available_le_info_lva.value
				: this.$entryParams.available_le_info.value
			const le = options?.find(o => o.lehreinheit_id == le_id)
			return le?.groupString ?? le?.csvInfoString ?? le?.infoString ?? ('LE ' + le_id)
		},
		// '10:00:00 - 11:30:00' -> '10:00 - 11:30', column keys keep the raw times
		stripSeconds(timespan) {
			return timespan.replace(/(\d{1,2}:\d{2}):\d{2}/g, '$1')
		},
		anwColTitleFormatter(cell) {
			const title = cell.getColumn().getDefinition().title;
			const titleParts = title.split("|")

			const titledate = titleParts[0].trimEnd()
			const selectedDateFrontendFormatted = this.toFrontendDate(titledate)

			const container = document.createElement("div");
			container.style.textAlign = "center";
			// text-body-secondary follows the theme, a fixed gray reaches 4:1 on the light and 2.9:1 on the dark header
			container.innerHTML = `<span style="font-weight: bold;">${selectedDateFrontendFormatted}</span><br><span class="text-body-secondary">${this.stripSeconds(titleParts[1])}</span>`;

			// in the combined multi le view show which lehreinheit the kontrolle belongs to
			if (this.multiLeMode && titleParts[2] !== undefined) {
				const leLabel = this.getLeLabel(titleParts[2].trim())
				container.innerHTML += `<br><span class="text-body-secondary" style="font-size: 0.75em;">${leLabel}</span>`;
			}
			return container;
		},
		checkCellEditability(cell) {
			if (this.multiLeMode) return false // combined multi le view is read only for now
			if (!this.canEditSelectedLe) return false
			const val = cell.getValue()
			return val !== undefined && val !== '-' // dont allow edit on empty cols
		},
		tooltipTableRow(cell) {
			const el = document.createElement('div');

			const data = cell.getRow().getData();

			// Header Section
			const header = document.createElement('div');
			header.style.fontWeight = 'bold';
			header.style.marginBottom = '10px';
			header.style.borderBottom = '1px solid var(--bs-border-color, #dee2e6)';
			header.style.paddingBottom = '5px';

			const limit = 10;
			const count = data?.entschuldigungen?.length || 0;
			const shownNumber = count >= limit ? limit : count;

			header.innerText = `${data.vorname} ${data.nachname}`;
			if (count > 0) {
				header.innerText += ` (${this.$p.t('global/entschuldigungenAnzahlV2', [shownNumber, count])})`;
			}
			el.appendChild(header);

			// Grid Section
			if (count > 0) {
				const grid = document.createElement('div');
				grid.style.display = 'grid';
				grid.style.gridTemplateColumns = 'repeat(4, auto)'; // von, dash, bis, status
				grid.style.columnGap = '0.4em';
				grid.style.rowGap = '4px';
				grid.style.fontVariantNumeric = 'tabular-nums'; // equal digit widths, every date takes the same space

				for (let i = 0; i < shownNumber; i++) {
					const ent = data.entschuldigungen[i];
					const zeit = this.formatEntschuldigungZeit(ent);

					const vonSpan = document.createElement('span');
					vonSpan.innerText = zeit.von;

					const dashSpan = document.createElement('span');
					dashSpan.innerText = '-';

					// right aligned, so a time without date stays below the other bis times
					const bisSpan = document.createElement('span');
					bisSpan.style.textAlign = 'right';
					bisSpan.innerText = zeit.bis;

					// same status colors as the entschuldigungsmanagement
					const statusSpan = document.createElement('span');
					statusSpan.className = 'anw-ent-status--' + (ent.akzeptiert === true ? 'akzeptiert' : ent.akzeptiert === false ? 'abgelehnt' : 'offen');
					statusSpan.style.paddingLeft = '1.2em'; // the "Tab" space
					statusSpan.innerText = this.$p.t('global/statusLabel') + ': ' + this.formatAkzeptiertStatus(ent.akzeptiert);

					grid.append(vonSpan, dashSpan, bisSpan, statusSpan);
				}
				el.appendChild(grid);
			} else {
				const none = document.createElement('div');
				none.innerText = this.$p.t('global/keineEntschuldigungenVorhanden');
				el.appendChild(none);
			}

			return el;
		},
		// padded 'dd.MM.yyyy HH:mm', bis on the same day shows only the time
		formatEntschuldigungZeit(ent) {
			const zone = (typeof FHC_JS_DATA_STORAGE_OBJECT !== 'undefined' && FHC_JS_DATA_STORAGE_OBJECT.timezone)
				|| 'Europe/Vienna'
			const von = luxon.DateTime.fromSQL(ent.von, { zone })
			const bis = luxon.DateTime.fromSQL(ent.bis, { zone })

			return {
				von: von.toFormat('dd.MM.yyyy HH:mm'),
				bis: bis.toFormat(von.hasSame(bis, 'day') ? 'HH:mm' : 'dd.MM.yyyy HH:mm')
			}
		},
		formatAkzeptiertStatus(akzeptiert) {
			// formats akzeptiert tri state logic (true => accepted, false => denied, null => open) into meaningful strings
			
			let ret = ''

			if(akzeptiert === null) {
				ret = this.$p.t('global/entschuldigungStatusOffen')
			} else if (akzeptiert === true) {
				ret = this.$p.t('global/entschuldigungStatusAkzeptiert')
			} else if (akzeptiert === false) {
				ret = this.$p.t('global/entschuldigungStatusAbgelehnt')
			}
			
			return ret
		},
		percentFormatter: function (cell) {
			const data = cell.getData()
			const val = data.sum ?? data.anteil ?? '-'
			const isLow = val !== '-' && val < (this.$entryParams.permissions.positiveRatingThreshold * 100)
			return '<div' + (isLow ? ' class="anw-sum--low"' : '') + ' style="display: flex; justify-content: center; align-items: center; height: 100%">' + val + ' %</div>'
		},
		// the same status cell as the detail view, a click on the minutes opens the dialog again
		anwesenheitFormatterValue(cell) {
			return lektorFormatters.anwStatusCell(cell, this.$entryParams.permissions, {
				fehlminutenText: () => this.$p.t('global/anwFehlminutenKurz', {minuten: this.getCellFehlminuten(cell) ?? '?'}),
				onEditFehlminuten: this.checkCellEditability(cell) ? () => this.editFehlminuten(cell) : null,
				editTitle: this.$p.t('global/anwFehlminutenAendernV2')
			})
		},
		statusLabel(status) {
			const p = this.$entryParams.permissions
			const phrases = {
				[p.anwesend_status]: 'global/anwesendV2',
				[p.abwesend_status]: 'global/abwesend',
				[p.entschuldigt_status]: 'global/entschuldigt',
				[p.fehlminuten_status]: 'global/anwStatusFehlminuten'
			}
			return phrases[status] ? this.$capitalize(this.$p.t(phrases[status])) : status
		},
		// the kontrollen count the status fehlminuten as anwesend, like the backend does
		countKey(status) {
			const p = this.$entryParams.permissions
			return status === p.fehlminuten_status ? p.anwesend_status : status
		},
		findStudentEntry(prestudent_id, columnKey) {
			return this.lektorState.studentsData?.get(prestudent_id)
				?.find(e => this.anwColumnKey(e.datum, e.von, e.bis, e.le_id) === columnKey)
		},
		// an unsaved change wins over the stored value. Minutes of another status do not count
		getFehlminuten(prestudent_id, columnKey) {
			const fehlminutenStatus = this.$entryParams.permissions.fehlminuten_status
			const pending = this.changedData.find(e => e.prestudent_id === prestudent_id && e.date === columnKey)
			if (pending && pending.status === fehlminutenStatus) return pending.fehlminuten

			const stored = this.findStudentEntry(prestudent_id, columnKey)
			return stored?.status === fehlminutenStatus ? stored.fehlminuten : undefined
		},
		getCellFehlminuten(cell) {
			return this.getFehlminuten(cell.getRow().getData().prestudent_id, cell.getColumn().getField())
		},
		// an unsaved notiz wins over the stored one
		getCellNotiz(cell) {
			const prestudent_id = cell.getRow().getData().prestudent_id
			const columnKey = cell.getColumn().getField()
			const pending = this.changedData.find(e => e.prestudent_id === prestudent_id && e.date === columnKey)
			if (pending && 'notiz' in pending) return pending.notiz

			return this.findStudentEntry(prestudent_id, columnKey)?.notiz
		},
		anwDownloadAccessor(value, data, type, params, column) {
			if (value !== this.$entryParams.permissions.fehlminuten_status) return value

			const fehlminuten = this.getFehlminuten(data.prestudent_id, column.getField())
			return value + ' (' + fehlminuten + ')'
		},
		// opens the dialog for the fehlminuten of the cell. Resolves with {fehlminuten, notiz}, or with null on cancel.
		// dauer: the lesson minutes of the kontrolle from the backend, the quote counts the same minutes
		askFehlminuten(cell) {
			const row = cell.getRow().getData()
			const entry = this.findStudentEntry(row.prestudent_id, cell.getColumn().getField())
			const kontrolle = this.lektorState.kontrollen.find(k => k.anwesenheit_id === entry?.anwesenheit_id)
			const dauer = kontrolle?.dauer ?? 0

			return this.$refs.fehlminutenDialog.open({
				name: row.vorname + ' ' + row.nachname,
				kontrolle: entry ? this.toFrontendDate(entry.datum) + ' ' + this.stripSeconds(entry.von + ' - ' + entry.bis) : '',
				dauerLabel: this.$p.t('global/anwKontrolldauerMinuten', {dauer}),
				dauer,
				value: this.getCellFehlminuten(cell),
				notiz: this.getCellNotiz(cell)
			})
		},
		async editFehlminuten(cell) {
			const result = await this.askFehlminuten(cell)
			if (result === null) return

			const prestudent_id = cell.getRow().getData().prestudent_id
			this.changeAnwStatus(cell, prestudent_id, result.fehlminuten, result.notiz)

			this.rerenderCell(cell)
			this.markDirty(cell, prestudent_id)
		},
		// the same value re-runs the formatter and fires no cellEdited
		rerenderCell(cell) {
			cell.setValue(cell.getValue())
		},
		markDirty(cell, prestudent_id) {
			cell.getElement().classList.toggle('anw-dirty', !!this.changedData.find(d => d.prestudent_id === prestudent_id))
		},
		// drops the unsaved changes, the table shows the stored statuses again. replaceData keeps the scroll position
		discardChanges() {
			this.changedData = []
			this.lektorState.tableStudentData = this.setupAllData()
			this.$refs.anwesenheitenTable.tabulator.replaceData(this.lektorState.tableStudentData)
		},
		getExistingQRCode() {
			this.$api.call(ApiKontrolle.getExistingQRCode(this.$entryParams.selected_le_id.value))
				.then(res => {
					if (res.data.svg) {
						this.showQR(res.data)
					}
				})
		},
		pollAnwesenheit() {
			this.$api.call(ApiKontrolle.pollAnwesenheiten(this.anwesenheit_id, this.lv_id))
				.then(res => {
				this.checkInCount = res.data.anwesend
				this.abwesendCount = res.data.abwesend
				this.entschuldigtCount = res.data.entschuldigt
			})
		},
		startPollingAnwesenheiten() {
			this.timerIDPolling = setInterval(this.boundPollAnwesenheit, 3000)
		},
		stopPollingAnwesenheiten() {
			clearInterval(this.timerIDPolling)
			this.timerIDPolling = null
		},
		handleShowAllToggle() {
			if (!this.lektorState.dates.length) {
				this.$fhcAlert.alertInfo(this.$p.t('global/anwInfoKeineKontrollenGefunden'))
				return
			}
			this.loading = true
			this.toggleShowAll()
			this.loading = false
		},
		async setAllColsAndData() {
			this.selectedDateCount = this.lektorState.dates.length
			this.setTableColumns(this.lektorState.tabulatorCols)
			this.$refs.anwesenheitenTable.tabulator.setData(this.lektorState.tableStudentData)
		},
		toggleShowAll() {
			// set tabulator column definition to show every distinct date fetched

			if (!this.lektorState.showAllVar) {
				this.setShowAll()
			} else {
				this.$refs.anwesenheitenTable.tabulator.clearSort()
				
				// use selectedDate watcher to retrieve single column table state
				this.selectedDate = new Date(this.selectedDate)

				this.$refs.showAllTickbox.checked = false
				localStorage.setItem('DigiAnwShowAll', false)
				this.lektorState.showAllVar = false
			}
		},
		setShowAll() {
			this.lektorState.tabulatorCols = this.buildColsForDates(this.lektorState.dates)
			this.lektorState.tableStudentData = this.setupAllData()
			this.setAllColsAndData()

			this.$refs.showAllTickbox.checked = true
			if (!this.multiLeMode) localStorage.setItem('DigiAnwShowAll', true)
			this.lektorState.showAllVar = true
		},
		setupAllData() {
			const data = []

			this.lektorState.students.forEach(student => {
				const allEntStudent = this.lektorState.entschuldigtStati.filter(status => {
					if(status.person_id === student.person_id) return true
					else return false
				})
				
				// sort entschuldigungen descending, so tooltip shows most recent on top
				// allEntStudent.sort(
				//	
				// )
				
				const nachname = student.nachname + student.zusatz
				const row = {
					student_uid: student.student_uid,
					prestudent_id: student.prestudent_id,
					foto: student.foto,
					vorname: student.vorname,
					nachname: nachname,
					entschuldigungen: allEntStudent,
					gruppe: student.semester + student.verband + student.gruppe,
					sum: student.sum
				}
				const studentDataEntry = this.lektorState.studentsData.get(student.prestudent_id)
				studentDataEntry.forEach(entry => {
					const d = this.anwColumnKey(entry.datum, entry.von, entry.bis, entry.le_id)
					row[d] = entry.status
				})

				data.push(row)
			})

			return data
		},
		areDatesSame(date1, date2) {
			const date1Date = date1.getDate()
			const date2Date = date2.getDate()

			const date1Month = date1.getMonth()
			const date2Month = date2.getMonth()

			const date1Year = date1.getFullYear()
			const date2Year = date2.getFullYear()

			return date1Date === date2Date && date1Month === date2Month && date1Year === date2Year
		},
		wait(ms) {
			return new Promise(resolve => setTimeout(resolve, ms))
		},
		formatQRTime(kontrolle) {
			const vp = kontrolle.von.split(" ")
			const datum = this.toFrontendDate(vp[0])
			const von = vp[1]
			const bis = kontrolle.bis.split(" ")[1]
			return datum + ' | ' + von + ' - ' + bis
		},
		showQR(data) {
			this.qr = data.svg
			this.url = data.url
			this.code = data.code
			this.kontrolleVonBis = this.formatQRTime(data.kontrolle)
			this.checkInCount = data.count.anwesend
			this.abwesendCount = data.count.abwesend
			this.entschuldigtCount = data.count.entschuldigt
			this.anwesenheit_id = data.anwesenheit_id
			this.$refs.modalContainerQR.show()
			if (this.$entryParams.permissions.useRegenerateQR) this.startRegenerateQR()
			this.startPollingAnwesenheiten()
		},
		getNewQRCode() {
			// js months 0-11, php months 1-12
			const date = {
				year: this.selectedDate.getFullYear(),
				month: this.selectedDate.getMonth() + 1,
				day: this.selectedDate.getDate()
			}
			
			this.$api.call(ApiKontrolle.getNewQRCode(this.$entryParams.selected_le_id.value, date, this.lektorState.beginn, this.lektorState.ende))
				.then(res => {
				if (res.data) {
					this.showQRLoadingSpinner = false
					this.$refs.modalContainerNewKontrolle.hide()
					this.showQR(res.data)
				}
			}).finally(()=>{
				// just in case
				this.showQRLoadingSpinner = false
			})
			
		},
		handleTerminChanged() {
			this.setTimespanForKontrolleTermin(this.$entryParams.selected_termin.value)
		},
		regenerateQR() {
			this.$api.call(ApiKontrolle.regenerateQRCode(this.anwesenheit_id))
				.then(async (res) => {
				const oldCode = this.code
				this.qr = res.data.svg
				this.url = res.data.url
				this.code = res.data.code

				await this.wait(5000)

					this.$api.call(ApiKontrolle.degenerateQRCode(this.anwesenheit_id, oldCode))
			})
		},
		progressCounter() {
			if (this.regenerateProgress === this.progressMax) {
				this.regenerateQR()
			}
			if (this.regenerateProgress >= this.progressMax) this.regenerateProgress = 0
			this.regenerateProgress++
		},
		async saveChanges() {

			if (await this.confirmEditFremdeLe() === false) return

			const changedStudents = new Set(this.changedData.map(e => e.prestudent_id))
			this.$api.call(ApiKontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id.value, this.changedData))
				.then((res) => {
				if (res.meta.status === "success") {
					this.$fhcAlert.alertSuccess(this.$p.t('global/anwUserUpdateSuccess'))
				} else {
					this.$fhcAlert.alertError(this.$p.t('global/errorAnwUserUpdate'))
				}

				const changedStudentsArr = [...changedStudents]
				// find and overwrite each entry in studentsData map from which showAll retrieves its values
				this.changedData.forEach(change => {
					const values = this.lektorState.studentsData.get(change.prestudent_id)
					const valueToChange = values?.find(val => val.anwesenheit_user_id == change.anwesenheit_user_id)
					
					if(valueToChange) {
						const oldVal = valueToChange.status
						valueToChange.status = change.status

						// same rule as the backend: the status fehlminuten sets the minutes, another status clears them
						if (change.status === this.$entryParams.permissions.fehlminuten_status) {
							valueToChange.fehlminuten = change.fehlminuten
						} else if (oldVal !== change.status) {
							valueToChange.fehlminuten = 0
						}
						if ('notiz' in change) valueToChange.notiz = change.notiz

						const kontrolleToUpdate = this.lektorState.kontrollen.find(k => k.anwesenheit_id == change.anwesenheit_id)
						if (kontrolleToUpdate) {
							kontrolleToUpdate[this.countKey(oldVal)]--;
							kontrolleToUpdate[this.countKey(change.status)]++;
						}
					}
					
					
				})
				
				this.$api.call(ApiKontrolle.getAnwQuoteForPrestudentIds(changedStudentsArr, this.$entryParams.lv_id, this.$entryParams.sem_kurzbz))
					.then(res => {
						this.updateSumData(res.data.retval)
					})
			}).finally(() =>  {
				this.changedData = []
				this.setCurrentCountsFromTableData()
			})
			
		},
		startRegenerateQR() {
			this.progressTimerID = setInterval(this.boundProgressCounter, this.progressTimerInterval) // track time passed for regenerate
		},
		stopRegenerateQR() {
			const oldCode = this.code

			clearInterval(this.progressTimerID)
			this.progressTimerID = null
			this.regenerateProgress = 0

			this.qr = null
			this.url = null
			this.code = null

			// attempt to degenerate one last time to not leave any codes in db
			this.$api.call(ApiKontrolle.degenerateQRCode(this.anwesenheit_id, oldCode))
		},
		isStundenplanDatum(date) {
			const searchStr = this.formatDateToDbString(date)
			return !!this.$entryParams.available_termine.value?.find(termin => termin.datum == searchStr)
		},
		handleChangeDatum(date) {
			this.kontrollDatumSourceStundenplan = this.isStundenplanDatum(date)
		},
		handleChangeEnde(date) {
			const padZero = (num) => String(num).padStart(2, '0');
			const searchStr = `${padZero(date.hours)}:${padZero(date.minutes)}:${padZero(date.seconds)}`
			const terminFound = this.$entryParams.available_termine.value.find(termin => termin.ende == searchStr)
			if(terminFound) this.kontrollZeitSourceStundenplanEnde = true
			else this.kontrollZeitSourceStundenplanEnde = false
		},
		handleChangeBeginn(date) {
			const padZero = (num) => String(num).padStart(2, '0');
			const searchStr = `${padZero(date.hours)}:${padZero(date.minutes)}:${padZero(date.seconds)}`
			const terminFound = this.$entryParams.available_termine.value.find(termin => termin.beginn == searchStr)
			if(terminFound) this.kontrollZeitSourceStundenplanBeginn = true
			else this.kontrollZeitSourceStundenplanBeginn = false
		},
		queryOnlyKontrolleShown() {
			// find kontrolle from column date
			const sYear = this.selectedDate.getFullYear()
			const sMonth = this.selectedDate.getMonth()
			const sDate = this.selectedDate.getDate()
			
			const kOnDate = this.lektorState.kontrollen.find(k => {
				const kYear = k.jsDate.getFullYear()
				const kMonth = k.jsDate.getMonth()
				const kDate = k.jsDate.getDate()
				
				return sYear === kYear && sMonth === kMonth && sDate === kDate
			})

			if(kOnDate) {
				this.$api.call(ApiKontrolle.pollAnwesenheiten(kOnDate.anwesenheit_id, this.lv_id))
					.then(res => {
						this.checkInCount = res.data.anwesend
						this.abwesendCount = res.data.abwesend
						this.entschuldigtCount = res.data.entschuldigt
					})
			}
		},
		setTimespanForKontrolleNow() {
			// no termine found to fill starting fields from, set to current hour + 1
			const now = new Date()

			this.lektorState.beginn = {
				hours: now.getHours(),
				minutes: now.getMinutes(),
				seconds: now.getSeconds()
			}
			this.lektorState.ende = {hours: now.getHours() + 1, minutes: now.getMinutes(), seconds: now.getSeconds()}
		},
		setTimespanForKontrolleTermin(termin, setDate = true) {
			if (setDate) {
				this.selectedDate = new Date(termin.datum)
				this.kontrollDatumSourceStundenplan = true;
			}

			const beginn = new Date('1995-10-16 ' + termin.beginn)
			const ende = new Date('1995-10-16 ' + termin.ende)

			this.lektorState.beginn = {
				hours: beginn.getHours(),
				minutes: beginn.getMinutes(),
				seconds: beginn.getSeconds()
			}
			this.kontrollZeitSourceStundenplanBeginn = true
			this.kontrollDatumSourceStundenplan = (termin.isSameDay || setDate) ?? false
			
			this.lektorState.ende = {hours: ende.getHours(), minutes: ende.getMinutes(), seconds: ende.getSeconds()}
			
			this.kontrollZeitSourceStundenplanEnde = true
		},
		async startNewAnwesenheitskontrolle() {
			if (!this.lektorState.beginn || !this.lektorState.ende) {
				this.$fhcAlert.alertError(this.$p.t('global/errorAnwStartAndEndSet'))
				return
			}

			if (!this.validateTimespan(this.lektorState.beginn, this.lektorState.ende, this.selectedDate)) {
				return false;
			}

			if (await this.confirmKontrolleFremdeLe() === false) return

			this.showQRLoadingSpinner = true
			this.qr = '' // indirectly set start button disabled

			// fetch some data from stundenplan what should be happening rn
			// if there is no stundenplan entry enter some hours of anwesenheit?

			this.getNewQRCode()
		},
		async insertAnwWithoutQR() {
			if (!this.lektorState.beginn || !this.lektorState.ende) {
				this.$fhcAlert.alertError(this.$p.t('global/errorAnwStartAndEndSet'))
				return
			}

			if (!this.validateTimespan(this.lektorState.beginn, this.lektorState.ende, this.selectedDate)) {
				return false;
			}

			if (await this.confirmKontrolleFremdeLe() === false) return

			const date = {
				year: this.selectedDate.getFullYear(),
				month: this.selectedDate.getMonth() + 1,
				day: this.selectedDate.getDate()
			}
			
			this.$refs.modalContainerNewKontrolle.hide()
			this.loading = true
			this.$api.call(ApiKontrolle.insertAnwWithoutQR(this.$entryParams.selected_le_id.value, date, this.lektorState.beginn, this.lektorState.ende))
				.then(res => {

					const datefetch = this.formatDateToDbString(this.selectedDate)
					const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
					this.reloadState(ma_uid, datefetch)

					this.showQR(res.data)

				})
		},
		stopAnwesenheitskontrolle() {
			this.$refs.modalContainerQR.hide()

			this.stopPollingAnwesenheiten() // stops polling loop on server
			this.qr = null
			this.url = null
			this.code = null

			// maybe only fetch new entries and merge
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			
			this.reloadState(ma_uid, date)

			this.$api.call(ApiKontrolle.deleteQRCode(this.anwesenheit_id, this.lv_id))
				.then(
				res => {
					if (res.meta.status === "success" && res.data) {
						this.$fhcAlert.alertSuccess(this.$p.t('global/anwKontrolleBeendet'))
					} else {
						this.$fhcAlert.alertError(this.$p.t('global/errorDeleteQRCode'))
					}

					if (this.$entryParams.permissions.useRegenerateQR) this.stopRegenerateQR()
				}
			)
		},
		reloadState(ma_uid, date) {
			this.loading = true

			return this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid)).then(res => {
				if(res.meta.status === 'success') {
					this.setupData(res.data)
				}
			}).catch(() => {
				if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
			}).finally(() => {
				this.loading = false
			})
		},
		updateSumData(data) {
			data.forEach(e => {
				const student = this.lektorState.students.find(s => s.prestudent_id === e.prestudent_id)
				student.sum = e.sum
				const studentTable = this.lektorState.tableStudentData.find(s => s.prestudent_id === e.prestudent_id)
				studentTable.sum = e.sum
			})

			this.$refs.anwesenheitenTable.tabulator.clearSort()
			this.$refs.anwesenheitenTable.tabulator.setData(this.lektorState.tableStudentData);
		},
		openEditModal() {
			this.$refs.modalContainerEditKontrolle.show()
		},
		openLegend() {
			this.$refs.modalContainerLegende.show()
		},
		isKontrolleDeletable(kontrolle) {
			// same rule as deleteAnwesenheitskontrolle in the backend: full assistenz may delete every kontrolle,
			// everyone else only kontrollen inserted within kontrolleDeleteMaxReach days (day based, not the kontrolle date)
			if (this.$entryParams.permissions.admin || !kontrolle.insertamum) return true
			const [year, month, day] = kontrolle.insertamum.substring(0, 10).split('-')
			const limit = new Date()
			limit.setHours(0, 0, 0, 0)
			limit.setDate(limit.getDate() - (this.$entryParams.permissions.kontrolleDeleteMaxReach ?? 0))
			return new Date(year, month - 1, day) >= limit
		},
		async deleteAnwesenheitskontrolle(kontrolle) {
			// one popup only: a 2nd confirm opens during the leave transition of the 1st and
			// crashes the shared primevue ConfirmDialog (TypeError in Dialog.focus).
			// the foreign le popup takes the button classes of confirmDelete
			const le = this.$entryParams.selected_le_info?.value
			const confirmed = le && !this.isOwnLe(le)
				? await this.confirmFremdeLe('global/anwEditFremdeLeConfirm', 'ui/loeschen', {acceptClass: 'p-button-danger', rejectClass: 'p-button-secondary'})
				: await this.$fhcAlert.confirmDelete()
			if (!confirmed) return

			const dataparts = kontrolle.datum.split('.')
			const dateobj = new Date(dataparts[2], dataparts[1] - 1, dataparts[0])
			const date = {year: dateobj.getFullYear(), month: dateobj.getMonth() + 1, day: dateobj.getDate()}
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			const dateAnwFormat = dataparts[2] + '-' + dataparts[1] + '-' + dataparts[0]
			
			
				this.$api.call(ApiKontrolle.deleteAnwesenheitskontrolle(this.$entryParams.selected_le_id.value, date, kontrolle.anwesenheit_id))
				.then(res => {
				if (res.meta.status === "success" && res.data) {
					this.$fhcAlert.alertSuccess(this.$p.t('global/deleteAnwKontrolleConfirmation'))

					this.reloadState(ma_uid, dateAnwFormat)
				} else if (res.meta.status === "success" && !res.data) {
					this.$fhcAlert.alertWarning(this.$p.t('global/noAnwKontrolleFoundToDelete'))
				}
			})
			
		},
		editAnwesenheitskontrolle(kontrolle) {
			const vonSplit = kontrolle.von.split(':')
			kontrolle.editVon = {hours: vonSplit[0], minutes: vonSplit[1], seconds: vonSplit[2]}
			const bisSplit = kontrolle.bis.split(':')
			kontrolle.editBis = {hours: bisSplit[0], minutes: bisSplit[1], seconds: bisSplit[2]}
			if(this.editKontrolle === null) {
				this.editKontrolle = kontrolle
			} else {
				this.editKontrolle = null
			}
			
		},
		formatDateToDbString(date) {
			return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
				.toISOString()
				.split("T")[0];
		},
		// 'YYYY-MM-DD' -> 'DD.MM.YYYY'
		toFrontendDate(dbDateStr) {
			const parts = dbDateStr.split('-');
			return `${parts[2]}.${parts[1]}.${parts[0]}`;
		},
		formatZusatz(entry, stsem, config = {}) {
			// appends every matching suffix in the order of the core lehrelisthelper
			let zusatz = ''

			const stsemdatumvon = new Date(stsem.start)
			const stsemdatumbis = new Date(stsem.ende)
			const entryVon      = entry.von ? new Date(entry.von) : null
			const entryBis      = entry.bis ? new Date(entry.bis) : null

			if (entry.studienstatus === 'Incoming') {
				zusatz += ' (i)'
			}

			const isOutgoing = entry.bisio_id
				&& entry.studienstatus !== 'Incoming'
				&& entryVon !== null

			// Add an outgoing label if the entry overlaps with the semester and meets the 
			// minimum duration—either calculated as total duration or specific semester 
			// overlap days, depending on config.
			if (isOutgoing) {
				const startsBeforeSemEnds = entryVon <= stsemdatumbis
				const alreadyEnded        = entryBis !== null && entryBis < stsemdatumvon

				let stayLongEnough
				
				if (this.$entryParams.permissions.show_outgoing_semester_overlap) {
					// Overlap = how many days of the exchange actually fall within this semester
					const overlapStart = entryVon > stsemdatumvon ? entryVon : stsemdatumvon
					const overlapEnd   = (entryBis === null || entryBis > stsemdatumbis) ? stsemdatumbis : entryBis
					const overlapDays  = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)
					stayLongEnough = overlapDays >= (this.$entryParams.permissions.show_outgoing_semester_overlap_min_days ?? 30)
				} else {
					// original behaviour — total exchange duration >= 30 days
					const durationDays = entryBis !== null
						? (entryBis - entryVon) / (1000 * 60 * 60 * 24)
						: Infinity
					stayLongEnough = durationDays >= 30
				}

				if (startsBeforeSemEnds && !alreadyEnded && stayLongEnough) {
					zusatz += ' (o) (' + this.$p.t('global/anwZusatzOutgoingAb', [this.toFrontendDate(entry.von)]) + ')'
				}
			}

			if (entry.lkt_ueberschreibbar === false) zusatz += ' (' + entry.anmerkung + ')'
			if (entry.mitarbeiter_uid !== null)       zusatz += ' (ma)'
			if (entry.stg_kz_student == this.lektorState.a_o_kz) {
				zusatz += ' (a.o.)'
			}
			if (entry.mobilitaetstyp_kurzbz && entry.doubledegree === 1) {
				zusatz += ' (d.d.'
				if      (entry.ddtype == 'Intern') zusatz += 'int.)'
				else if (entry.ddtype == 'Extern') zusatz += 'ext.)'
				else                               zusatz += ')'
			}

			return zusatz
		},
		setEntries(anwEntries, kontrollen) {

			// from anw entries
			anwEntries.forEach(entry => {
				const kontrolle = kontrollen.find(k => k.anwesenheit_id === entry.anwesenheit_id)
				// search for distinct kontrollento use for show all columns
				this.lektorState.studentsData.get(entry.prestudent_id).push({
					datum: entry.datum,
					status: entry.status,
					fehlminuten: entry.fehlminuten ?? 0,
					notiz: entry.notiz,
					anwesenheit_user_id: entry.anwesenheit_user_id,
					anwesenheit_id: entry.anwesenheit_id,
					von: kontrolle?.von,
					bis: kontrolle?.bis,
					le_id: kontrolle?.lehreinheit_id
				})

				const datum = this.anwColumnKey(entry.datum, kontrolle.von, kontrolle.bis, kontrolle.lehreinheit_id)
				if (this.lektorState.dates.indexOf(datum) < 0) {
					this.lektorState.dates.push(datum)
				}
			})
			
			// sort dates and termine (ISO-prefixed, so plain string comparison sorts correctly)
			this.lektorState.dates.sort((a, b) => a.localeCompare(b))
		},
		async setupLektorComponent() {
			this.$entryParams.available_termine.value.forEach(termin => {
				termin.datumFrontend = this.toFrontendDate(termin.datum)
			})

			if (this.$entryParams.available_termine.value.length) {
				const closestTermin = this.$entryParams.findClosestTermin(this.$entryParams.available_termine.value);
				const termin = new Date(closestTermin.datum)
				const closestTerminSameDay = this.areDatesSame(this.selectedDate, termin)
				closestTermin.isSameDay = closestTerminSameDay
				this.setTimespanForKontrolleTermin(closestTermin, true)
			} else {
				this.setTimespanForKontrolleNow()	
			}
			
			this.lektorState.dates = []
			this.lektorState.studentsData = new Map()
			// format student zusatz and prepare entry map for anw data
			this.lektorState.students.forEach(entry => {
				entry.zusatz = this.formatZusatz(entry, this.lektorState.stsem)
				this.lektorState.studentsData.set(entry.prestudent_id, [])
			})
			
			this.setEntries(this.lektorState.anwEntries, this.lektorState.kontrollen)
			
			// datepicker only allows to select for distinct days but one day can lead to several
			// kontrollen on that day during different timespans -> find all from that date and postfix the von - bis times
			
			// determine if table goes with all available dates - kontrollen
			// or all kontrollen of a selected date if one or more are found
			const dates = this.determineDates()
			
			// define VISIBLE tabulator columns with dynamic columns
			const anwCols = this.buildColsForDates(dates)

			// tableData prefilled with all dates & status
			this.lektorState.tableStudentData = this.setupAllData()

			if (this.lektorState.showAllVar) {
				this.setShowAll()
			} else {
				// keep the tickbox in sync when the persisted render mode got overridden once
				if (this.$refs.showAllTickbox) this.$refs.showAllTickbox.checked = false

				// set phrasen by field id instead of index
				const titleKeys = {
					foto: 'global/foto',
					prestudent_id: 'global/prestudentID',
					student_uid: 'ui/student_uid',
					vorname: 'person/vorname',
					nachname: 'person/nachname',
					gruppe: 'lehre/gruppe',
					sum: 'global/summe'
				}
				this.anwesenheitenTabulatorOptions.columns.forEach(col => {
					if (titleKeys[col.field]) col.title = this.$capitalize(this.$p.t(titleKeys[col.field]))
				})

				this.lektorState.tabulatorCols = anwCols
				this.setTableColumns(anwCols)
				
				this.$refs.anwesenheitenTable.tabulator.setData(this.lektorState.tableStudentData);
			}

			this.loading = false

			// setupLektorComponent runs on every reload, register the watcher once only
			if (!this.selectedDateUnwatch) {
				this.selectedDateUnwatch = this.$watch('selectedDate', this.selectedDateWatcherHandler)
			}
		},
		setCurrentCountsFromTableData() {
			
			if(this.selectedDateCount === 1) {
				this.queryOnlyKontrolleShown()
			}
			
		},
		setupData(data) {
			this.lektorState.students = data.students ?? []
			this.lektorState.anwEntries = data.anwEntries ?? []
			this.lektorState.stsem = data.stsem?.[0] ?? []
			this.lektorState.entschuldigtStati = data.entschuldigtStati ?? []
			this.lektorState.kontrollen = data.kontrollen ?? []
			this.lektorState.kontrollen.forEach(k => {
				const dateparts = k.datum.split(".")
				k.jsDate = new Date(dateparts[2],dateparts[1] - 1,dateparts[0])
			})
			this.$entryParams.available_termine.value = this.getAvailableTermine()
			this.lektorState.a_o_kz = data.a_o_kz ?? []
			this.lektorState.gruppen = new Set()

			// the combined view always shows every kontrolle, the persisted flag is the single le setting
			this.lektorState.showAllVar = this.multiLeMode || localStorage.getItem('DigiAnwShowAll') == "true"

			// the table gets rebuilt from the new data, pending edits belong to the old data
			// (e.g. another le) and would be saved against the new selected_le_id
			this.changedData = []

			this.setupLektorComponent()
		},
		getAvailableTermine() {
			if(this.$entryParams.allLeTermine && this.$entryParams.allLeTermine[this.$entryParams.selected_le_id.value]) {
				return this.$entryParams.allLeTermine[this.$entryParams.selected_le_id.value] ?? []
			} else {
				// this should never happen since we always have termine setup before LE but still handling the odd case
				this.$fhcAlert.alertError(this.$p.t('global/keineTermineGefunden'))
				return  []
			}
		},
		async maUIDchangedHandler() {
			this.$refs.anwesenheitenTable.tabulator.clearSort()

			this.$emit('maUIDChanged')
			this.handleLEChanged()
		},
		openNewAnwesenheitskontrolleModal() {
			this.$refs.modalContainerNewKontrolle.show()
		},
		changeAnwStatus(cell, prestudent_id, fehlminuten = null, notiz = null) {
			const value = cell.getValue()
			if (value === undefined) return
			let date = cell.getColumn().getField() // '2024-10-16' or 'status'
			if (date === 'status') {
				date = this.formatDateToDbString(this.selectedDate)
			}

			const found = this.findStudentEntry(prestudent_id, date)
			const anwesenheit_user_id = found?.anwesenheit_user_id
			const anwesenheit_id = found?.anwesenheit_id
			const newEntry = {
				prestudent_id, date, status: value, anwesenheit_user_id, anwesenheit_id
			}
			if (value === this.$entryParams.permissions.fehlminuten_status) {
				newEntry.fehlminuten = fehlminuten
				// the dialog gives the notiz as well, it goes along only when it changed
				if (notiz !== null && notiz !== (found?.notiz ?? '')) newEntry.notiz = notiz || null
			}

			this.handleChange(newEntry)
		},
		handleChange(newEntry) {

			// check if the entry is in the original tableData with the same status and fehlminuten
			const original = this.findStudentEntry(newEntry.prestudent_id, newEntry.date)
			const updateFoundIndex = this.changedData.findIndex(e => e.prestudent_id === newEntry.prestudent_id && e.date === newEntry.date)
			if (updateFoundIndex >= 0) {
				this.changedData.splice(updateFoundIndex, 1)
			}

			const changed = !original || newEntry.status !== original.status
				|| (newEntry.status === this.$entryParams.permissions.fehlminuten_status && newEntry.fehlminuten !== original.fehlminuten)
				|| 'notiz' in newEntry

			if (changed) {
				this.changedData.push(newEntry)
			}
			
		},
		validateTimespan(beginn, ende, date, anwesenheit_id = null) {
			const newAnwVonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), beginn.hours, beginn.minutes, beginn.seconds)
			const newAnwBisDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), ende.hours, ende.minutes, ende.seconds)
			
			if (newAnwBisDate <= newAnwVonDate) {
				this.$fhcAlert.alertError(this.$p.t('global/errorValidateTimes'));
				return false
			} else if(newAnwBisDate > newAnwVonDate) {
				// timespan from von to bis needs to be 3/4 of a teaching unit
				const minDiff = (newAnwBisDate - newAnwVonDate) / (1000 * 60)
				const threshold = (this.$entryParams.permissions.einheitDauer ?? 0.75 ) * 60
				if(minDiff < threshold) {
					this.$fhcAlert.alertError(this.$p.t('global/kontrollDauerUnterMindestwert', [threshold]));
					return false
				}
			}
			
			// when editing dont compare with overlap with its own timespan, but on same date
			let kontrollenToCheck = null
			if(anwesenheit_id !== null) { 
				kontrollenToCheck = this.lektorState.kontrollen.filter(k => k.anwesenheit_id !== anwesenheit_id && k.jsDate.getFullYear() === date.getFullYear() && k.jsDate.getMonth() === date.getMonth() && k.jsDate.getDate() === date.getDate())
			} else {
				kontrollenToCheck = this.lektorState.kontrollen.filter(k => k.jsDate.getFullYear() === date.getFullYear() && k.jsDate.getMonth() === date.getMonth() && k.jsDate.getDate() === date.getDate())
			}
			
			// compare timespans
			const len = kontrollenToCheck.length
			for(let i = 0; i < len; i++) {
				const k = kontrollenToCheck[i]
				
				const kVonParts = k.von.split(":")
				const kBisParts = k.bis.split(":")
				
				const kVonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), kVonParts[0], kVonParts[1], kVonParts[2])
				const kBisDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), kBisParts[0], kBisParts[1], kBisParts[2])

				if(newAnwVonDate < kBisDate && newAnwBisDate > kVonDate) {
					this.$fhcAlert.alertError(this.$p.t('global/kontrolleTimeOverlap', [k.von, k.bis]));
					return false
				}
			}
			
			// date of kontrolle needs to be in range or a stundenplantermin. a termin of our stundenplan
			// is always valid, also in the future. looked up directly instead of kontrollDatumSourceStundenplan,
			// that flag only drives the warning and can be stale after a switch to an le without termine
			if(!this.isStundenplanDatum(this.selectedDate)
				&& (this.selectedDate < this.minDate || this.selectedDate > this.maxDate)) {
				this.$fhcAlert.alertError(this.$p.t('global/kontrolleDatumOutOfRangeV2'));
				return false
			}
			
			// compare with other existing kontrollen of the same day for current LE

			return true;
		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
		async setupMounted() {
			this.loading = true
			this.tableBuiltPromise = new Promise(this.tableResolve)
			await this.$entryParams.setupPromise
			await this.tableBuiltPromise

			this.boundPollAnwesenheit = this.pollAnwesenheit.bind(this)
			this.boundProgressCounter = this.progressCounter.bind(this)

			// ceiling to check for inside progress calc
			this.progressMax = this.$entryParams.permissions.regenerateQRTimer / 10
			// which is called in an interval
			this.progressTimerInterval = 10

			// see if test is still running
			this.getExistingQRCode()

			// fetch LE data
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid

			this.reloadState(ma_uid, date)
		},
		handleLEChanged() {
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			this.reloadState(ma_uid, date).finally(() => this.checkForBetreuungAndAlert())

			this.getExistingQRCode()
		},
		downloadCSV() {
			this.$refs.anwesenheitenTable.tabulator.download('csv', this.getCSVFilename, {bom: true})
		},
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		},
		redrawTable() {
			if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.redraw(true)
		},
		entschuldigtColoring: function (row) {
			const data = row.getData()
			const el = row.getElement()
			el.classList.remove('anw-entschuldigt', 'anw-entschuldigt-offen')

			if(!data.entschuldigungen?.length) return

			// filter for entschuldigungen relevant to selected date
			const entForSelectedDate = data.entschuldigungen.filter(status => {
				const vonDate = new Date(status.von)
				const bisDate = new Date(status.bis)
				if(vonDate <= this.selectedDate && bisDate >= this.selectedDate) return true
				else return false
			})

			let isEntschuldigt = null
			entForSelectedDate.forEach(entCurDate => {
				if(entCurDate.akzeptiert === true) isEntschuldigt = true
			})

			if (isEntschuldigt) {
				el.classList.add('anw-entschuldigt');
			} else if(entForSelectedDate.length) {
				el.classList.add('anw-entschuldigt-offen');
			}
		},
		checkForBetreuungAndAlert() {
			// throw an alert when Betreuung is selected which usually should not be attendance checked

			const alertConfig = this.$entryParams.permissions.alert_lehrform.find(a => a.lehrform_kurzbz === this.$entryParams.selected_le_info?.value?.lehrform_kurzbz)
			if(alertConfig) {
				const text = this.$entryParams.permissions.lang === 'German' ? alertConfig.german_alert_text : alertConfig.english_alert_text
				this.$fhcAlert.alertWarning(text)
			}
		},
		calculateTableHeight() {
			
			const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
			const tableDataSet = document.getElementById('filterTableDataset' + tableID);
			if(!tableDataSet) return
			const rect = tableDataSet.getBoundingClientRect();

			const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight : window.visualViewport.height
			this.$entryParams.tabHeights['lektor'].value = screenY - rect.top - this.$contentBottomOffset()

			const table = this.$refs.anwesenheitenTable.tabulator
			if (!table) return
			// tabulator reads the height option only on build, a later header change needs setHeight
			if (table.initialized) table.setHeight(this.$entryParams.tabHeights['lektor'].value)
			table.redraw(true)
		},
		determineDates() {
			// date string formatting
			const selectedDateDBFormatted = this.formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split("-")
			const selectedDateFrontendFormatted = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0]

			// standard -> show all termine of a certain date
			const datesFiltered = this.lektorState.dates.filter(d => d.startsWith(selectedDateDBFormatted))

			return datesFiltered
		},
		statusEditorValues() {
			const p = this.$entryParams.permissions
			let stati = []
			if (p.admin || p.assistenz) stati = [p.anwesend_status, p.fehlminuten_status, p.abwesend_status, p.entschuldigt_status]
			else if (p.lektor) stati = [p.anwesend_status, p.fehlminuten_status, p.abwesend_status]

			return stati.map(status => ({value: status, label: this.statusLabel(status)}))
		},
		baseColumns() {
			const fields = ['foto', 'prestudent_id', 'student_uid', 'vorname', 'nachname', 'gruppe']
			const cols = this.anwesenheitenTabulatorOptions.columns.filter(c => fields.includes(c.field))

			this.takeOverColumnVisibility(cols)

			return this.orderByCurrentColumns(cols)
		},
		buildDateColumn(date) {
			// field/title carry the raw column key (datum | von - bis | le_id),
			// build a readable header for downloads
			const keyParts = date.split(' | ')
			let titleDownload = this.toFrontendDate(keyParts[0]) + ' ' + (keyParts[1] ? this.stripSeconds(keyParts[1]) : '')
			if (this.multiLeMode && keyParts[2] !== undefined) titleDownload += ' ' + this.getLeLabel(keyParts[2])

			return {
				title: date,
				field: date,
				titleDownload,
				editor: 'list',
				editorParams: {
					values: Vue.computed(() => this.statusEditorValues())
				},
				editable: this.checkCellEditability,
				formatter: this.anwesenheitFormatterValue,
				accessorDownload: this.anwDownloadAccessor,
				titleFormatter: this.anwColTitleFormatter,
				hozAlign: 'center',
				widthGrow: 1,
				tooltip: false,
				minWidth: 150
			}
		},
		buildColsForDates(dates) {
			const anwCols = this.baseColumns()
			dates.forEach(d => anwCols.push(this.buildDateColumn(d)))

			const sumCol = this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'sum')
			this.takeOverColumnVisibility([sumCol])
			anwCols.push(sumCol)

			this.selectedDateCount = dates.length

			return anwCols
		},
		// the table replaces its columns on every date or lehreinheit change. Such a rebuild
		// resets the visibility, so take it over from the live table. This keeps what the
		// user or an applied table preset set for the constant columns
		takeOverColumnVisibility(cols) {
			const table = this.$refs.anwesenheitenTable?.tabulator
			if (!table) return

			table.getColumns().forEach(liveCol => {
				const col = cols.find(c => c.field === liveCol.getField())
				if (col) col.visible = liveCol.isVisible()
			})
		},
		// same reason for the column order, a rebuild resets it to the order of the definition
		orderByCurrentColumns(cols) {
			const table = this.$refs.anwesenheitenTable?.tabulator
			if (!table) return cols

			const currentFields = table.getColumns().map(col => col.getField())
			const rank = col => {
				const index = currentFields.indexOf(col.field)
				return index === -1 ? currentFields.length : index
			}

			return cols.slice().sort((a, b) => rank(a) - rank(b))
		},
		// tabulator drops the header filters and the sort when the columns get replaced.
		// Both belong to the column setup, restore them for the constant columns
		setTableColumns(cols) {
			const table = this.$refs.anwesenheitenTable.tabulator

			const headerFilters = table.getHeaderFilters().filter(f => this.presetColumns.includes(f.field))
			const sorters = table.getSorters().filter(s => this.presetColumns.includes(s.field))

			table.clearSort()
			table.setColumns(cols)

			headerFilters.forEach(f => table.setHeaderFilterValue(f.field, f.value))
			if (sorters.length) table.setSort(sorters.map(s => ({column: s.field, dir: s.dir})))
		},
		async restartKontrolle(kontrolle) {
			if (await this.confirmKontrolleFremdeLe() === false) return

			const kdate = new Date(kontrolle.datum)
			// js months 0-11, php months 1-12
			const date = {
				year: kdate.getFullYear(),
				month: kdate.getMonth() + 1,
				day: kdate.getDate()
			}
			
			this.$api.call(ApiKontrolle.restartKontrolle(kontrolle.anwesenheit_id,
				this.$entryParams.selected_le_id.value,
				date))
				.then(res => {
					if (res.data?.svg) {
						this.$refs.modalContainerEditKontrolle.hide()
						this.showQR(res.data)
					}
				})
		},
		async updateKontrolle() {
			const dataparts = this.editKontrolle.datum.split('.')
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			const dateAnwFormat = dataparts[2] + '-' + dataparts[1] + '-' + dataparts[0]

			if (!this.validateTimespan(this.editKontrolle.editVon, this.editKontrolle.editBis, this.editKontrolle.jsDate, this.editKontrolle.anwesenheit_id)) {
				return false;
			}

			if (await this.confirmEditFremdeLe() === false) return

			this.loading = true
			this.$api.call(ApiKontrolle.updateKontrolle(
				this.editKontrolle.anwesenheit_id,
				this.editKontrolle.editVon,
				this.editKontrolle.editBis,
				this.$entryParams.selected_le_id.value))
				.then(res => {
					if (res.meta.status === 'success') {
						this.$fhcAlert.alertSuccess(this.$p.t('ui/successSave'))
						
						const k = this.lektorState.kontrollen.find(k => k.anwesenheit_id === this.editKontrolle.anwesenheit_id)
						k.von = this.editKontrolle.editVon.hours + ':' + this.editKontrolle.editVon.minutes + ':' + this.editKontrolle.editVon.seconds
						k.bis = this.editKontrolle.editBis.hours + ':' + this.editKontrolle.editBis.minutes + ':' + this.editKontrolle.editBis.seconds
						
						this.editKontrolle = null

						// reload tableData since different kontroll times means different % for all students
						this.reloadState(ma_uid, dateAnwFormat)
					}
				}).catch(() => {
					// the api plugin shows the error (e.g. kontrolle shorter than the fehlminuten of a student)
					this.loading = false
				})
		},
		handleTitleSet(title) {
			this.selectedStudent.title = title
		},
		handleUpdateAnwesenheit() {
			// reload tableData to get state back
			if (this.multiLeMode) {
				this.lastLoadedLeIds = [] // force reload of the combined dataset
				this.loadSelectedLehreinheiten()
				return
			}

			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			this.reloadState(ma_uid, date)
		},
		selectedDateWatcherHandler(newVal) {
			if(newVal === "") {
				this.selectedDate = new Date(Date.now())
				return
			}

			// selectedDate also changes during setup (closest termin preselect) which queues
			// this watcher AFTER setShowAll already rendered all columns. In showAll render
			// mode the date must not collapse the table back to the single date columns,
			// it only feeds the kontrolle creation defaults then.
			if (this.lektorState.showAllVar) {
				this.handleChangeDatum(this.selectedDate) // still look up if datum is in termin list
				return
			}

			const dates = this.determineDates()
			const anwCols = this.buildColsForDates(dates)

			// selectedDateCount watcher already queries counts when it changes to 1
			this.handleChangeDatum(this.selectedDate) // look up if datum is in termin list

			this.lektorState.tabulatorCols = anwCols

			this.setTableColumns(anwCols)

		}
	},
	created(){
		this.lv_id = this.$entryParams.lv_id
		this.sem_kurzbz = this.$entryParams.sem_kurzbz
		this.ma_uid = this.$entryParams.permissions.authID
	},
	mounted() {
		this.setupMounted()

		this.calculateTableHeight()
		window.addEventListener('resize', this.calculateTableHeight)
		window.addEventListener('orientationchange', this.calculateTableHeight)
	},
	unmounted(){
		window.removeEventListener('resize', this.calculateTableHeight)
		window.removeEventListener('orientationchange', this.calculateTableHeight)
		// anwesenheitskontrolle could be active
		this.stopPollingAnwesenheiten()
		clearInterval(this.progressTimerID)
		this.progressTimerID = null
		clearTimeout(this.multiselectDebounceTimer)
	},
	watch: {
		selectedDateCount(newVal) {
			// if just one kontrolle is selected query counts for that kontrolle
			if(newVal === 1) {
				this.queryOnlyKontrolleShown()
			}
		}
	},
	computed: {
		getLEOptions() {
			// always every le of the lva, unlike available_le_info
			// which gets refiltered when an admin switches the maUID dropdown.
			// grouped into the les the user teaches and the ones of colleagues
			const all = this.$entryParams.available_le_info_lva.value ?? []
			const mine = all.filter(le => this.isOwnLe(le))
			const others = all.filter(le => !this.isOwnLe(le))

			const groups = []
			if (mine.length) groups.push({label: this.$p.t('global/anwMeineLvTeile'), items: mine})
			if (others.length) groups.push({label: this.$p.t('global/anwLvTeileKollegen'), items: others, fremd: true})
			return groups
		},
		showFremdeLeToggle() {
			// only when both groups exist. A selected colleague le must stay in the options,
			// else the dropdown loses its label. Users without own les see every le anyway.
			// the footer keeps one button for both states, a swapped node counts as outside click and closes the panel
			const le = this.$entryParams.selected_le_info?.value
			return this.getLEOptions.length === 2 && !!le && this.isOwnLe(le)
		},
		getLeDropdownOptions() {
			if (this.showFremdeLe || !this.showFremdeLeToggle) return this.getLEOptions
			return this.getLEOptions.filter(group => !group.fremd)
		},
		canEditSelectedLe() {
			// same rule as isAdminOrTeachesLE in the backend: a colleagues le is read only without the supplierung right
			const le = this.$entryParams.selected_le_info?.value
			const permissions = this.$entryParams.permissions
			return !le || permissions.admin || permissions.supplierung || this.isOwnLe(le)
		},
		getTooltipGesamtansicht() {
			return this.$p.t('global/tooltipAnwGesamtansicht')
		},
		currentLEhasRightToSkipQR() {
			if(!this.$entryParams.permissions.no_qr_lehrform || !this.$entryParams.permissions.no_qr_lehrform.length) return false
			if(!this.$entryParams.selected_le_info?.value) return false
			return this.$entryParams.permissions.no_qr_lehrform.includes(this.$entryParams.selected_le_info?.value?.lehrform_kurzbz)
		},
		getTitle() {
			if (this.multiLeMode) return this.getLvKurzbz + ' – ' + this.$p.t('global/anwGesamtansicht')
			return this.$entryParams.selected_le_info?.value?.infoString ?? ''
		},
		getLvKurzbz() {
			// every le of the lva carries the lv kurzbz, the combined selection can be empty
			return this.$entryParams.available_le_info_lva.value?.[0]?.kurzbz ?? ''
		},
		getLvTeileAnzahl() {
			return this.$p.t('global/anwLvTeileAnzahl', [this.selectedLehreinheiten.length, this.$entryParams.available_le_info_lva.value?.length ?? 0])
		},
		getCombinedSubtitle() {
			// les of a lva often share their groups (e.g. VO and UE of the same groups), list each group once
			const groups = [...new Set(this.selectedLehreinheiten.flatMap(le => le.groupKeys ?? []))]
				.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
			return groups.length ? this.getLvTeileAnzahl + ' · ' + groups.join(', ') : this.getLvTeileAnzahl
		},
		getTooltipCombinedSelection() {
			return this.selectedLehreinheiten.map(le => le.csvInfoString + ' – ' + (le.lektor_names?.join(', ') ?? '')).join('\n')
		},
		getTooltipKontrolleLoeschen() {
			return this.$p.t('global/tooltipLektorDeleteKontrolleV2', [this.$entryParams.permissions.kontrolleDeleteMaxReach ])
		},
		getTooltipKontrolleNeu() {
			return this.$p.t('global/tooltipLektorStartKontrolleV5', [(this.$entryParams.permissions.einheitDauer ?? 0.75) * 60])
		},
		getTooltipZeitFromStundenplan() {
			return this.$p.t('global/tooltipUnterrichtZeitCustomV2') //'Zeiten wurden aus dem Stundenplan entnommen, nur in Ausnahmefällen überschreiben!',
		},
		getTooltipDatumFromStundenplan() {
			return this.$p.t('global/tooltipUnterrichtDatumCustomV2')
		},
		getTooltipLegende() {
			return this.$p.t('global/tooltipLegendeV2')
		},
		getTooltipCsv() {
			return this.$p.t('global/tooltipCsvV2')
		},
		getTooltipEdit() {
			return this.$p.t('global/tooltipEdit')
		},
		getTooltipSaveChanges() {
			return this.$p.t('global/tooltipSaveChanges')
		},
		getTooltipRestartKontrolle() {
			return this.$p.t('global/tooltipRestartKontrolle')
		},
		getTooltipDeleteKontrolle() {
			return this.$p.t('global/tooltipDeleteKontrolleV2')
		},
		getTooltipEditKontrollzeiten() {
			return this.$p.t('global/tooltipEditKontrollzeiten')
		},
		getSaveBtnClass() {
			return !this.changedData.length ? "btn btn-secondary ml-2" : "btn btn-primary ml-2"
		},
		getEditBtnClass() {
			return !this.lektorState.kontrollen.length ? "btn btn-secondary ml-2" : "btn btn-success ml-2"
		},
		getCSVFilename() {
			let str = ''
			if(this.multiLeMode) {
				// without the group list, it gets too long for a file name
				str = this.getLvKurzbz + '_' + this.$p.t('global/anwGesamtansicht') + '_' + this.getLvTeileAnzahl.replace(/\s+/g, '-')
			} else {
				str = this.$entryParams.selected_le_info?.value?.csvInfoString ?? ''
			}
			str += '_'+ this.$entryParams?.viewDataLv?.bezeichnung + '_'
			str += this.lektorState.showAllVar ? 'AllDates' : this.selectedDate.toDateString()
			return str
		},
		highlights() { // highlight either kontrollen/termine/allowedRange based on setting
			const highlights = []
			if(this.highlightMode === 'allowed') {
				const current = new Date(this.minDate)

				while (current <= this.maxDate) {
					highlights.push(new Date(current))
					current.setDate(current.getDate() + 1)
				}

				if(this.$entryParams.available_termine.value) this.$entryParams.available_termine.value.forEach(v => {
					highlights.push(new Date(v.datum))
				})
			} else if (this.highlightMode === 'kontrollen') {
				this.lektorState.kontrollen.forEach(v => {
					highlights.push(v.jsDate)
				})
			} else if (this.highlightMode === 'termine') {
				if(this.$entryParams.available_termine.value) this.$entryParams.available_termine.value.forEach(v => {
					highlights.push(new Date(v.datum))
				})
			}
			

			return highlights
		}
	},
	template:`
		<div v-show="loading" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.5); z-index: 8500;"></div>
		
		<core-base-layout>			
			<template #main>
				<div id="lektorWrap" v-bind="$attrs">
				
					<bs-modal ref="modalContainerNewKontrolle" class="bootstrap-prompt" dialogClass="modal-xl">
						<template v-slot:title>			
							<div v-tooltip.bottom.sticky="getTooltipKontrolleNeu">
								{{ $p.t('global/neueAnwKontrolle') }}
								<i class="fa fa-circle-question"></i>
							</div>
						</template>
						<template v-slot:default>
						
							<div class="row">
								<div class="col-12">
									<h5 class="mb-4 border-bottom pb-2">{{ $p.t('global/unterrichtzeit') }}</h5>
							
									<div class="row align-items-center mb-3">
										<div class="col-3">
											<label for="beginn" class="form-label mb-0 fw-semibold">{{ $p.t('global/anwKontrolleVon') }}</label>
										</div>
										<div class="col-4">
											<datepicker
												v-model="lektorState.beginn"
												@update:model-value="handleChangeBeginn"
												:clearable="false"
												:time-picker="true"
												:text-input="true"
												:auto-apply="true"
											/>
										</div>
										<div class="col-5" v-show="!kontrollZeitSourceStundenplanBeginn">
											<div  
												 class="d-flex align-items-start small" 
												 v-tooltip.bottom.sticky="getTooltipZeitFromStundenplan">
												<i class="fa-solid fa-triangle-exclamation mt-1 me-2"></i>
												<span>{{ $p.t('global/zeitNichtAusStundenplanBeginnV3') }}</span>
											</div>
										</div>
									</div>
							
									<div class="row align-items-center mb-3">
										<div class="col-3">
											<label for="von" class="form-label mb-0 fw-semibold">{{ $capitalize($p.t('global/anwKontrolleBis')) }}</label>
										</div>
										<div class="col-4">
											<datepicker
												v-model="lektorState.ende"
												@update:model-value="handleChangeEnde"
												:clearable="false"
												:time-picker="true"
												:text-input="true"
												:auto-apply="true"
											/>
										</div>
										<div class="col-5" v-show="!kontrollZeitSourceStundenplanEnde">
											<div  
												 class="d-flex align-items-start small" 
												 v-tooltip.bottom.sticky="getTooltipZeitFromStundenplan">
												<i class="fa-solid fa-triangle-exclamation mt-1 me-2"></i>
												<span>{{ $p.t('global/zeitNichtAusStundenplanEndeV3') }}</span>
											</div>
										</div>
									</div>
							
									<div class="row align-items-center mb-4">
										<div class="col-3">
											<label for="datum" class="form-label mb-0 fw-semibold">{{ $p.t('global/kontrolldatumV2') }}</label>
										</div>
										<div class="col-4">
											<datepicker
												ref="insideDateSelect"
												v-model="selectedDate"
												:clearable="false"
												locale="de"
												format="dd.MM.yyyy"
												:text-input="true"
												@date-update="handleAutoApply"
												:highlight="highlights">
												
												<template #action-row>
													<HighlightModeSelector v-model="highlightMode" />
												</template>
											</datepicker>
										</div>
										<div class="col-5" v-show="!kontrollDatumSourceStundenplan">
											<div  
												 class="d-flex align-items-start small" 
												 v-tooltip.bottom.sticky="getTooltipDatumFromStundenplan">
												<i class="fa-solid fa-triangle-exclamation mt-1 me-2"></i>
												<span>{{ $p.t('global/datumNichtAusStundenplanV2') }}</span>
											</div>
										</div>
									</div>
							
									<hr class="my-4" />
							
									<div class="row">
										<div class="col-12">
											<TermineDropdown ref="termineDropdown" @terminChanged="handleTerminChanged" />
										</div>
									</div>
								</div>
							</div>
						</template>
						<template v-slot:footer>
							
							<button v-if="currentLEhasRightToSkipQR" type="button" class="btn btn-primary" @click="insertAnwWithoutQR">{{ $p.t('global/kontrolleOhneQR') }}</button>
							<button v-show="!showQRLoadingSpinner" :disabled="qr != null" type="button" class="btn btn-primary" @click="startNewAnwesenheitskontrolle">{{ $p.t('global/jetztStartenV2') }}</button>
							<div v-show="showQRLoadingSpinner">
								<i class="fa-solid fa-spinner fa-pulse fa-3x"></i>
							</div>
						</template>
					</bs-modal>
					
					<bs-modal ref="modalContainerEditKontrolle" class="bootstrap-prompt"
					dialogClass="modal-xl">
						<template v-slot:title>
							{{ $p.t('global/editAnwKontrolle') }}

						</template>
						<template v-slot:default>
						
							<template v-for="kontrolle in lektorState.kontrollen">

								<div class="row p-2">
									<div class="col-5 d-flex align-items-center">
										<KontrolleDisplay :kontrolle="kontrolle"></KontrolleDisplay>
									</div>
									<div class="col-4">
										<AnwCountDisplay :anwesend="kontrolle.anwesend" :abwesend="kontrolle.abwesend" :entschuldigt="kontrolle.entschuldigt"/>
									</div>
									<div class="col-3 d-flex justify-content-end">
										<button @click="restartKontrolle(kontrolle)" role="button" class="btn btn-secondary" v-tooltip.bottom.sticky="getTooltipRestartKontrolle">
											<i class="fa fa-rotate-right"></i>
					
										</button>
										
										<span style="margin-left: 12px;" v-tooltip.bottom.sticky="isKontrolleDeletable(kontrolle) ? getTooltipDeleteKontrolle : getTooltipKontrolleLoeschen">
											<button @click="deleteAnwesenheitskontrolle(kontrolle)" :disabled="!isKontrolleDeletable(kontrolle)" role="button" class="btn btn-danger">
												<i class="fa fa-trash"></i>
											</button>
										</span>
										
										<button style="margin-left: 12px;" @click="editAnwesenheitskontrolle(kontrolle)" role="button" class="btn btn-success" v-tooltip.bottom="getTooltipEditKontrollzeiten">
											<i class="fa fa-pen"></i>
										</button>
										
									</div>
								</div>
								
								<div v-if="editKontrolle && editKontrolle === kontrolle" class="row align-items-center p-4" style="border: 0px;">
									<div class="col-10">
										<div class="row align-items-center">
											<div class="col-3" style="align-items: center; justify-items: center;">
												<label for="beginn" class="form-label">{{ $p.t('global/anwKontrolleVon') }}</label>
											</div>
											<div class="col-9">
												<datepicker v-if="editKontrolle"
													v-model="editKontrolle.editVon"
													@update:model-value="handleChangeBeginn"
													:clearable="false"
													:time-picker="true"
													:text-input="true"
													:auto-apply="true">
												</datepicker>
												
											</div>
										</div>

										<div class="row align-items-center mt-2">
											<div class="col-3" style="align-items: center; justify-items: center;">
												<label for="von" class="form-label">{{ $capitalize($p.t('global/anwKontrolleBis')) }}</label>
											</div>
											<div class="col-9">
												<datepicker v-if="editKontrolle"
													v-model="editKontrolle.editBis"
													@update:model-value="handleChangeEnde"
													:clearable="false"
													:time-picker="true"
													:text-input="true"
													:auto-apply="true">
												</datepicker>
												
											</div>
										</div>	
									</div>
									<div class="col-2">
										<button role="button" class="col text-white option-entry text-center w-100 btn" @click="updateKontrolle">{{ $p.t('global/speichern') }}</button>
									</div>
								</div>
								<Divider/>
							</template>
						</template>
					</bs-modal>		
	
					<FehlminutenDialog ref="fehlminutenDialog"></FehlminutenDialog>

					<bs-modal ref="modalContainerLegende" class="bootstrap-prompt" dialogClass="modal-lg">
						<template v-slot:title>
							<div>
								{{ $p.t('global/anwLegende') }}
							</div>
						</template>
						<template v-slot:default>
							<Statuslegende></Statuslegende>
						</template>
					</bs-modal>
					
					<bs-modal ref="modalContainerStudentByLva" class="bootstrap-prompt" dialogClass="modal-xl" :allowFullscreenExpand="true">
						<template v-slot:title>
							<div>
								{{ $capitalize($p.t('global/studentByLVATitle'))}}: {{ selectedStudent?.title }}
							</div>
						</template>
						<template v-slot:default>
							<StudentByLvaComponent ref="studentByLva" v-if="selectedStudent" 
								@anwesenheitenUpdated="handleUpdateAnwesenheit"
								@titleSet="handleTitleSet"
								:id="selectedStudent.id" 
								:lv_id="selectedStudent.lv_id"
								:sem_kz="selectedStudent.sem_kz"
							></StudentByLvaComponent>
						</template>
					</bs-modal>
					
					<div id="qrwrap">
						<bs-modal ref="modalContainerQR" class="bootstrap-prompt" dialogClass="modal-lg"  backdrop="static" 
						 :keyboard=false :noCloseBtn="true" :allowFullscreenExpand="true">
							<template v-slot:title>{{ $capitalize($p.t('global/kontrolle')) }}: {{ kontrolleVonBis }}
							
							</template>
							<template v-slot:default>
								<div id="qrcontent">
									<h1 class="text-center">Code: {{code}}</h1>
									<div v-html="qr" class="text-center"></div>
									
									<AnwCountDisplay :anwesend="checkInCount" :abwesend="abwesendCount" :entschuldigt="entschuldigtCount"/>
									
									<div class="row" style="width: 80%; margin-left: 10%;">
										<progress 
											v-if="$entryParams.permissions.useRegenerateQR"
											:max="progressMax"
											:value="regenerateProgress">
										</progress>
									</div>
								</div>
								
							</template>
							<template v-slot:footer>
								<button type="button" class="btn btn-primary" @click="stopAnwesenheitskontrolle">{{ $capitalize($p.t('global/endAnwKontrolle')) }}</button>
							</template>
						</bs-modal>
					</div>
					
					<div class="row" id="lektorContentHeader" ref="lektorContentHeader">
					
						<div class="col-6">				
							<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
								<h1 class="h4">{{ $entryParams.selected_le_info?.value?.infoString ? getTitle : '' }}</h1>
								<div v-if="multiLeMode" class="small text-body-secondary text-truncate mb-2" style="max-width: 100%" v-tooltip.bottom.sticky="getTooltipCombinedSelection">{{ getCombinedSubtitle }}</div>
								<h6>{{$entryParams.viewDataLv.bezeichnung}}</h6>
								<AnwCountDisplay  v-if="selectedDateCount == 1 && !lektorState?.showAllVar" :anwesend="checkInCount" :abwesend="abwesendCount" :entschuldigt="entschuldigtCount"/>
							</div>
						</div>
						
	
						<div class="col-6">
							<div class="row g-3 mb-4" v-if="!$entryParams?.permissions?.legacy_le_selection" style="padding-right: 2%" >
								<div class="col-12 d-flex align-items-center gap-2" style="padding-right: 24px">
									<template v-if="!multiLeMode">
										<Dropdown
											:modelValue="$entryParams.selected_le_info.value"
											:options="getLeDropdownOptions"
											optionLabel="infoString"
											optionGroupLabel="label"
											optionGroupChildren="items"
											dataKey="lehreinheit_id"
											scrollHeight="400px"
											class="flex-grow-1"
											style="min-width: 0"
											@change="handleLeDropdownChanged"
										>
											<template #option="slotProps">
												<div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 1rem;">
													<span>{{ slotProps.option.infoString }}</span>
													<span v-if="!isOwnLe(slotProps.option)">{{ slotProps.option.lektor_names?.join(', ') }}</span>
												</div>
											</template>
											<template #footer>
												<div v-if="showFremdeLeToggle" class="border-top px-3 py-2">
													<button type="button" class="btn btn-link btn-sm p-0" @click="showFremdeLe = !showFremdeLe">
														<i class="fa fa-users me-1"></i>{{ showFremdeLe ? $p.t('global/anwWeitereLvTeileAusblenden') : $p.t('global/anwWeitereLvTeileAnzeigen') }}
													</button>
												</div>
											</template>
										</Dropdown>
										<button type="button" class="btn btn-outline-secondary text-nowrap" @click="enterCombinedView" v-tooltip.bottom="getTooltipGesamtansicht">
											<i class="fa fa-layer-group me-1"></i>{{ $p.t('global/anwGesamtansicht') }}
										</button>
									</template>
									<template v-else>
										<Multiselect
											ref="leMultiselect"
											v-model="selectedLehreinheiten"
											:options="getLEOptions"
											optionLabel="infoString"
											optionGroupLabel="label"
											optionGroupChildren="items"
											dataKey="lehreinheit_id"
											:placeholder="$p.t('global/anwLvTeileAuswaehlen')"
											:maxSelectedLabels="3"
											:selectedItemsLabel="getLvTeileAnzahl"
											showToggleAll
											scrollHeight=400
											class="flex-grow-1"
											style="min-width: 0"
											@show="handleMultiselectShow"
											@hide="handleMultiselectHide"
											@change="handleChangeLEMultiselect"
										>
											<template #option="slotProps">
												<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
													<span>{{ slotProps.option.infoString }}</span>
													<span>{{ slotProps.option.lektor_names ? slotProps.option.lektor_names.join(', ') : slotProps.option.vorname + ' ' + slotProps.option.nachname }}</span>
												</div>
											</template>
										</Multiselect>
										<button type="button" class="btn btn-outline-secondary text-nowrap" @click="exitCombinedView">
											<i class="fa fa-xmark me-1"></i>{{ $p.t('global/anwGesamtansichtBeenden') }}
										</button>
									</template>
								</div>
								<div class="col-12" v-if="multiLeMode || !canEditSelectedLe" style="padding-right: 24px">
									<div class="alert alert-info small py-1 px-2 mb-0">
										<i class="fa fa-lock me-1"></i>{{ multiLeMode ? $p.t('global/anwGesamtansichtInfoV3') : $p.t('global/anwFremdeLeNurAnsicht', [$entryParams.selected_le_info.value?.lektor_names?.join(', ') ?? '']) }}
									</div>
								</div>
							</div>

							<div v-else class="row g-3 align-items-end">
								<div class="col-5" v-if="$entryParams?.permissions?.admin">
									<MaUIDDropdown 
										id="maUID" 
										ref="MADropdown" 
										@maUIDchanged="maUIDchangedHandler"
									/>
								</div>
								<div :class="$entryParams?.permissions?.admin ? 'col-7' : 'col-12'">
									<LehreinheitenDropdown 
										id="lehreinheit" 
										ref="LEDropdown" 
										@leChanged="handleLEChanged"
									/>
								</div>
							</div>
						
							<div v-show="!multiLeMode" class="row mt-4 align-items-center">
								<div class="col-auto">
									<label for="datum" class="form-label mb-0">{{ $p.t('global/kontrolldatumV2') }}</label>
								</div>
								
								<div class="col-4">
									<datepicker
										ref="outsideDateSelect"
										v-model="selectedDate"
										:clearable="false"
										locale="de"
										format="dd.MM.yyyy"
										@date-update="handleAutoApply"
										:text-input="true"
										:highlight="highlights"
									>
										<template #action-row>
											<HighlightModeSelector v-model="highlightMode" />
										</template>
									</datepicker>
								</div>
						
								<div class="col-5 d-flex align-items-center">
									<div class="form-check d-flex align-items-center gap-2">
										<input
											type="checkbox" 
											class="form-check-input m-0" 
											@click="handleShowAllToggle" 
											id="all" 
											ref="showAllTickbox"
											style="cursor: pointer; width: 1.2rem; height: 1.2rem;"
										>
										<label class="form-check-label mb-0" for="all" style="cursor: pointer; white-space: nowrap;">
											{{ $p.t('global/showAllKontrollen') }} | 
											<span>{{ selectedDateCount }} / {{ lektorState.kontrollen.length }}</span>
										</label>
									</div>
								</div>
							</div>
						</div>
					</div>
					<core-filter-cmpt
						title=""
						@uuidDefined="handleUuidDefined"
						ref="anwesenheitenTable"
						:tabulator-options="anwesenheitenTabulatorOptions"
						:tabulator-events="anwesenheitenTabulatorEventHandlers"
						:isUsingPresets="true"
						presetsId="anwesenheitenLektorTable"
						:presetColumns="presetColumns"
						:id-field="'anwesenheiten_id'"
						:tableOnly="true"
						:newBtnShow="true"
						:newBtnLabel="$p.t('global/neueAnwKontrolle')"
						:newBtnDisabled="!lektorState.students.length || multiLeMode || !canEditSelectedLe"
						@click:new=openNewAnwesenheitskontrolleModal
						:sideMenu="false"
						noColumnFilter>
							<template #actions>
								<button @click="saveChanges" :disabled="!changedData.length" role="button" :class="getSaveBtnClass" v-tooltip.bottom="getTooltipSaveChanges">
									<i class="fa fa-save"></i>
								</button>
								
								<button @click="openEditModal" :disabled="!lektorState.kontrollen.length || multiLeMode || !canEditSelectedLe" role="button" :class="getEditBtnClass" v-tooltip.bottom="getTooltipEdit">
									<i class="fa fa-pen"></i>
								</button>
								
								<button @click="downloadCSV" role="button" class="btn btn-secondary ml-2" v-tooltip.bottom="getTooltipCsv">
									<i class="fa fa-file-csv"></i>
								</button>
								
								<button @click="openLegend" role="button" class="btn btn-secondary ml-2" v-tooltip.bottom="getTooltipLegende">
									<i class="fa fa-book"></i>
								</button>
							</template>
					</core-filter-cmpt>	
				</div>

			</template>
		</core-base-layout>`

};

export default LektorComponent