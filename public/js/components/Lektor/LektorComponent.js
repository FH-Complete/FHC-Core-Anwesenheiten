import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import { lektorFormatters } from "../../formatters/formatters.js";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown.js";
import {MaUIDDropdown} from "../Setup/MaUIDDropdown.js";
import {KontrollenDropdown} from "../Setup/KontrollenDropdown.js";
import {TermineDropdown} from "../Setup/TermineDropdown.js";
import {AnwCountDisplay} from "./AnwCountDisplay.js";
import {KontrolleDisplay} from "./KontrolleDisplay.js";
import {Statuslegende} from "./Statuslegende.js";
import {HighlightModeSelector} from "./HighlightModeSelector.js";
import ApiKontrolle from '../../api/factory/kontrolle.js';
import {StudentByLvaComponent} from "./StudentByLvaComponent.js"

export const LektorComponent = {
	name: 'LektorComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		CoreNavigationCmpt,
		BsModal,
		Divider: primevue.divider,
		TermineDropdown,
		LehreinheitenDropdown,
		MaUIDDropdown,
		KontrollenDropdown,
		AnwCountDisplay,
		Multiselect: primevue.multiselect,
		"datepicker": VueDatePicker,
		Statuslegende,
		KontrolleDisplay,
		StudentByLvaComponent,
		HighlightModeSelector
	},
	data() {
		return {
			showQRLoadingSpinner: false,
			selectedStudent: null,
			kontrolleVonBis: null,
			editKontrolle: null,
			highlightMode: 'allowed',
			selectedDateCount: 0,
			externalModalContainer: null,
			externalWindow: null,
			tabulatorUuid: Vue.ref(0),
			stunden: null,
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
			anwesenheitenTabulatorOptions: {
				rowFormatter: this.entschuldigtColoring,
				height: this.$entryParams.tabHeights.lektor,
				index: 'prestudent_id',
				debugInvalidComponentFuncs: false,
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: this.$capitalize(this.$p.t('global/foto')), field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: true, minWidth: 100, maxWidth: 100, download: false, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('global/prestudentID')), field: 'prestudent_id', formatter: lektorFormatters.centeredFormatter, visible: false, minWidth: 150, download: true, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('ui/student_uid')), field: 'student_uid', formatter: lektorFormatters.centeredFormatter, visible: false, minWidth: 150, download: true, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('person/vorname')), field: 'vorname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1,  minWidth: 150, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('person/nachname')), field: 'nachname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1, minWidth: 150, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('lehre/gruppe')), field: 'gruppe', headerFilter: 'list', tooltip: this.tooltipTableRow,
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
						tooltip: this.tooltipTableRow,
						minWidth: 150
					},
					{title: this.$capitalize(this.$p.t('global/summe')), field: 'sum', formatter: this.percentFormatter,widthGrow: 1, minWidth: 150, tooltip: this.tooltipTableRow},
				],
				persistence: {
					sort: false,
					filter: true,
					headerFilter: false,
					group: true,
					page: true,
					columns: false,
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

						if(this.changedData.length && await this.$fhcAlert.confirm({
							message: this.$p.t('global/anwUnsavedChangesConfirm'),
							acceptLabel: this.$p.t('global/anwDiscardAndContinue'),
							acceptClass: 'btn btn-danger',
							rejectLabel: this.$p.t('global/zurueck'),
							rejectClass: 'btn btn-outline-secondary'
						}) === false) {
							return
						}

						// maybe incorporate more changes to dataState to avoid reloads
						//  in the future when performance is an issue
						if(!this.changes) this.$entryParams.lektorState = this.lektorState

						this.selectedStudent = {id: prestudent_id, lv_id: this.lv_id, sem_kz: this.sem_kurzbz, title: ''}
						Vue.nextTick(()=>{
							this.$refs.studentByLva.load()
							// just show studentByLva component in a fullscreen modal, avoid the routing shenanigans here
							this.$refs.modalContainerStudentByLva.show()
						})
						
					}
				}
			},
			{
				event: "cellEdited",
				handler: async (cell) => {
					
					const row = cell.getRow()
					const prestudent_id = row.getData().prestudent_id

					this.changeAnwStatus(cell, prestudent_id)
					const el = cell.getElement()

					el.classList.toggle('anw-dirty', !!this.changedData.find(d => d.prestudent_id === prestudent_id))
					
				}
			},
			{
				event: "tableBuilt",
				handler: async () => {
					this.tableBuiltResolve()
				}
			}],
			boundRegenerateQR: null,
			boundProgressCounter: null,
			changedData: [],
			selectedLehreinheiten: [],
			multiselectOpen: false,
			multiselectDebounceTimer: null,
			lastLoadedLeIds: [],
			selectedDateUnwatch: null,
			deleteData: null,
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
			entschuldigtCount: 0,
			studentCount: 0,
			changes: false // if something could have happened to dataset -> reload on mounted
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
	props: {
		permissions: [],
		translateOffset: {
			type: Number,
			default: 60
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
			const leIds = this.selectedLehreinheiten.map(le => le.lehreinheit_id).sort()

			if (leIds.join() === this.lastLoadedLeIds.join()) return // selection unchanged since last load
			this.lastLoadedLeIds = leIds

			if (!leIds.length) {
				const date = this.formatDateToDbString(this.selectedDate)
				const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
				this.reloadState(ma_uid, date)
				return
			}

			if (leIds.length === 1) {
				// exactly one le picked -> switch into the regular single le context with full
				// functionality, so a lvlead teacher can run kontrollen for a colleague
				const le = this.selectedLehreinheiten[0]
				this.$entryParams.selected_le_id.value = le.lehreinheit_id
				this.$entryParams.selected_le_info.value = le
				
				const date = this.formatDateToDbString(this.selectedDate)
				const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
				this.reloadState(ma_uid, date)

				this.getExistingQRCode()
				return
			}

			// the persisted showAll flag acts as render mode and is applied in setupData
			this.loading = true
			this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLva(this.lv_id, this.sem_kurzbz, leIds))
				.then(res => {
					if (res.meta.status === 'success') this.setupData(res.data)
				}).catch(() => {
					if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
				}).finally(() => {
					this.loading = false
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
		getLeLabel(le_id) {
			const options = this.$entryParams.available_le_info_lva.value?.length
				? this.$entryParams.available_le_info_lva.value
				: this.$entryParams.available_le_info.value
			const le = options?.find(o => o.lehreinheit_id == le_id)
			return le?.groupString ?? le?.csvInfoString ?? le?.infoString ?? ('LE ' + le_id)
		},
		anwColTitleFormatter(cell) {
			const title = cell.getColumn().getDefinition().title;
			const titleParts = title.split("|")

			const titledate = titleParts[0].trimEnd()
			const selectedDateFrontendFormatted = this.toFrontendDate(titledate)

			const container = document.createElement("div");
			container.style.textAlign = "center";
			container.innerHTML = `<span style="font-weight: bold;">${selectedDateFrontendFormatted}</span><br><span style="color: gray;">${titleParts[1]}</span>`;

			// in the combined multi le view show which lehreinheit the kontrolle belongs to
			if (this.multiLeMode && titleParts[2] !== undefined) {
				const leLabel = this.getLeLabel(titleParts[2].trim())
				container.innerHTML += `<br><span style="color: gray; font-size: 0.75em;">${leLabel}</span>`;
			}
			return container;
		},
		checkCellEditability(cell) {
			if (this.multiLeMode) return false // combined multi le view is read only for now
			const val = cell.getValue()
			return val !== undefined && val !== '-' // dont allow edit on empty cols
		},
		tooltipTableRow(e, cell, onRendered) {
			const el = document.createElement('div');
			el.style.padding = '5px';
			el.style.fontFamily = 'sans-serif';

			const data = cell.getRow().getData();

			// Header Section
			const header = document.createElement('div');
			header.style.fontWeight = 'bold';
			header.style.marginBottom = '10px';
			header.style.borderBottom = '1px solid #ccc';
			header.style.paddingBottom = '5px';

			const limit = 10;
			const count = data?.entschuldigungen?.length || 0;
			const shownNumber = count >= limit ? limit : count;

			header.innerText = `${data.vorname} ${data.nachname}`;
			if (count > 0) {
				header.innerText += ` (${this.$p.t('global/entschuldigungenAnzahl', [shownNumber, count])})`;
			}
			el.appendChild(header);

			// Grid Section
			if (count > 0) {
				const grid = document.createElement('div');
				grid.style.display = 'grid';
				grid.style.gridTemplateColumns = 'auto auto';
				grid.style.columnGap = '25px'; // The "Tab" space
				grid.style.rowGap = '4px';

				for (let i = 0; i < shownNumber; i++) {
					const ent = data.entschuldigungen[i];

					const dateSpan = document.createElement('span');
					dateSpan.innerText = this.formatEntschuldigungZeit(ent);

					const statusSpan = document.createElement('span');
					statusSpan.style.color = ent.akzeptiert ? '#2e7d32' : '#d32f2f';
					statusSpan.innerText = this.$p.t('global/statusLabel') + ': ' + this.formatAkzeptiertStatus(ent.akzeptiert);

					grid.appendChild(dateSpan);
					grid.appendChild(statusSpan);
				}
				el.appendChild(grid);
			} else {
				const none = document.createElement('div');
				none.innerText = this.$p.t('global/keineEntschuldigungenVorhanden');
				el.appendChild(none);
			}

			return el;
		},
		formatEntschuldigungZeit(ent) {
			const von = new Date(ent.von)
			const bis = new Date(ent.bis)
			const today = new Date()
			const sameDay = this.areDatesSame(today, bis) && this.areDatesSame(von, today)

			const vonTime = String(von.getHours()).padStart(2, '0') + ':' + String(von.getMinutes()).padStart(2, '0')
			const bisTime = String(bis.getHours()).padStart(2, '0') + ':' + String(bis.getMinutes()).padStart(2, '0')

			if(sameDay) {
				return this.toFrontendDateFromDate(von) + ' ' + vonTime + ' - ' + bisTime
			} else {
				return this.toFrontendDateFromDate(von) + ' ' + vonTime + ' - ' + this.toFrontendDateFromDate(bis) + ' ' + bisTime
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
			return '<div style="display: flex;' + (isLow ? 'color: red; ' : '') + 'justify-content: center; align-items: center; height: 100%">' + val + ' %</div>'
		},
		anwesenheitFormatterValue(cell) {
			const data = cell.getValue()
			const el = cell.getElement()
			el.classList.remove('anw-anwesend', 'anw-abwesend', 'anw-entschuldigt')

			if (data === this.$entryParams.permissions.anwesend_status) {
				el.classList.add('anw-anwesend');
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa fa-check"></i></div>'
			} else if (data === this.$entryParams.permissions.abwesend_status) {
				el.classList.add('anw-abwesend');
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa fa-xmark"></i></div>'
			} else if (data === this.$entryParams.permissions.entschuldigt_status) {
				el.classList.add('anw-entschuldigt');
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa-solid fa-user-shield"></i></div>'
			} else return '-'
		},
		anwTooltip(e, cell) {
			const value = cell.getValue()
			let valueFormatted = ''

			if (value === this.$entryParams.permissions.anwesend_status) {
				valueFormatted = this.$capitalize(this.$p.t('global/anwesend'))
			} else if (value === this.$entryParams.permissions.abwesend_status) {
				valueFormatted = this.$capitalize(this.$p.t('global/abwesend'))
			} else if (value === this.$entryParams.permissions.entschuldigt_status) {
				valueFormatted = this.$capitalize(this.$p.t('global/entschuldigt'))
			}

			return valueFormatted
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
		handleKontrolleChanged(kontrolle) {
			this.deleteData = kontrolle
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
			this.$refs.anwesenheitenTable.tabulator.clearSort()
			this.$refs.anwesenheitenTable.tabulator.setColumns(this.lektorState.tabulatorCols)
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
			localStorage.setItem('DigiAnwShowAll', true)
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
					this.changes = true
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

						const kontrolleToUpdate = this.lektorState.kontrollen.find(k => k.anwesenheit_id == change.anwesenheit_id)
						if (kontrolleToUpdate) {
							kontrolleToUpdate[oldVal]--;
							kontrolleToUpdate[change.status]++;
						}
					}
					
					
				})
				
				this.$api.call(ApiKontrolle.getAnwQuoteForPrestudentIds(changedStudentsArr, this.$entryParams.lv_id, this.$entryParams.sem_kurzbz))
					.then(res => {
						this.updateSumData(res.data.retval)
						this.changes = true
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
		handleChangeDatum(date) {
			const searchStr = this.formatDateToDbString(date)

			const terminFound = this.$entryParams.available_termine.value.find(termin => termin.datum == searchStr)
			if(terminFound) this.kontrollDatumSourceStundenplan = true
			else this.kontrollDatumSourceStundenplan = false
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
		startNewAnwesenheitskontrolle() {
			if (!this.lektorState.beginn || !this.lektorState.ende) {
				this.$fhcAlert.alertError(this.$p.t('global/errorAnwStartAndEndSet'))
				return
			}

			if (!this.validateTimespan(this.lektorState.beginn, this.lektorState.ende, this.selectedDate)) {
				return false;
			}

			this.showQRLoadingSpinner = true
			this.qr = '' // indirectly set start button disabled

			// fetch some data from stundenplan what should be happening rn
			// if there is no stundenplan entry enter some hours of anwesenheit?

			this.getNewQRCode()
		},
		insertAnwWithoutQR() {
			if (!this.lektorState.beginn || !this.lektorState.ende) {
				this.$fhcAlert.alertError(this.$p.t('global/errorAnwStartAndEndSet'))
				return
			}

			if (!this.validateTimespan(this.lektorState.beginn, this.lektorState.ende, this.selectedDate)) {
				return false;
			}

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
					
					this.changes = true
					this.showQR(res.data)

				})
		},
		stopAnwesenheitskontrolle() {
			if(this.externalWindow) { // portal the modal back into our dom and close window
				this.externalWindow.close() // triggers handleClose on beforeunload event listener
			}
			
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

			this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid)).then(res => {
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
		async deleteAnwesenheitskontrolle(kontrolle) {
			if (await this.$fhcAlert.confirmDelete() === false) return;

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
		// Date -> 'D.M.YYYY' (unpadded)
		toFrontendDateFromDate(date) {
			return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear();
		},
		formatZusatz(entry, stsem, config = {}) {
			let zusatz = ''

			const stsemdatumvon = new Date(stsem.start)
			const stsemdatumbis = new Date(stsem.ende)
			const entryVon      = entry.von ? new Date(entry.von) : null
			const entryBis      = entry.bis ? new Date(entry.bis) : null

			if (entry.studienstatus === 'Incoming') {
				zusatz = ' (i)'
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
					zusatz = ' (o) (ab ' + this.toFrontendDate(entry.von) + ')'
				}
			}

			if (entry.lkt_ueberschreibbar === false) zusatz = ' (' + entry.anmerkung + ')'
			if (entry.mitarbeiter_uid !== null)       zusatz = ' (ma)'
			if (entry.stg_kz_student == this.lektorState.a_o_kz) {
				zusatz = ' (a.o.)'
			}
			if (entry.mobilitaetstyp_kurzbz && entry.doubledegree === 1) {
				zusatz = ' (d.d.'
				if      (entry.ddtype == 'Intern') zusatz += 'i.)'
				else if (entry.ddtype == 'Extern') zusatz += 'o.)'
				else                               zusatz += ')'
			}

			return zusatz
		},
		linkKontrollData() {

			this.lektorState.kontrollen.forEach(k => {
				k.sumAnw = 0
				k.anw = 0
				k.abw = 0
				k.ent = 0
				k.groupSet = new Set()
			})
			this.lektorState.anwEntries.forEach(anw => {
				const k = this.lektorState.kontrollen.find(k => k.anwesenheit_id === anw.anwesenheit_id)
				k.sumAnw++
				if (anw.status === this.$entryParams.permissions.anwesend_status) k.anw++
				else if (anw.status === this.$entryParams.permissions.abwesend_status) k.abw++
				else if (anw.status === this.$entryParams.permissions.entschuldigt_status) k.ent++
			})

		},
		setEntries(anwEntries, kontrollen) {

			// from anw entries
			anwEntries.forEach(entry => {
				const kontrolle = kontrollen.find(k => k.anwesenheit_id === entry.anwesenheit_id)
				// search for distinct kontrollento use for show all columns
				this.lektorState.studentsData.get(entry.prestudent_id).push({
					datum: entry.datum,
					status: entry.status,
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
			this.studentCount = this.lektorState.students.length

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
				this.$refs.anwesenheitenTable.tabulator.clearSort()
				this.$refs.anwesenheitenTable.tabulator.setColumns(anwCols)
				
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
		setupLektorState() {
			this.lektorState.students = this.$entryParams.lektorState.students
			this.lektorState.anwEntries = this.$entryParams.lektorState.anwEntries
			this.lektorState.stsem = this.$entryParams.lektorState.stsem
			this.lektorState.entschuldigtStati = this.$entryParams.lektorState.entschuldigtStati
			this.lektorState.kontrollen = this.$entryParams.lektorState.kontrollen
			this.lektorState.a_o_kz = this.$entryParams.lektorState.a_o_kz
			this.lektorState.gruppen = new Set()
			this.lektorState.showAllVar = localStorage.getItem('DigiAnwShowAll') == "true" || false
			
			// put query params back into url for expected f5 behaviour
			function updateQueryParam(key, value) {
				const url = new URL(window.location);
				url.searchParams.set(key, value);
				window.history.replaceState({}, '', url);
			}
			
			updateQueryParam('stg_kz', this.$entryParams.stg_kz);
			updateQueryParam('sem', this.$entryParams.sem);
			updateQueryParam('lvid', this.$entryParams.lv_id);
			updateQueryParam('sem_kurzbz', this.$entryParams.sem_kurzbz);

			this.$entryParams.lektorState = null
			this.setupLektorComponent()
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

			this.lektorState.showAllVar = localStorage.getItem('DigiAnwShowAll') == "true"

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
			// this.$refs.LEDropdown.resetData()

			this.$emit('maUIDChanged')
			this.handleLEChanged()
		},
		openNewAnwesenheitskontrolleModal() {
			this.$refs.modalContainerNewKontrolle.show()
		},
		changeAnwStatus(cell, prestudent_id) {
			const value = cell.getValue()
			if (value === undefined) return
			let date = cell.getColumn().getField() // '2024-10-16' or 'status'
			if (date === 'status') {
				date = this.formatDateToDbString(this.selectedDate)
			}

			const arr = this.lektorState.studentsData.get(prestudent_id)
			const found = arr.find(e => this.anwColumnKey(e.datum, e.von, e.bis, e.le_id) === date)
			const anwesenheit_user_id = found?.anwesenheit_user_id
			const anwesenheit_id = found?.anwesenheit_id
			const newEntry = {
				prestudent_id, date, status: value, anwesenheit_user_id, anwesenheit_id
			}
			this.handleChange(newEntry)
		},
		handleChange(newEntry) {

			// check if the entry is in the original tableData with the same status
			const student = this.lektorState.studentsData.get(newEntry.prestudent_id)
			const original = student.find(v => this.anwColumnKey(v.datum, v.von, v.bis, v.le_id) === newEntry.date)
			const updateFoundIndex = this.changedData.findIndex(e => e.prestudent_id === newEntry.prestudent_id && e.date === newEntry.date)
			if (updateFoundIndex >= 0) {
				this.changedData.splice(updateFoundIndex, 1)
			}

			if (!original || newEntry.status !== original.status) {
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
			
			// date of kontrolle needs to be in range or a stundenplantermin
			if(!this.kontrollDatumSourceStundenplan && this.selectedDate < this.minDate) {
				this.$fhcAlert.alertError(this.$p.t('global/kontrolleDatumOutOfRange'));
				return false
			} else if(this.selectedDate > this.maxDate) {
				this.$fhcAlert.alertError(this.$p.t('global/kontrolleDatumOutOfRange'));
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
			this.boundRegenerateQR = this.regenerateQR.bind(this)
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
			// picking a single le from the dropdown exits a combined multi le view
			this.selectedLehreinheiten = []
			this.lastLoadedLeIds = []

			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			this.reloadState(ma_uid, date)

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
		togglePopOut() {
			
			if (!this.externalWindow) {
				this.externalWindow = window.open("", "", "width=1000,height=1000");

				const container = document.createElement("div");
				container.id = "externalModalContainer";
				container.style.setProperty('min-width', '100%')
				container.style.setProperty('min-height', '100%')
				this.externalModalContainer = container;

				const toClone = document.getElementById('qrwrap')

				// const toClone = document.getElementById('qrcontent')
				// container.appendChild(toClone.cloneNode(true)) // breaks vue reactivity
				container.appendChild(toClone)
				
				this.externalWindow.document.body.appendChild(container);

				for (const el of document.head.querySelectorAll('style, link[rel=stylesheet]')) {
					const clone = el.cloneNode(true)
					this.externalWindow.document.head.appendChild(clone)
				}
				
				// Handle window close event, called in the end of close browser window, stop kontrolle and move back qr modal
				this.externalWindow.addEventListener("beforeunload", () => {
					this.handleCloseExternalWindow()
				});
			} else {
				this.externalWindow.close()
			}
		},
		handleCloseExternalWindow() {
			const qr = this.externalWindow.document.getElementById('qrwrap')
			const main = document.getElementById('lektorWrap')
			main.appendChild(qr)

			this.externalWindow.close();
			this.externalWindow = null;
			this.externalModalContainer = null;
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
			this.$entryParams.tabHeights['lektor'].value = screenY - rect.top

			if(this.$refs.anwesenheitenTable.tabulator) this.$refs.anwesenheitenTable.tabulator.redraw(true)
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
			if (p.admin || p.assistenz) return [p.anwesend_status, p.abwesend_status, p.entschuldigt_status]
			if (p.lektor || p.lektor_lvlead) return [p.anwesend_status, p.abwesend_status]
			return []
		},
		baseColumns() {
			const fields = ['foto', 'prestudent_id', 'student_uid', 'vorname', 'nachname', 'gruppe']
			return this.anwesenheitenTabulatorOptions.columns.filter(c => fields.includes(c.field))
		},
		buildDateColumn(date) {
			// field/title carry the raw column key (datum | von - bis | le_id),
			// build a readable header for downloads
			const keyParts = date.split(' | ')
			let titleDownload = this.toFrontendDate(keyParts[0]) + ' ' + (keyParts[1] ?? '')
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
				titleFormatter: this.anwColTitleFormatter,
				hozAlign: 'center',
				widthGrow: 1,
				tooltip: this.tooltipTableRow,
				minWidth: 150
			}
		},
		buildColsForDates(dates) {
			const anwCols = this.baseColumns()
			dates.forEach(d => anwCols.push(this.buildDateColumn(d)))
			anwCols.push(this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'sum'))

			this.selectedDateCount = dates.length

			return anwCols
		},
		restartKontrolle(kontrolle) {
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
						this.changes = true
						this.$refs.modalContainerEditKontrolle.hide()
						this.showQR(res.data)
					}
				})
		},
		updateKontrolle() {
			const dataparts = this.editKontrolle.datum.split('.')
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			const dateAnwFormat = dataparts[2] + '-' + dataparts[1] + '-' + dataparts[0]

			if (!this.validateTimespan(this.editKontrolle.editVon, this.editKontrolle.editBis, this.editKontrolle.jsDate, this.editKontrolle.anwesenheit_id)) {
				return false;
			}
			
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

			// todo: range status anzeigen irgendwo
			// if(!this.kontrollDatumSourceStundenplan && newVal <= this.minDate) this.$fhcAlert.alertWarning(this.$p.t('global/kontrolleDatumOutOfRange'))
			// else if (!this.kontrollDatumSourceStundenplan && newVal > this.maxDate) this.$fhcAlert.alertWarning(this.$p.t('global/kontrolleDatumOutOfRange'))

			this.lektorState.tabulatorCols = anwCols

			this.$refs.anwesenheitenTable.tabulator.clearSort()
			this.$refs.anwesenheitenTable.tabulator.setColumns(anwCols)

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
		multiLeMode() {
			// exactly one selected le runs as full featured single le mode (kontrollen etc),
			// the read only combined view only kicks in for two or more
			return this.selectedLehreinheiten.length > 1
		},
		getLEOptions() {
			// the multiselect always offers every le of the lva, unlike available_le_info
			// which gets refiltered when an admin switches the maUID dropdown
			return this.$entryParams.available_le_info_lva.value
		},
		currentLEhasRightToSkipQR() {
			if(!this.$entryParams.permissions.no_qr_lehrform || !this.$entryParams.permissions.no_qr_lehrform.length) return false
			if(!this.$entryParams.selected_le_info?.value) return false
			return this.$entryParams.permissions.no_qr_lehrform.includes(this.$entryParams.selected_le_info?.value?.lehrform_kurzbz)
		},
		getTitle() {
			if (this.multiLeMode) {
				let title = this.selectedLehreinheiten[0].kurzbz + ': '
				return title + this.selectedLehreinheiten.map(le => le.groupString).join(', ')
			}
			return this.$entryParams.selected_le_info?.value?.infoString ?? ''
		},
		getTabulatorStyle(){
			return "transform: translateY(-"+this.translateOffset+"px); overflow: hidden;"
		},
		getTooltipKontrolleLoeschen() {
			return {
				value: this.$p.t('global/tooltipLektorDeleteKontrolle', [this.$entryParams.permissions.kontrolleDeleteMaxReach ]),
				class: "custom-tooltip"
			}
		},
		getTooltipKontrolleNeu() {
			return {
				value: this.$p.t('global/tooltipLektorStartKontrolleV4', [(this.$entryParams.permissions.einheitDauer ?? 0.75) * 60]),
				class: "custom-tooltip"
			}
		},
		getTooltipZeitFromStundenplan() {
			return {
				value: this.$p.t('global/tooltipUnterrichtZeitCustomV2'),//'Zeiten wurden aus dem Stundenplan entnommen, nur in Ausnahmefällen überschreiben!',
				class: "custom-tooltip"
			}
		},
		getTooltipDatumFromStundenplan() {
			return {
				value: this.$p.t('global/tooltipUnterrichtDatumCustomV2'),
				class: "custom-tooltip"
			}
		},
		getTooltipLegende() {
			return {
				value: this.$p.t('global/tooltipLegende'),
				class: "custom-tooltip"
			}
		},
		getTooltipCsv() {
			return {
				value: this.$p.t('global/tooltipCsv'),
				class: "custom-tooltip"
			}
		},
		getTooltipEdit() {
			return {
				value: this.$p.t('global/tooltipEdit'),
				class: "custom-tooltip"
			}
		},
		getTooltipSaveChanges() {
			return {
				value: this.$p.t('global/tooltipSaveChanges'),
				class: "custom-tooltip"
			}
		},
		getTooltipRestartKontrolle() {
			return {
				value: this.$p.t('global/tooltipRestartKontrolle'),
				class: "custom-tooltip"
			}
		},
		getTooltipDeleteKontrolle() {
			return {
				value: this.$p.t('global/tooltipDeleteKontrolle'),
				class: "custom-tooltip"
			}
		},
		getTooltipEditKontrollzeiten() {
			return {
				value: this.$p.t('global/tooltipEditKontrollzeiten'),
				class: "custom-tooltip"
			}
		},
		getSaveBtnClass() {
			return !this.changedData.length ? "btn btn-secondary ml-2" : "btn btn-primary ml-2"
		},
		getEditBtnClass() {
			return !this.lektorState.kontrollen.length ? "btn btn-secondary ml-2" : "btn btn-success ml-2"
		},
		getCSVFilename() {
			let str = ''
			if(this.multiLeMode()) {
				str = this.getTitle()
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
		<div v-show="loading" style="position: absolute; width: 100vw; height: 100vh; background: rgba(255,255,255,0.5); z-index: 8500;"></div>
		
		<core-base-layout>			
			<template #main>
				<div id="lektorWrap">
				
					<bs-modal ref="modalContainerNewKontrolle" class="bootstrap-prompt" dialogClass="modal-xl">
						<template v-slot:title>			
							<div v-tooltip.bottom="getTooltipKontrolleNeu">
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
												 v-tooltip.bottom="getTooltipZeitFromStundenplan">
												<i class="fa-solid fa-triangle-exclamation mt-1 me-2"></i>
												<span>{{ $p.t('global/zeitNichtAusStundenplanBeginnV2') }}</span>
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
												 v-tooltip.bottom="getTooltipZeitFromStundenplan">
												<i class="fa-solid fa-triangle-exclamation mt-1 me-2"></i>
												<span>{{ $p.t('global/zeitNichtAusStundenplanEndeV2') }}</span>
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
												 v-tooltip.bottom="getTooltipDatumFromStundenplan">
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
							<button v-show="!showQRLoadingSpinner" :disabled="qr != null" type="button" class="btn btn-primary" @click="startNewAnwesenheitskontrolle">{{ $p.t('global/jetztStarten') }}</button>
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
										<button @click="restartKontrolle(kontrolle)" role="button" class="btn btn-secondary" v-tooltip.bottom="getTooltipRestartKontrolle">
											<i class="fa fa-rotate-right"></i>
					
										</button>
										
										<button style="margin-left: 12px;" @click="deleteAnwesenheitskontrolle(kontrolle)" role="button" class="btn btn-danger" v-tooltip.bottom="getTooltipDeleteKontrolle">
											<i class="fa fa-trash"></i>
										</button>
										
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
	
					<bs-modal ref="modalContainerLegende" class="bootstrap-prompt" dialogClass="modal-lg">
						<template v-slot:title>
							<div>
								{{ $p.t('global/statusLegende') }}
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
								<h6>{{$entryParams.viewDataLv.bezeichnung}}</h6>		
								<AnwCountDisplay  v-if="selectedDateCount == 1 && !lektorState?.showAllVar" :anwesend="checkInCount" :abwesend="abwesendCount" :entschuldigt="entschuldigtCount"/>
							</div>
						</div>
						
	
						<div class="col-6">
							<div class="row g-3 mb-4" v-if="$entryParams?.permissions?.lektor_lvlead || $entryParams?.permissions?.admin" style="padding-right: 2%" >
								<div class="col-12" style="padding-right: 24px">
									<Multiselect
										ref="leMultiselect"
										v-model="selectedLehreinheiten"
										:options="getLEOptions"
										optionLabel="infoString"
										placeholder="LV-Teile auswählen"
										:maxSelectedLabels="3"
										showToggleAll
										scrollHeight=400
										class="w-100"
										@show="handleMultiselectShow"
										@hide="handleMultiselectHide"
										@change="handleChangeLEMultiselect"
									>
										<template #option="slotProps">
											<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
												<span>{{ slotProps.option.infoString }}</span>
												<span>{{ slotProps.option.vorname }} {{ slotProps.option.nachname }}</span>
											</div>
										</template>
									</Multiselect>
								<div/>
							</div>

							<div class="row g-3 align-items-end">
								<div class="col-5" v-if="$entryParams?.permissions?.admin">
									<MaUIDDropdown 
										:title="$capitalize($p.t('lehre/lektor'))" 
										id="maUID" 
										ref="MADropdown" 
										@maUIDchanged="maUIDchangedHandler"
									/>
								</div>
								<div :class="$entryParams?.permissions?.admin ? 'col-7' : 'col-12'">
									<LehreinheitenDropdown 
										id="lehreinheit" 
										:title="$capitalize($p.t('lehre/lehreinheit'))" 
										ref="LEDropdown" 
										@leChanged="handleLEChanged"
									/>
								</div>
							</div>
						
							<div class="row mt-4 align-items-center">
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
						:id-field="'anwesenheiten_id'"
						:tableOnly="true"
						:newBtnShow="true"
						:newBtnLabel="$p.t('global/neueAnwKontrolle')"
						:newBtnDisabled="!lektorState.students.length || multiLeMode"
						@click:new=openNewAnwesenheitskontrolleModal
						:sideMenu="false"
						noColumnFilter>
							<template #actions>
								<button @click="saveChanges" :disabled="!changedData.length" role="button" :class="getSaveBtnClass" v-tooltip.bottom="getTooltipSaveChanges">
									<i class="fa fa-save"></i>
								</button>
								
								<button @click="openEditModal" :disabled="!lektorState.kontrollen.length || multiLeMode" role="button" :class="getEditBtnClass" v-tooltip.bottom="getTooltipEdit">
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