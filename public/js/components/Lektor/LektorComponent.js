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
import {Statuslegende} from "./Statuslegende.js";

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
		Statuslegende
	},
	data() {
		return {
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
				tableStudentsData: [],
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
				debugInvalidComponentFuncs:false,
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: this.$capitalize(this.$p.t('global/foto')), field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: true, minWidth: 100, maxWidth: 100, download: false, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('global/prestudentID')), field: 'prestudent_id', formatter: lektorFormatters.centeredFormatter, visible: false, minWidth: 150, download: true, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('person/vorname')), field: 'vorname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1,  minWidth: 150, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('person/nachname')), field: 'nachname', formatter: lektorFormatters.centeredFormatter, headerFilter: true, widthGrow: 1, minWidth: 150, tooltip: this.tooltipTableRow},
					{title: this.$capitalize(this.$p.t('lehre/gruppe')), field: 'gruppe', headerFilter: 'list', tooltip: this.tooltipTableRow,
						headerFilterParams: {
							valuesLookup: true,
							clearable: true,
							autocomplete: true,
						},
						formatter: lektorFormatters.centeredFormatter, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/datum')), field: 'status', formatter: this.anwesenheitFormatterValue, hozAlign:"center",widthGrow: 1, 
						// tooltip: this.anwTooltip,
						tooltip: this.tooltipTableRow,
						minWidth: 150},
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
				persistenceID: "lektorOverviewLe"
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

						this.$router.push({
							name: 'StudentByLva',
							params: {id: prestudent_id, lv_id: this.lv_id, sem_kz: this.sem_kurzbz}
						})
					} else { // on date fields toggle state edit
						this.toggleAnwStatus(e, cell, prestudent_id)
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
			minDate: new Date(Date.now()).setDate((new Date(Date.now()).getDate() - (this.$entryParams.permissions.kontrolleCreateMaxReach))),
			maxDate: new Date(Date.now()).setDate((new Date(Date.now()).getDate() + (this.$entryParams.permissions.kontrolleCreateMaxReach))),
			changes: false // if something could have happened to dataset -> reload on mounted
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
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.getExistingQRCode(this.$entryParams.selected_le_id.value)
				.then(res => {
					if (res.data.svg) {
						this.showQR(res.data)
					}
				})
		},
		pollAnwesenheit() {
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.pollAnwesenheiten(this.anwesenheit_id, this.lv_id).then(res => {
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
			this.showAll()
			this.loading = false
		},
		async setAllColsAndData() {
			this.$refs.anwesenheitenTable.tabulator.clearSort()
			this.$refs.anwesenheitenTable.tabulator.setColumns(this.lektorState.tabulatorCols)
			this.$refs.anwesenheitenTable.tabulator.setData(this.lektorState.tableStudentData)
		},
		showAll() {
			// set tabulator column definition to show every distinct date fetched

			if (!this.lektorState.showAllVar) {
				const newCols = this.anwesenheitenTabulatorOptions.columns.slice(0, 5)
				this.lektorState.dates.forEach(date => {
					const dateParts = date.split("-")
					const colTitle = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0]
					newCols.push({
						title: colTitle, field: date
						, formatter: this.anwesenheitFormatterValue
						, hozAlign: "center", widthGrow: 1, tooltip: false, minWidth: 150
					})
				})
				newCols.push(this.anwesenheitenTabulatorOptions.columns[6])

				this.lektorState.tableStudentData = this.setupAllData(newCols)
				this.lektorState.tabulatorCols = newCols
				this.setAllColsAndData()

				this.lektorState.showAllVar = true
			} else {

				this.$refs.anwesenheitenTable.tabulator.clearSort()
				// use selectedDate watcher to retrieve single column table state
				this.selectedDate = new Date(this.selectedDate)

				this.lektorState.showAllVar = false
			}

		},
		setupAllData() {
			const data = []

			this.lektorState.students.forEach(student => {

				const nachname = student.nachname + student.zusatz
				const row = {
					prestudent_id: student.prestudent_id,
					foto: student.foto,
					vorname: student.vorname,
					nachname: nachname,
					gruppe: student.semester + student.verband + student.gruppe,
					sum: student.sum
				}
				const studentDataEntry = this.lektorState.studentsData.get(student.prestudent_id)
				studentDataEntry.forEach(entry => {
					row[entry.datum] = entry.status
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
		showQR(data) {
			this.qr = data.svg
			this.url = data.url
			this.code = data.code
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

			this.$fhcApi.factory.Anwesenheiten.Kontrolle.getNewQRCode(this.$entryParams.selected_le_id.value, date, this.lektorState.beginn, this.lektorState.ende, date).then(res => {
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
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.regenerateQRCode(this.anwesenheit_id).then(async (res) => {
				const oldCode = this.code
				this.qr = res.data.svg
				this.url = res.data.url
				this.code = res.data.code

				await this.wait(5000)

				this.$fhcApi.factory.Anwesenheiten.Kontrolle.degenerateQRCode(this.anwesenheit_id, oldCode)
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
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id.value, this.changedData).then((res) => {
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
				
				this.$fhcApi.factory.Anwesenheiten.Kontrolle.getAnwQuoteForPrestudentIds(changedStudentsArr, this.$entryParams.lv_id, this.$entryParams.sem_kurzbz)
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
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.degenerateQRCode(this.anwesenheit_id, oldCode)
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

			if (!this.validateTimespan()) {
				return false;
			}


			this.qr = '' // indirectly set start button disabled

			// fetch some data from stundenplan what should be happening rn
			// if there is no stundenplan entry enter some hours of anwesenheit?

			this.getNewQRCode()
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
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, date).then(res => {
				if (res.meta.status !== "success") return
				this.setupData(res.data)
			}).finally(() => {
				this.loading = false
			})

			this.$fhcApi.factory.Anwesenheiten.Kontrolle.deleteQRCode(this.anwesenheit_id, this.lv_id).then(
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
		openDeleteModal() {
			this.$refs.modalContainerDeleteKontrolle.show()
		},
		openLegend() {
			this.$refs.modalContainerLegende.show()
		},
		async deleteAnwesenheitskontrolle() {
			if (await this.$fhcAlert.confirmDelete() === false) return;

			const dataparts = this.deleteData.datum.split('.')
			const dateobj = new Date(dataparts[2], dataparts[1] - 1, dataparts[0])
			const date = {year: dateobj.getFullYear(), month: dateobj.getMonth() + 1, day: dateobj.getDate()}
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			const dateAnwFormat = dataparts[2] + '-' + dataparts[1] + '-' + dataparts[0]

			this.$fhcApi.factory.Anwesenheiten.Kontrolle.deleteAnwesenheitskontrolle(this.$entryParams.selected_le_id.value, date).then(res => {
				if (res.meta.status === "success" && res.data) {
					this.$fhcAlert.alertSuccess(this.$p.t('global/deleteAnwKontrolleConfirmation'))

					this.loading = true
					this.$fhcApi.factory.Anwesenheiten.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, dateAnwFormat).then((res) => {
						if (res.meta.status !== "success") return
						this.setupData(res.data)
					}).finally(() => {
						this.loading = false
					})
				} else if (res.meta.status === "success" && !res.data) {
					this.$fhcAlert.alertWarning(this.$p.t('global/noAnwKontrolleFoundToDelete'))
				}
			})

			this.$refs.modalContainerDeleteKontrolle.hide()

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
		setDates(anwEntries) {

			// from anw entries
			anwEntries.forEach(entry => {
				// search for distinct kontrolle dates to use for show all columns
				this.lektorState.studentsData.get(entry.prestudent_id).push({
					datum: entry.datum,
					status: entry.status,
					anwesenheit_user_id: entry.anwesenheit_user_id
				})

				const datum = entry.datum
				if (this.lektorState.dates.indexOf(datum) < 0) {
					this.lektorState.dates.push(datum)
				}
			})

			// sort dates and termine
			this.lektorState.dates.sort((a, b) => {
				const as = a.split('-')
				const bs = b.split('-')
				return as > bs ? 1 : a < b ? -1 : 0
			})
		},
		async setupLektorComponent() {
			// use this to show actual entries with should be entries from stundenplan merged
			// this.lektorState.dates = []
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

			}
			// use this to only show dates with actual entries
			this.lektorState.dates = []

			this.lektorState.studentsData = new Map()

			this.lektorState.students.forEach(entry => {
				entry.zusatz = this.formatZusatz(entry, this.lektorState.stsem)
				this.lektorState.studentsData.set(entry.prestudent_id, [])
			})

			this.setDates(this.lektorState.anwEntries)


			this.$refs.kontrolleDropdown.setKontrollen(this.lektorState.kontrollen)

			// date string formatting
			const selectedDateDBFormatted = this.formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split("-")
			const selectedDateFrontendFormatted = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0]


			this.$refs.anwesenheitenTable.tabulator.updateColumnDefinition("status", {title: selectedDateFrontendFormatted})

			this.lektorState.tableStudentData = []
			this.studentCount = this.lektorState.students.length
			this.lektorState.students.forEach(student => {

				const studentDataEntry = this.lektorState.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateDBFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'

				// bind entschuldigungen info into table data
				// TODO: filtert auf aktuelle Uhrzeit, zeigt eventuell frühere/spätere entschuldigungen am selben datum nicht an
				const allEntStudentForCurrentDate = this.lektorState.entschuldigtStati.filter(status => {
					const vonDate = new Date(status.von)
					const bisDate = new Date(status.bis)
					if(status.person_id === student.person_id && vonDate <= this.selectedDate && bisDate >= this.selectedDate) return true
					else return false
				})

				
				// foundEntry.hasEntschuldigung = !!entschuldigungEntryStudent
				let isEntschuldigt = null
				allEntStudentForCurrentDate.forEach(entCurDate => {
					if(entCurDate.akzeptiert === true) isEntschuldigt = true
				})

				// const studentEntschuldigungen = this.lektorState.entschuldigtStati.filter(entschuldigung => entschuldigung.person_id === student.person_id)

				const nachname = student.nachname + student.zusatz
				const gruppe = student.semester + student.verband + student.gruppe
				this.lektorState.gruppen.add(gruppe)
				this.lektorState.tableStudentData.push({
					prestudent_id: student.prestudent_id,
					foto: student.foto,
					vorname: student.vorname,
					nachname: nachname,
					gruppe: gruppe,
					entschuldigt: isEntschuldigt,
					entschuldigungen: allEntStudentForCurrentDate,
					status: status ?? '-',
					sum: student.sum
				});
			})

			// get current counts for selectedDate
			this.setCurrentCountsFromTableData()

			// this.linkKontrollData()

			if (this.lektorState.showAllVar) {
				this.showAll()
			} else {
				const cols = this.$refs.anwesenheitenTable.tabulator.getColumns()

				this.anwesenheitenTabulatorOptions.columns[0].title = this.$capitalize(await this.$p.t('global/foto'))
				this.anwesenheitenTabulatorOptions.columns[1].title = this.$capitalize(await this.$p.t('global/prestudentID'))
				this.anwesenheitenTabulatorOptions.columns[2].title = this.$capitalize(await this.$p.t('person/vorname'))
				this.anwesenheitenTabulatorOptions.columns[3].title = this.$capitalize(await this.$p.t('person/nachname'))
				this.anwesenheitenTabulatorOptions.columns[4].title = this.$capitalize(await this.$p.t('lehre/gruppe'))
				this.anwesenheitenTabulatorOptions.columns[6].title = this.$capitalize(await this.$p.t('global/summe'))

				this.lektorState.tabulatorCols = cols
				this.$refs.anwesenheitenTable.tabulator.clearSort()
				this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
				this.$refs.anwesenheitenTable.tabulator.setData(this.lektorState.tableStudentData);
			}

			this.loading = false
		},
		setCurrentCountsFromTableData() {
			let tmpCntAnw = 0;
			let tmpCntAbw = 0;
			let tmpCntEnt = 0;

			this.lektorState.tableStudentData.forEach(row => {
				switch (row.status) {
					case this.$entryParams.permissions.anwesend_status:
						tmpCntAnw++
						break;
					case this.$entryParams.permissions.abwesend_status:
						tmpCntAbw++
						break;
					case this.$entryParams.permissions.entschuldigt_status:
						tmpCntEnt++
						break;
				}
			})

			this.checkInCount = tmpCntAnw;
			this.abwesendCount = tmpCntAbw;
			this.entschuldigtCount = tmpCntEnt;
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
			this.lektorState.viewData = data[5] ?? []
			// todo: check for edge cases

			this.$entryParams.available_termine.value = this.getAvailableTermine(data)
			this.lektorState.a_o_kz = data[7] ?? []
			this.lektorState.gruppen = new Set()

			this.setupLektorComponent()
		},
		getAvailableTermine(data) {
			if(this.$entryParams.allLeTermine && this.$entryParams.allLeTermine[this.$entryParams.selected_le_id.value]) {
				return this.$entryParams.allLeTermine[this.$entryParams.selected_le_id.value] ?? []
			} else {
				// this should never happen since we always have termine setup before LE but still handling the odd case
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
		toggleAnwStatus(e, cell, prestudent_id) {
			const value = cell.getValue()
			if (value === undefined) return
			let date = cell.getColumn().getField() // '2024-10-16' or 'status'
			if (date === 'status') {
				date = this.formatDateToDbString(this.selectedDate)
			}

			const arrWrapped = this.lektorState.studentsData.get(prestudent_id)
			const arr = JSON.parse(JSON.stringify(arrWrapped))
			const found = arr.find(e => e.datum === date)

			const anwesenheit_user_id = found?.anwesenheit_user_id

			if (value === this.$entryParams.permissions.abwesend_status) {

				const newEntry = {
					prestudent_id, date, status: this.$entryParams.permissions.anwesend_status, anwesenheit_user_id
				}

				this.handleChange(newEntry)
				cell.setValue(this.$entryParams.permissions.anwesend_status)

			} else if (value === this.$entryParams.permissions.anwesend_status) {
				const newEntry = {
					prestudent_id, date, status: this.$entryParams.permissions.abwesend_status, anwesenheit_user_id
				}
				this.handleChange(newEntry)
				cell.setValue(this.$entryParams.permissions.abwesend_status)
			}
		},
		handleChange(newEntry) {
			const updateFoundIndex = this.changedData.findIndex(e => e.prestudent_id === newEntry.prestudent_id && e.date === newEntry.date)
			if (updateFoundIndex >= 0) this.changedData.splice(updateFoundIndex, 1)
			else this.changedData.push(newEntry)

		},
		validateTimespan() {
			const vonDate = new Date(1995, 10, 16, this.lektorState.beginn.hours, this.lektorState.beginn.minutes, this.lektorState.beginn.seconds)
			const bisDate = new Date(1995, 10, 16, this.lektorState.ende.hours, this.lektorState.ende.minutes, this.lektorState.ende.seconds)

			if (bisDate <= vonDate) {
				this.$fhcAlert.alertError(this.$p.t('global/errorValidateTimes'));
				return false
			} else if(bisDate > vonDate) {
				const minDiff = (bisDate - vonDate) / (1000 * 60)
				const threshold = (this.$entryParams.permissions.einheitDauer ?? 0.75 ) * 60
				if(minDiff <= threshold) {
					this.$fhcAlert.alertError(this.$p.t('global/kontrollDauerUnterMindestwert', [threshold]));
					return false
				}
			}

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

			const selectedDateDBFormatted = this.formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split("-")
			const selectedDateFrontendFormatted = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0]
			const found = this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status')
			found.title = selectedDateFrontendFormatted

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
				this.$fhcApi.factory.Anwesenheiten.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, date).then(res => {
					this.setupData(res.data)
				}).finally(() => {
					this.loading = false
				})
			}


		},
		handleLEChanged() {
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID.value?.mitarbeiter_uid ?? this.ma_uid
			this.loading = true
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id.value, ma_uid, date).then(res => {
				this.setupData(res.data)
			}).finally(() => {
				this.loading = false
			})

			this.getExistingQRCode()
		},
		loadStunden() {
			this.$fhcApi.factory.Anwesenheiten.Info.getStunden().then(res => {
				this.stunden = res.data

			})
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
			
			// todo: only count entschuldigungen that are relevant on selected date... filter on startup/select?
			if(!data.entschuldigungen?.length) return
			if (data.entschuldigt === true) {
				row.getElement().style.color = "#0335f5";
			} else if(data.entschuldigt === false) {
				row.getElement().style.color = "#ff0404";
			} else if(data.entschuldigt === null) {
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
		}
	},
	created(){
		this.loadStunden()
		this.lv_id = this.$entryParams.lv_id
		this.sem_kurzbz = this.$entryParams.sem_kurzbz
		this.ma_uid = this.$entryParams.permissions.authID
	},
	mounted() {
		this.setupMounted()
		
		const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
		const tableDataSet = document.getElementById('filterTableDataset' + tableID);
		if(!tableDataSet) return
		const rect = tableDataSet.getBoundingClientRect();

		const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight : window.visualViewport.height
		this.$entryParams.tabHeights['lektor'].value = screenY - rect.top
	},
	unmounted(){
		// anwesenheitskontrolle could be active
		this.stopPollingAnwesenheiten()
	},
	watch: {
		'lektorState.beginn'(newVal) {
			// could set selectedDate time in here or ende watcher and calculate entschuldigt status visualization from
			// lektors selected attendance check times in order to support status coloring for 'future' Kontrollen.
		},
		'lektorState.ende'(newVal) {
		},
		selectedDate(newVal) {
			if(newVal === "") {
				this.selectedDate = new Date(Date.now())
				return
			}

			this.lektorState.showAllVar = false
			const selectedDateDBFormatted = this.formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split( "-")
			const selectedDateFrontendFormatted = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]

			this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status').title = selectedDateFrontendFormatted

			this.lektorState.students.forEach((student) => {
				const studentDataEntry = this.lektorState.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateDBFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'

				const foundEntry = this.lektorState.tableStudentData.find(entry => entry.prestudent_id === student.prestudent_id)

				// bind entschuldigungen info into table data
				const allEntStudentForCurrentDate = this.lektorState.entschuldigtStati.filter(status => {
					const vonDate = new Date(status.von)
					const bisDate = new Date(status.bis)
					if(status.person_id === student.person_id && vonDate <= this.selectedDate && bisDate >= this.selectedDate) return true
					else return false
				})

				let isEntschuldigt = null
				allEntStudentForCurrentDate.forEach(entCurDate => {
					if(entCurDate.akzeptiert === true) isEntschuldigt = true
				})

				foundEntry.entschuldigt = isEntschuldigt
				foundEntry.entschuldigungen = allEntStudentForCurrentDate
				foundEntry.status = status
				
				
			})
			this.setCurrentCountsFromTableData()
			
			this.handleChangeDatum(this.selectedDate) // look up if datum is in termin list

			this.$refs.anwesenheitenTable.tabulator.clearSort()
			this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
			this.$refs.anwesenheitenTable.tabulator.setData(this.lektorState.tableStudentData);
			this.$refs.showAllTickbox.checked = false

		},
	},
	computed: {
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
		getDeleteBtnClass() {
			return !this.lektorState.kontrollen.length ? "btn btn-secondary ml-2" : "btn btn-danger ml-2"
		},
		getAnwCountOnCurrentDate() {
			let fin = 0
			const k = this.lektorState.tableStudentData.length
			for(let i = 0; i < k; i++ ) {
				if(this.lektorState.tableStudentData[i].status === this.$entryParams.permissions.entschuldigt_status  ||
					this.lektorState.tableStudentData[i].status === this.$entryParams.permissions.anwesend_status) {
					fin++
				}
			}

			return fin
		},
		getCSVFilename() {
			let str = this.$entryParams.selected_le_info?.value?.infoString ?? ''
			str += '_'+ this.$entryParams?.viewDataLv?.bezeichnung + '_'
			str += this.lektorState.showAllVar ? 'AllDates' : this.selectedDate.toDateString()
			return str
		}
	},
	template:`

		<div v-show="loading" style="position: absolute; width: 100%; height: 100%; background: rgba(255,255,255,0.5); z-index: 8500;"></div>
		
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
												v-model="selectedDate"
												:clearable="false"
												locale="de"
												format="dd.MM.yyyy"
												:text-input="true"
												:auto-apply="true"
												:min-date="new Date(minDate)"
												:max-date="new Date(maxDate)">
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
							<button type="button" class="btn btn-primary" @click="startNewAnwesenheitskontrolle">{{ $p.t('global/neueAnwKontrolle') }}</button>
						</template>
					</bs-modal>
					
					<bs-modal ref="modalContainerDeleteKontrolle" class="bootstrap-prompt"
					dialogClass="modal-lg">
						<template v-slot:title>
							<div v-tooltip.bottom="getTooltipKontrolleLoeschen">
								{{ $p.t('global/deleteAnwKontrolle') }}
								<i class="fa fa-circle-question"></i>
							</div>
						</template>
						<template v-slot:default>
							
							<KontrollenDropdown ref="kontrolleDropdown" @kontrolleChanged="handleKontrolleChanged"></KontrollenDropdown>
							
						</template>
						<template v-slot:footer>
							<button type="button" class="btn btn-primary" :disabled="deleteData === null" @click="deleteAnwesenheitskontrolle">{{ $p.t('global/deleteAnwKontrolle') }}</button>
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
					
					<div id="qrwrap">
						<bs-modal ref="modalContainerQR" class="bootstrap-prompt" dialogClass="modal-lg"  backdrop="static" 
						 :keyboard=false :noCloseBtn="true">
							<template v-slot:title>{{ $p.t('global/zugangscode') }}
							
							</template>
							<template v-slot:popoutButton>
								<button @click="togglePopOut" class="btn btn-primary">
								  {{ externalWindow ? "Return Modal to Main Window" : "Pop Out Modal" }}
								</button>
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
								<h1 class="h4">{{ $entryParams.selected_le_info?.value?.infoString ?? '' }}</h1>
								<h6>{{$entryParams.viewDataLv.bezeichnung}}</h6>		
								<AnwCountDisplay  v-if="!lektorState?.showAllVar" :anwesend="checkInCount" :abwesend="abwesendCount" :entschuldigt="entschuldigtCount"/>
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
											v-model="selectedDate"
											:clearable="false"
											locale="de"
											format="dd.MM.yyyy"
											:text-input="true"
											:auto-apply="true"
											:min-date="new Date(minDate)"
											:max-date="new Date(maxDate)">
										</datepicker>
									</div>
									<div class="col-5 d-flex " style="height: 40px; align-items: center;">
										<input type="checkbox" @click="handleShowAllToggle" id="all" ref="showAllTickbox">
										<label for="all" style="margin-left: 12px;">{{ $p.t('global/showAllKontrollen') }}</label>
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
								
								<button @click="openDeleteModal" :disabled="!lektorState.kontrollen.length" role="button" :class="getDeleteBtnClass">
									<i class="fa fa-trash"></i>
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