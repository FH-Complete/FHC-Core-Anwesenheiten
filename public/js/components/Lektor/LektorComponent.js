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
		"datepicker": VueDatePicker,
		Statuslegende,
		KontrolleDisplay,
		StudentByLvaComponent
	},
	data() {
		return {
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
				rowHeight: 44, // foto max-height + 2x padding
				rowFormatter: this.entschuldigtColoring,
				height: this.$entryParams.tabHeights.lektor,
				index: 'prestudent_id',
				debugInvalidComponentFuncs: false,
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: this.$capitalize(this.$p.t('global/foto')), field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: true, minWidth: 80, maxWidth: 80, download: false, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('global/prestudentID')), field: 'prestudent_id', formatter: lektorFormatters.centeredFormatter, visible: false, minWidth: 150, download: true, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('person/vorname')), field: 'vorname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1,  minWidth: 150, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('person/nachname')), field: 'nachname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1, minWidth: 150, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('lehre/gruppe')), field: 'gruppe', headerFilter: 'list', tooltip: this.tooltipTableRow,
						headerFilterParams: {
							valuesLookup: true,
							clearable: true,
							autocomplete: true,
						},
						formatter: lektorFormatters.centeredFormatter, widthGrow: 1, minWidth: 100},
					// {title: Vue.computed(() => this.$p.t('benotungstool/c4note')), field: 'note_vorschlag',
					// 	editor: 'list',
					// 	editorParams: {
					// 		values: Vue.computed(()=>this.notenOptions.map(opt => {
					// 			return {
					// 				label: opt.bezeichnung,
					// 				value: opt.note
					// 			}
					// 		}))
					// 	},
					// 	formatter: (cell) => {
					// 		const value = cell.getValue()
					// 		const match = this.notenOptions.find(opt => opt.note === value)
					// 		return match ? match.bezeichnung : value
					// 	},
					// 	widthGrow: 1},
					{
						title: this.$capitalize(this.$p.t('global/datum')),
						field: 'status',
						editor: 'list',
						editorParams: {
							values: Vue.computed(()=> {
								if(this.$entryParams.permissions.admin || this.$entryParams.permissions.assistenz) {
									return [this.$entryParams.permissions.anwesend_status,
										this.$entryParams.permissions.abwesend_status,
										this.$entryParams.permissions.entschuldigt_status]
								} else if (this.$entryParams.permissions.lektor) {
									return [this.$entryParams.permissions.anwesend_status,
										this.$entryParams.permissions.abwesend_status]
								}
							})	
						},
						editable: this.checkCellEditability,
						formatter: this.anwesenheitFormatterValue,
						hozAlign:"center",
						widthGrow: 1,
						tooltip: this.tooltipTableRow,
						minWidth: 150
						
						// title: this.$capitalize(this.$p.t('global/datum')),
						// field: 'status',
						// formatter: this.anwesenheitFormatterValue,
						// hozAlign:"center",
						// widthGrow: 1, 
						// // tooltip: this.anwTooltip,
						// tooltip: this.tooltipTableRow,
						// minWidth: 150
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
					const prestudent_id = Reflect.get(row.getData(), 'prestudent_id')

					if(field === "gruppe" || field === "foto" || field === "prestudent_id" ||
						field === "vorname" || field === "nachname" || field === "sum") {

						if(this.changedData.length && await this.$fhcAlert.confirm({
							message: 'Ungespeicherte Änderungen werden verloren!',
							acceptLabel: 'Verwerfen und Fortfahren',
							acceptClass: 'btn btn-danger',
							rejectLabel: 'Zurück',
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
						
						
						// this.$router.push({
						// 	name: 'StudentByLva',
						// 	params: {id: prestudent_id, lv_id: this.lv_id, sem_kz: this.sem_kurzbz}
						// })
					}
					// else { // on date fields toggle state edit
					// 	this.toggleAnwStatus(e, cell, prestudent_id)
					// 	const el = cell.getElement()
					//	
					// 	if(this.changedData.find(d => d.prestudent_id === prestudent_id)) {
					// 		el.style.backgroundColor = "#E0BBE4"
					// 	} else {
					// 		el.style.backgroundColor = null
					// 	}
					// }
				}
			},
			{
				event: "cellEdited",
				handler: async (cell) => {
					
					const row = cell.getRow()
					const prestudent_id = Reflect.get(row.getData(), 'prestudent_id')

					this.changeAnwStatus(cell, prestudent_id)
					const el = cell.getElement()

					if(this.changedData.find(d => d.prestudent_id === prestudent_id)) {
						el.style.backgroundColor = "#E0BBE4"
					} else {
						el.style.backgroundColor = null
					}
					
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
			// minDate: new Date(Date.now()).setDate((new Date(Date.now()).getDate() - (this.$entryParams.permissions.kontrolleCreateMaxReach))),
			// maxDate: new Date(Date.now()).setDate((new Date(Date.now()).getDate() + (this.$entryParams.permissions.kontrolleCreateMaxReach))),
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
		handleAutoApply(date) {
			this.selectedDate = date
			this.$refs.outsideDateSelect.closeMenu()	
			if(this.$refs.insideDateSelect) this.$refs.insideDateSelect.closeMenu()
		},
		anwColTitleFormatter(cell) {
			const title = cell.getColumn().getDefinition().title;
			const titleParts = title.split("|")
			
			const titledate = titleParts[0].trimEnd()
			const dateParts = titledate.split("-")
			const selectedDateFrontendFormatted = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0]

			const container = document.createElement("div");
			container.style.textAlign = "center";
			container.innerHTML = `<span style="font-weight: bold;">${selectedDateFrontendFormatted}</span><br><span style="color: gray;">${titleParts[1]}</span>`;
			return container;
		},
		checkCellEditability(cell) {
			const val = cell.getValue()
			return val !== '-' // dont allow edit on empty cols 
		},
		tooltipTableRow(e, cell, onRendered) { // tooltip formatter for whole row but used on every cell
			const el = document.createElement('div')

			const row = cell.getRow()
			const data = row.getData()
			const name = document.createElement('p')
			
			name.innerText = data.vorname + ' ' + data.nachname
			el.appendChild(name)
			
			data?.entschuldigungen?.forEach(ent => {
				const entschuldigung = document.createElement('p')

				entschuldigung.innerText += this.formatEntschuldigungZeit(ent) + ' Entschuldigung status: ' + this.formatAkzeptiertStatus(ent.akzeptiert) + '\n'
				el.appendChild(entschuldigung)
			})
			
			return el
		},
		formatEntschuldigungZeit(ent) {
			const von = new Date(ent.von)
			const bis = new Date(ent.bis)
			
			const sameDay = this.areDatesSame(von, bis)
			if(sameDay) {
				return String(von.getHours()).padStart(2, '0') + ':' + String(von.getMinutes()).padStart(2, '0') + ' - ' + String(bis.getHours()).padStart(2, '0') + ':' + String(bis.getMinutes()).padStart(2, '0')
			} else {
				return (von.getMonth() + 1) + '.' + von.getDate() + ' ' + String(von.getHours()).padStart(2, '0') + ':' + String(von.getMinutes()).padStart(2, '0') + ' - ' + (bis.getMonth() + 1) + '.' + bis.getDate() + ' ' + String(bis.getHours()).padStart(2, '0') + ':' + String(bis.getMinutes()).padStart(2, '0')
			}
		},
		formatAkzeptiertStatus(akzeptiert) {
			// formats akzeptiert tri state logic (true => accepted, false => denied, null => open) into meaningful strings
			
			let ret = ''
			
			if(akzeptiert === null) {
				ret = 'Offen'
			} else if (akzeptiert === true) {
				ret = 'Akzeptiert'
			} else if (akzeptiert === false) {
				ret = 'Abgelehnt'
			}
			
			return ret
			
		},
		percentFormatter: function (cell) {
			const data = cell.getData()
			const val = data.sum ?? data.anteil ?? '-'
			return '<div style="display: flex;' + (val < (this.$entryParams.permissions.positiveRatingThreshold * 100) ? 'color: red; ' : '') + 'justify-content: center; align-items: center; height: 100%">' + val + ' %</div>'
		},
		anwesenheitFormatterValue(cell) {
			const data = cell.getValue()
			
			if (data === this.$entryParams.permissions.anwesend_status) {
				cell.getElement().style.color = "#28a745";
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa fa-check"></i></div>'
			} else if (data === this.$entryParams.permissions.abwesend_status) {
				cell.getElement().style.color = "#dc3545";
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa fa-xmark"></i></div>'
			} else if (data === this.$entryParams.permissions.entschuldigt_status) {
				cell.getElement().style.color = "#0335f5";
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

				this.lektorState.showAllVar = false
			}

		},
		setShowAll() {
			const newCols = this.anwesenheitenTabulatorOptions.columns.slice(0, 5)
			this.lektorState.dates.forEach(date => {
				newCols.push({
					title: date,
					field: date,
					editor: 'list',
					editorParams: {
						values: Vue.computed(()=> {
							if(this.$entryParams.permissions.admin || this.$entryParams.permissions.assistenz) {
								return [this.$entryParams.permissions.anwesend_status,
									this.$entryParams.permissions.abwesend_status,
									this.$entryParams.permissions.entschuldigt_status]
							} else if (this.$entryParams.permissions.lektor) {
								return [this.$entryParams.permissions.anwesend_status,
									this.$entryParams.permissions.abwesend_status]
							}
						})
					},
					editable: this.checkCellEditability,
					formatter: this.anwesenheitFormatterValue,
					titleFormatter: this.anwColTitleFormatter,
					hozAlign:"center",
					widthGrow: 1,
					tooltip: this.tooltipTableRow,
					minWidth: 150
				})
			})
			newCols.push(this.anwesenheitenTabulatorOptions.columns[6])

			this.lektorState.tableStudentData = this.setupAllData(newCols)
			this.lektorState.tabulatorCols = newCols
			this.setAllColsAndData()

			this.lektorState.showAllVar = true
		},
		setupAllData() {
			const data = []

			this.lektorState.students.forEach(student => {
				const allEntStudent = this.lektorState.entschuldigtStati.filter(status => {
					if(status.person_id === student.person_id) return true
					else return false
				})
				
				const nachname = student.nachname + student.zusatz
				const row = {
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
					const d = entry.datum + ' | ' + entry.von + ' - ' + entry.bis
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
			const datumParts = vp[0].split("-")
			const datum = datumParts[2] + '.' + datumParts[1] + '.' + datumParts[0]
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
					this.changes = true
					this.$refs.modalContainerNewKontrolle.hide()
					this.showQR(res.data)
				}
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
					
					if(valueToChange) valueToChange.status = change.status
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
			const padZero = (num) => String(num).padStart(2, '0');
			const month = padZero(date.getMonth() + 1); // Months are zero-based
			const day = padZero(date.getDate());
			const year = date.getFullYear();
			const searchStr = year + '-' + month + '-' + day
			
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
					this.loading = true
					this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, datefetch)).then(res => {
						if(res.meta.status === 'success') {
							this.setupData(res.data)
						}
					}).catch(() => {
						if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
					}).finally(() => {
						this.loading = false
					})
					
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
			this.loading = true
			this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, date)).then(res => {
				if(res.meta.status === 'success') {
					this.setupData(res.data)
				}
			}).catch(() => {
				if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
			}).finally(() => {
				this.loading = false
			})

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

					this.loading = true
					this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, dateAnwFormat)).then((res) => {
						if(res.meta.status === 'success') {
							this.setupData(res.data)
						}
					}).catch(() => {
						if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
					}).finally(() => {
						this.loading = false
					})
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
			this.editKontrolle = kontrolle
		},
		formatDateToDbString(date) {
			return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
				.toISOString()
				.split("T")[0];
		},
		formatZusatz(entry, stsem) {
			let zusatz = ''
			const stsemdatumvon = new Date(stsem.von)
			const stsemdatumbis = new Date(stsem.bis)
			// if(entry.studienstatus === 'Abbrecher '||entry.studienstatus === 'Unterbrecher') {
			// 	// this should never come up anyways?
			// }

			if (entry.studienstatus === 'Incoming') zusatz = ' (i)'
			if (entry.bisio_id && entry.studienstatus !== 'Incoming'
				&& entry.bis > stsemdatumvon && entry.von < stsemdatumbis && ((entry.bis.getTime() - entry.von.getTime()) / 1000 * 3600 * 24) >= 30) {
				zusatz = ' (o) (ab ' + entry.von + ')'
			} else if (entry.bisio_id && entry.studienstatus !== 'Incoming' && entry.von && entry.von > stsemdatumvon) {
				// if bis datum is not yet known but von is available already
				zusatz = ' (o) (ab ' + entry.von + ')'
			}

			if (entry.lkt_ueberschreibbar === false) zusatz = ' (' + entry.anmerkung + ')'
			if (entry.mitarbeiter_uid !== null) zusatz = ' (ma)'
			if (entry.stg_kz_student == this.lektorState.a_o_kz) {
				zusatz = ' (a.o.)'
			}
			if (entry.mobilitaetstyp_kurzbz && entry.doubledegree === 1) {
				zusatz = ' (d.d.'
				if (entry.ddtype == 'Intern') zusatz += 'i.)';
				else if (entry.ddtype == 'Extern') zusatz += 'o.)';
				else zusatz += ')';
			}

			return zusatz
		},
		linkKontrollData() {
			// TODO: write Set of controlled groups into kontroll obj

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
					bis: kontrolle?.bis
				})

				const datum = entry.datum + ' | ' + kontrolle.von + ' - ' + kontrolle.bis
				if (this.lektorState.dates.indexOf(datum) < 0) {
					this.lektorState.dates.push(datum)
				}
			})
			
			// sort dates and termine
			this.lektorState.dates.sort((a, b) => {
				const as = a.split('|')
				const bs = b.split('|')
				return as > bs ? 1 : a < b ? -1 : 0
			})
		},
		async setupLektorComponent() {
			
			this.$entryParams.available_termine.value.forEach(termin => {
				const dateParts = termin.datum.split("-")
				termin.datumFrontend = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0]
			})

			if (this.$entryParams.available_termine.value.length) {
				const closestTermin = this.$entryParams.findClosestTermin(this.$entryParams.available_termine.value);
				const termin = new Date(closestTermin.datum)
				const closestTerminSameDay = this.selectedDate.getDate() === termin.getDate() && this.selectedDate.getMonth() === termin.getMonth && this.selectedDate.getFullYear() === termin.getFullYear()
				closestTermin.isSameDay = closestTerminSameDay
				this.setTimespanForKontrolleTermin(closestTermin, true)

				this.$entryParams.available_termine.value.forEach(t => this.lektorState.dates.push(t.datum))

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
			// this.$refs.kontrolleDropdown.setKontrollen(this.lektorState.kontrollen)
			
			// datepicker only allows to select for distinct days but one day can lead to several
			// kontrollen on that day during different timespans -> find all from that date and postfix the von - bis times
			
			// determine if table goes with all available dates - kontrollen
			// or all kontrollen of a selected date if one or more are found
			const dates = this.determineDates()
			
			// define VISIBLE tabulator columns with dynamic columns
			const anwCols = this.buildColsForDates(dates)
			
			const newCols = this.anwesenheitenTabulatorOptions.columns.slice(0, 5)
			this.lektorState.dates.forEach(date => {
				newCols.push({
					title: date,
					field: date,
					editor: 'list',
					editorParams: {
						values: Vue.computed(()=> {
							if(this.$entryParams.permissions.admin || this.$entryParams.permissions.assistenz) {
								return [this.$entryParams.permissions.anwesend_status,
									this.$entryParams.permissions.abwesend_status,
									this.$entryParams.permissions.entschuldigt_status]
							} else if (this.$entryParams.permissions.lektor) {
								return [this.$entryParams.permissions.anwesend_status,
									this.$entryParams.permissions.abwesend_status]
							}
						})
					},
					editable: this.checkCellEditability,
					formatter: this.anwesenheitFormatterValue,
					titleFormatter: this.anwColTitleFormatter,
					hozAlign:"center",
					widthGrow: 1,
					tooltip: this.tooltipTableRow,
					minWidth: 150
				})
			})
			newCols.push(this.anwesenheitenTabulatorOptions.columns[6])
			// tableData prefilled with all dates & status
			this.lektorState.tableStudentData = this.setupAllData(newCols)
			this.studentCount = this.lektorState.students.length
			
			// // build together the tableData by iterating over each student and look for the status of every (datum | von - bis) entry
			// this.lektorState.students.forEach(student => {
			//	
			// 	const allEntStudentForCurrentDate = this.lektorState.entschuldigtStati.filter(status => {
			// 		const vonDate = new Date(status.von)
			// 		const bisDate = new Date(status.bis)
			// 		if(status.person_id === student.person_id && vonDate <= this.selectedDate && bisDate >= this.selectedDate) return true
			// 		else return false
			// 	})
			// 	// foundEntry.hasEntschuldigung = !!entschuldigungEntryStudent
			//	
			// 	let isEntschuldigt = null
			// 	allEntStudentForCurrentDate.forEach(entCurDate => {
			// 		if(entCurDate.akzeptiert === true) isEntschuldigt = true
			// 	})
			//	
			// 	const studentDataEntry = this.lektorState.studentsData.get(student.prestudent_id)
			// 	const nachname = student.nachname + student.zusatz
			// 	const gruppe = student.semester + student.verband + student.gruppe
			// 	const newRow = {
			// 		prestudent_id: student.prestudent_id,
			// 		foto: student.foto,
			// 		vorname: student.vorname,
			// 		nachname: nachname,
			// 		gruppe: gruppe,
			// 		entschuldigt: isEntschuldigt,
			// 		entschuldigungen: allEntStudentForCurrentDate,
			// 		sum: student.sum
			// 	}

			if (this.lektorState.showAllVar) {
				this.setShowAll()
			} else {

				this.anwesenheitenTabulatorOptions.columns[0].title = this.$capitalize(await this.$p.t('global/foto'))
				this.anwesenheitenTabulatorOptions.columns[1].title = this.$capitalize(await this.$p.t('global/prestudentID'))
				this.anwesenheitenTabulatorOptions.columns[2].title = this.$capitalize(await this.$p.t('person/vorname'))
				this.anwesenheitenTabulatorOptions.columns[3].title = this.$capitalize(await this.$p.t('person/nachname'))
				this.anwesenheitenTabulatorOptions.columns[4].title = this.$capitalize(await this.$p.t('lehre/gruppe'))
				this.anwesenheitenTabulatorOptions.columns[6].title = this.$capitalize(await this.$p.t('global/summe'))
				
				this.lektorState.tabulatorCols = anwCols
				this.$refs.anwesenheitenTable.tabulator.clearSort()
				this.$refs.anwesenheitenTable.tabulator.setColumns(anwCols)
				
				this.$refs.anwesenheitenTable.tabulator.setData(this.lektorState.tableStudentData);
			}

			this.loading = false
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
			this.lektorState.viewData = this.$entryParams.lektorState.viewData
			this.lektorState.a_o_kz = this.$entryParams.lektorState.a_o_kz
			this.lektorState.gruppen = new Set()
			
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
			this.lektorState.students = data[0] ?? []
			this.lektorState.anwEntries = data[1] ?? []
			this.lektorState.stsem = data[2][0] ?? []
			this.lektorState.entschuldigtStati = data[3] ?? []
			this.lektorState.kontrollen = data[4] ?? []
			this.lektorState.kontrollen.forEach(k => {
				const dateparts = k.datum.split(".")
				k.jsDate = new Date(dateparts[2],dateparts[1] - 1,dateparts[0])
			})
			this.lektorState.viewData = data[5] ?? []
			this.$entryParams.available_termine.value = this.getAvailableTermine()
			this.lektorState.a_o_kz = data[7] ?? []
			this.lektorState.gruppen = new Set()

			this.setupLektorComponent()
		},
		getAvailableTermine() {
			if(this.$entryParams.allLeTermine && this.$entryParams.allLeTermine[this.$entryParams.selected_le_id.value]) {
				return this.$entryParams.allLeTermine[this.$entryParams.selected_le_id.value] ?? []
			} else {
				// this should never happen since we always have termine setup before LE but still handling the odd case
				this.$fhcAlert.alertError("Keine Termine gefunden")
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

			const arrWrapped = this.lektorState.studentsData.get(prestudent_id)
			const arr = JSON.parse(JSON.stringify(arrWrapped))
			const found = arr.find(e => (e.datum + ' | ' + e.von + ' - ' + e.bis) === date)
			const anwesenheit_user_id = found?.anwesenheit_user_id
			const newEntry = {
				prestudent_id, date, status: value, anwesenheit_user_id
			}
			this.handleChange(newEntry)
		},
		handleChange(newEntry) {

			// check if the entry is in the original tableData with the same status
			const student = this.lektorState.studentsData.get(newEntry.prestudent_id)
			const original = student.find(v => (Reflect.get(v, 'datum') + ' | ' + Reflect.get(v, 'von') + ' - ' + Reflect.get(v, 'bis')) === newEntry.date)
			const updateFoundIndex = this.changedData.findIndex(e => e.prestudent_id === newEntry.prestudent_id && e.date === newEntry.date)
			if (updateFoundIndex >= 0) {
				this.changedData.splice(updateFoundIndex, 1)
			}
				
			if (newEntry.status !== original.status) {
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
			if(!this.kontrollDatumSourceStundenplan && this.selectedDate <= this.minDate) {
				this.$fhcAlert.alertError(this.$p.t('global/kontrolleDatumOutOfRange'));
				return false
			} else if(!this.kontrollDatumSourceStundenplan && this.selectedDate > this.maxDate) {
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

			if (this.$entryParams.lektorState) {
				this.setupLektorState()
			} else {
				this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, date))
					.then(res => {
						if(res.meta.status === 'success') {
							this.setupData(res.data)
						}
				}).catch(() => {
					if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
				}).finally(() => {
					this.loading = false
				})
			}

		},
		handleLEChanged() {
			this.$refs.showAllTickbox.checked = false
			this.lektorState.showAllVar = false
			
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			this.loading = true
			this.$api.call(ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, date)).then(res => {
				if(res.meta.status === 'success') {
					this.setupData(res.data)
				}
			}).catch(() => {
				if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
			}).finally(() => {
				this.loading = false
				
				this.checkForBetreuungAndAlert()
			})

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
				row.getElement().style.color = "#0335f5";
			} else if(entForSelectedDate.length) {
				row.getElement().style.color = "#12d5d5";
			}
		},
		togglePopOut() {
			// todo: handle BS backdrop
			
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

			// // fall back to all termine if on selected date none are found
			// if(!datesFiltered.length && this.lektorState.dates.length) { // dont spam alerts when LE just has no kontrollen yet
			
			// 	this.$fhcAlert.alertWarning(this.$p.t('global/keineKontrollenAnDatumFallback', [selectedDateFrontendFormatted]))
			// 	return this.lektorState.dates
			// }

			return datesFiltered
		},
		buildColsForDates(dates) {
			const anwCols = this.anwesenheitenTabulatorOptions.columns.slice(0, 5)

			dates.forEach(d => {
				anwCols.push({
					title: d,
					field: d,
					editor: 'list',
					editorParams: {
						values: Vue.computed(()=> {
							if(this.$entryParams.permissions.admin || this.$entryParams.permissions.assistenz) {
								return [this.$entryParams.permissions.anwesend_status,
									this.$entryParams.permissions.abwesend_status,
									this.$entryParams.permissions.entschuldigt_status]
							} else if (this.$entryParams.permissions.lektor) {
								return [this.$entryParams.permissions.anwesend_status,
									this.$entryParams.permissions.abwesend_status]
							}
						})
					},
					editable: this.checkCellEditability,
					formatter: this.anwesenheitFormatterValue,
					titleFormatter: this.anwColTitleFormatter,
					hozAlign:"center",
					widthGrow: 1,
					tooltip: this.tooltipTableRow,
					minWidth: 150
				})
			})
			anwCols.push(this.anwesenheitenTabulatorOptions.columns[6])
			
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
						this.$api.call(
							ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(
								this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, dateAnwFormat))
							.then((res) => {
								if(res.meta.status === 'success') {
									this.setupData(res.data)
								}
						}).catch(() => {
							if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
						}).finally(() => {
							this.loading = false
						})
					}
				})
		},
		openKontrolleInfo() {
			
		},
		handleTitleSet(title) {
			this.selectedStudent.title = title
		},
		handleUpdateAnwesenheit() {
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			// reload tableData to get state back
			this.$api.call(
				ApiKontrolle.fetchAllAnwesenheitenByLvaAssigned(
					this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, date))
				.then((res) => {
					if(res.meta.status === 'success') {
						this.setupData(res.data)
					}
				}).catch(() => {
					if (this.$refs.anwesenheitenTable?.tabulator) this.$refs.anwesenheitenTable.tabulator.setData([])
				}).finally(() => {
				this.loading = false
			})
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
	},
	watch: {
		selectedDate(newVal) {
			if(newVal === "") {
				this.selectedDate = new Date(Date.now())
				return
			}
			
			const dates = this.determineDates()
			const anwCols = this.buildColsForDates(dates)
			
			this.setCurrentCountsFromTableData()

			this.handleChangeDatum(this.selectedDate) // look up if datum is in termin list
			
			// todo: range status anzeigen irgendwo
			// if(!this.kontrollDatumSourceStundenplan && newVal <= this.minDate) this.$fhcAlert.alertWarning(this.$p.t('global/kontrolleDatumOutOfRange'))
			// else if (!this.kontrollDatumSourceStundenplan && newVal > this.maxDate) this.$fhcAlert.alertWarning(this.$p.t('global/kontrolleDatumOutOfRange'))

			this.lektorState.tabulatorCols = anwCols
			
			this.$refs.anwesenheitenTable.tabulator.clearSort()
			this.$refs.anwesenheitenTable.tabulator.setColumns(anwCols)

		},
		selectedDateCount(newVal, oldVal) {
			// watch the nr of columns rendered on any given date,
			// if the amount is equal to all avaialble kontrollen tick the showAll box to avoid confusion
			if(newVal == this.lektorState.kontrollen.length) {
				this.$refs.showAllTickbox.checked = true
				this.lektorState.showAllVar = true
			} else {
				this.$refs.showAllTickbox.checked = false
				this.lektorState.showAllVar = false
			}
			
			// if just one kontrolle is selected query counts for that kontrolle
			if(newVal === 1) {
				
				this.queryOnlyKontrolleShown()
			}
		}
	},
	computed: {
		currentLEhasRightToSkipQR() {
			if(!this.$entryParams.permissions.no_qr_lehrform || !this.$entryParams.permissions.no_qr_lehrform.length) return false
			if(!this.$entryParams.selected_le_info?.value) return false
			return this.$entryParams.permissions.no_qr_lehrform.includes(this.$entryParams.selected_le_info?.value?.lehrform_kurzbz)
		},
		getTitle() {
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
				value: this.$p.t('global/tooltipLektorStartKontrolle'),
				class: "custom-tooltip"
			}
		},
		getTooltipZeitFromStundenplan() {
			return {
				value: this.$p.t('global/tooltipUnterrichtZeitCustom'),//'Zeiten wurden aus dem Stundenplan entnommen, nur in Ausnahmefällen überschreiben!',
				class: "custom-tooltip"
			}
		},
		getTooltipDatumFromStundenplan() {
			return {
				value: this.$p.t('global/tooltipUnterrichtDatumCustom'),//'Datum wurde dem Stundenplan entnommen, nur in Ausnahmefällen überschreiben!',
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
			let str = this.$entryParams.selected_le_info?.value?.infoString ?? ''
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
									
									<h5>{{ $p.t('global/unterrichtzeit') }}</h5>
									<div class="row align-items-center">
										<div class="col-3" style="align-items: center; justify-items: center;">
											<label for="beginn" class="form-label">{{ $p.t('global/anwKontrolleVon') }}</label>
										</div>
										<div class="col-5">
											<datepicker
												v-model="lektorState.beginn"
												@update:model-value="handleChangeBeginn"
												:clearable="false"
												:time-picker="true"
												:text-input="true"
												:auto-apply="true">
											</datepicker>
											
										</div>
										<div class="col-4" v-show="!kontrollZeitSourceStundenplanBeginn" v-tooltip.bottom="getTooltipZeitFromStundenplan">
											<i class="fa-solid fa-triangle-exclamation"></i>
											<i style="margin-left: 4px;">{{ $p.t('global/zeitNichtAusStundenplanBeginn') }}</i>
										</div>
									</div>
									<div class="row align-items-center mt-2">
										<div class="col-3" style="align-items: center; justify-items: center;">
											<label for="von" class="form-label">{{ $capitalize($p.t('global/anwKontrolleBis')) }}</label>
										</div>
										<div class="col-5">
											<datepicker
												v-model="lektorState.ende"
												@update:model-value="handleChangeEnde"
												:clearable="false"
												:time-picker="true"
												:text-input="true"
												:auto-apply="true">
											</datepicker>
											
										</div>
										<div class="col-4" v-show="!kontrollZeitSourceStundenplanEnde" v-tooltip.bottom="getTooltipZeitFromStundenplan">
											<i class="fa-solid fa-triangle-exclamation"></i>
											<i style="margin-left: 4px;">{{ $p.t('global/zeitNichtAusStundenplanEnde') }}</i>
										</div>
									</div>
									<div class="row mt-2">
										<div class="col-3 d-flex" style="height: 40px; align-items: start; justify-items: center;"><label for="datum" class="form-label">{{ $p.t('global/kontrolldatum') }}</label></div>
										<div class="col-5" style="height: 40px">
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
													<div class="col">
														<div class="row" style="margin-left: 12px;">{{ $p.t('global/highlightsettings') }}</div>
														<div class="justify-content-center align-items-center flex-nowrap overflow-hidden" style="display: flex; height: 80px;">
															<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="highlightMode == 'termine'" @click="highlightMode = 'termine';">{{$p.t('global/termine')}} </button>
															<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="highlightMode == 'kontrollen'" @click="highlightMode = 'kontrollen';">{{$p.t('global/kontrollen')}}</button>
															<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="highlightMode == 'allowed'" @click="highlightMode = 'allowed';">{{$p.t('global/allowed')}}</button>
														</div>
													</div>
												</template>
												
											</datepicker>
										</div>
										<div class="col-4" v-show="!kontrollDatumSourceStundenplan" v-tooltip.bottom="getTooltipDatumFromStundenplan">
											<i class="fa-solid fa-triangle-exclamation"></i>
											<i style="margin-left: 4px;">{{ $p.t('global/datumNichtAusStundenplan') }}</i>
										</div>
									</div>
									
									<Divider/>
									<div class="row align items center mt-8">
										<TermineDropdown ref="termineDropdown" @terminChanged="handleTerminChanged"></TermineDropdown>
									</div>
									
								</div>
							</div>
						</template>
						<template v-slot:footer>
							<button v-if="currentLEhasRightToSkipQR" type="button" class="btn btn-primary" @click="insertAnwWithoutQR">{{ $p.t('global/kontrolleOhneQR') }}</button>
							<button type="button" class="btn btn-primary" @click="startNewAnwesenheitskontrolle">{{ $p.t('global/neueAnwKontrolle') }}</button>
						</template>
					</bs-modal>
					
					<bs-modal ref="modalContainerEditKontrolle" class="bootstrap-prompt"
					dialogClass="modal-xl">
						<template v-slot:title>
								{{ $p.t('global/editAnwKontrolle') }}
<!--							<div v-tooltip.bottom="getTooltipKontrolleLoeschen">-->
<!--								{{ $p.t('global/deleteAnwKontrolle') }}-->
<!--								<i class="fa fa-circle-question"></i>-->
<!--							</div>-->
						</template>
						<template v-slot:default>
						
								<template v-for="kontrolle in lektorState.kontrollen">

									<div class="row p-2">
										<div class="col-4 d-flex justify-content-center align-items-center">
											<KontrolleDisplay :kontrolle="kontrolle"></KontrolleDisplay>
										</div>
										<div class="col-4">
											<AnwCountDisplay :anwesend="kontrolle.anwesend" :abwesend="kontrolle.abwesend" :entschuldigt="kontrolle.entschuldigt"/>
										</div>
										<div class="col-4 d-flex justify-content-end">
											<button @click="restartKontrolle(kontrolle)" role="button" class="btn btn-secondary">
												<i class="fa fa-rotate-right"></i>
											</button>
											
											<button style="margin-left: 12px;" @click="deleteAnwesenheitskontrolle(kontrolle)" role="button" class="btn btn-danger">
												<i class="fa fa-trash"></i>
											</button>
											
											<button style="margin-left: 12px;" @click="editAnwesenheitskontrolle(kontrolle)" role="button" class="btn btn-success">
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
											<button role="button" class="col text-white option-entry text-center w-100 btn" @click="updateKontrolle">Speichern</button>
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
								{{ selectedStudent?.title }}
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
							<template v-slot:title>{{ $p.t('global/kontrolle') }}: {{ kontrolleVonBis }}
							
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
								<AnwCountDisplay  v-if="selectedDateCount == 1 & !lektorState?.showAllVar" :anwesend="checkInCount" :abwesend="abwesendCount" :entschuldigt="entschuldigtCount"/>
							</div>
						</div>
						
	
						<div class="col-6">
							<div class="row">
								<div class="col-1"></div>
									<div class="col-5" v-if="$entryParams?.permissions?.admin" >
										<MaUIDDropdown  :title="$capitalize($p.t('lehre/lektor') )" 
										 id="maUID" ref="MADropdown" @maUIDchanged="maUIDchangedHandler">
										</MaUIDDropdown>
									</div>
									<div :class=" $entryParams?.permissions?.admin ? 'col-5' : 'col-10'">
										<LehreinheitenDropdown id="lehreinheit" :title="$capitalize($p.t('lehre/lehreinheit'))" ref="LEDropdown" @leChanged="handleLEChanged">
										</LehreinheitenDropdown>
									</div>
								</div>		
								<div class="row mt-4">
									<div class="col-1"></div>
		
									<div class="col-2" style="height: 40px; align-self: start;"><label for="datum" class="form-label col-sm-1">{{ $p.t('global/kontrolldatum') }}</label></div>
									<div class="col-3" style="height: 40px;">
										<datepicker
											ref="outsideDateSelect"
											v-model="selectedDate"
											:clearable="false"
											locale="de"
											format="dd.MM.yyyy"
											@date-update="handleAutoApply"
											:text-input="true"
											:highlight="highlights">
											
											<template #action-row>
												<div class="col">
													<div class="row" style="margin-left: 12px;">{{ $p.t('global/highlightsettings') }}</div>
													<div class="justify-content-center align-items-center flex-nowrap overflow-hidden" style="display: flex; height: 80px;">
														<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="highlightMode == 'termine'" @click="highlightMode = 'termine';">{{$p.t('global/termine')}} </button>
														<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="highlightMode == 'kontrollen'" @click="highlightMode = 'kontrollen';">{{$p.t('global/kontrollen')}}</button>
														<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="highlightMode == 'allowed'" @click="highlightMode = 'allowed';">{{$p.t('global/allowed')}}</button>
													</div>
												</div>
											</template>
											
										</datepicker>
									</div>
									<div class="col-5" style="height: 40px; align-items: center; display: flex;">
										<div class="row" style="width: 100%;">
											<input type="checkbox" style="max-width: 15%;" @click="handleShowAllToggle" id="all" ref="showAllTickbox">
											<label for="all" style="margin-left: 6px; max-width: 80%;">{{ $p.t('global/showAllKontrollen') }} | {{ selectedDateCount }} / {{ lektorState.kontrollen.length }}</label>
										</div>
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
						:newBtnDisabled="!lektorState.students.length"
						@click:new=openNewAnwesenheitskontrolleModal
						:sideMenu="false"
						noColumnFilter>
							<template #actions>
								<button @click="saveChanges" :disabled="!changedData.length" role="button" :class="getSaveBtnClass">
									<i class="fa fa-save"></i>
								</button>
								
								<button @click="openEditModal" :disabled="!lektorState.kontrollen.length" role="button" :class="getEditBtnClass">
									<i class="fa fa-pen"></i>
								</button>
								
								<button @click="downloadCSV" role="button" class="btn btn-secondary ml-2">
									<i class="fa fa-file-csv"></i>
								</button>
								
								<button @click="openLegend" role="button" class="btn btn-secondary ml-2">
									<i class="fa fa-book"></i>
								</button>
							</template>
					</core-filter-cmpt>	

			</template>
		</core-base-layout>`

};

export default LektorComponent