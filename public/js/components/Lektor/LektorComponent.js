import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import { lektorFormatters } from "../../formatters/formatters";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import verticalsplit from "../../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../../js/components/searchbar/searchbar.js";
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown";
import {MaUIDDropdown} from "../Setup/MaUIDDropdown";
import {KontrollenDropdown} from "../Setup/KontrollenDropdown";
import {TermineDropdown} from "../Setup/TermineDropdown";

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
		"datepicker": VueDatePicker,
		verticalsplit: verticalsplit,
		searchbar: searchbar
	},
	data() {
		return {
			appSideMenuEntries: {},
			headerMenuEntries: {},
			anwesenheitenTabulatorOptions: {
				rowHeight: 88, // foto max-height + 2x padding
				rowFormatter: lektorFormatters.enschuldigtColoring,
				height: false,
				index: 'prestudent_id',
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: Vue.ref(this.$p.t('global/foto')), field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: true, minWidth: 100, maxWidth: 100, tooltip: false},
					{title: this.$p.t('person/student'), field: 'prestudent_id', visible: false,tooltip:false, minWidth: 150},
					{title: this.$p.t('person/vorname'), field: 'vorname', headerFilter: true, widthGrow: 1, tooltip:false, minWidth: 150},
					{title: this.$p.t('person/nachname'), field: 'nachname', headerFilter: true, widthGrow: 1, tooltip:false, minWidth: 150},
					{title: this.$p.t('lehre/gruppe'), field: 'gruppe', headerFilter: true, widthGrow: 1, tooltip:false, minWidth: 150},
					{title: this.$p.t('global/datum'), field: 'status', formatter: lektorFormatters.anwesenheitFormatter, hozAlign:"center",widthGrow: 1, tooltip:false, minWidth: 150},
					{title: this.$p.t('global/summe'), field: 'sum', formatter: lektorFormatters.percentFormatter,widthGrow: 1, tooltip:false, minWidth: 150},
				],
				persistence:true,
				persistenceID: "lektorOverviewLe"
			},
			anwesenheitenTabulatorEventHandlers: [{
				event: "cellClick",
				handler: (e, cell) => {

					// on non date fields route to student by lva component
					const field = cell.getColumn().getField()

					const row = cell.getRow()
					const prestudent_id = Reflect.get(row.getData(), 'prestudent_id')

					if(field === "gruppe" || field === "foto" || field === "prestudent_id" ||
						field === "vorname" || field === "nachname" || field === "sum") {


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
					await this.$entryParams.phrasenPromise

					const cols = this.$refs.anwesenheitenTable.tabulator.getColumns()
					// cols[0].updateDefinition({title: await this.$p.t('global/foto')})
					// cols[1].updateDefinition({title: await this.$p.t('person/student')})
					// cols[2].updateDefinition({title: await this.$p.t('person/vorname')})
					// cols[3].updateDefinition({title: await this.$p.t('person/nachname')})
					// cols[4].updateDefinition({title: await this.$p.t('lehre/gruppe')})
					// cols[5].updateDefinition({title: this.$p.t('global/datum')})
					// cols[6].updateDefinition({title: await this.$p.t('global/summe')})

				}
			}],
			boundRegenerateQR: null,
			boundProgressCounter: null,
			beginn: null,
			changedData: [],
			entschuldigtStati: [],
			deleteData: null,
			ma_uid: null,
			sem_kurzbz: null,
			lv_id: null,
			dates: [], // all
			termine: [], // stundenplan
			kontrollen: [],
			filterTitle: Vue.ref(""),
			ende: null,
			selectedDate: new Date(Date.now()),
			showAllVar: false,
			studentsData: null,
			students: [],
			tableStudentData: null,
			qr: null,
			url: null,
			code: null,
			timerIDPolling: null,
			progressTimerID: null,
			setupPromise: null,
			regenerateProgress: 0,
			progressMax: 0,
			polling: false,
			checkInCount: 0,
			studentCount: 0,
			isAllowedToStartKontrolle: true
		}
	},
	props: {
		permissions: []
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.appSideMenuEntries = payload;
		},
		getExistingQRCode(){

			// TODO: get information of already checked in students as a count
			this.$fhcApi.factory.Kontrolle.getExistingQRCode(this.$entryParams.selected_le_id)
				.then(res => {
				if(res.data.svg) {
					this.showQR(res.data)
				}
			})
		},
		pollAnwesenheit() {
			this.$fhcApi.factory.Kontrolle.pollAnwesenheiten(this.anwesenheit_id).then(res => {
				this.checkInCount = res.data.count
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
			this.showAll()
		},
		showAll() {
			// set tabulator column definition to show every distinct date fetched

			if(!this.showAllVar) {
				const newCols = this.anwesenheitenTabulatorOptions.columns.slice(0, 4)
				this.dates.forEach(date => {
					const dateParts = date.split( "-")
					const colTitle = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]
					newCols.push({
						title: colTitle, field: date
						, formatter: lektorFormatters.anwesenheitFormatterValue
						, hozAlign:"center",widthGrow: 1, tooltip:false, minWidth: 150
					})
				})
				newCols.push(this.anwesenheitenTabulatorOptions.columns[6])

				this.tableStudentData = this.setupAllData(newCols)

				this.$refs.anwesenheitenTable.tabulator.setColumns(newCols)
				this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData)
				this.showAllVar = true
			} else {

				this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns);
				this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);

				this.showAllVar = false
			}
		},
		setupAllData(cols){
			const data = []

			this.students.forEach(student => {

				const nachname = student.nachname + student.zusatz
				const row = {
					prestudent_id: student.prestudent_id,
					foto: student.foto,
					vorname: student.vorname,
					nachname: nachname,
					gruppe: student.semester + student.verband + student.gruppe,
					sum: student.sum
				}
				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				studentDataEntry.forEach(entry => {
					row[entry.datum] = entry.status
				})

				data.push(row)
			})

			return data
		},
		areDatesSame (date1, date2) {
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
		showQR (data) {
			this.qr = data.svg
			this.url = data.url
			this.code = data.code
			this.checkInCount = data.count
			this.anwesenheit_id = data.anwesenheit_id
			this.$refs.modalContainerQR.show()
			if(this.$entryParams.permissions.useRegenerateQR) this.startRegenerateQR()
			this.startPollingAnwesenheiten()
		},
		getNewQRCode () {
			// js months 0-11, php months 1-12
			const date = {year: this.selectedDate.getFullYear(), month: this.selectedDate.getMonth() + 1, day: this.selectedDate.getDate()}

			this.$fhcApi.factory.Kontrolle.getNewQRCode(this.$entryParams.selected_le_id, date, this.beginn, this.ende, date).then(res => {
				if(res.data) {
					this.$refs.modalContainerNewKontrolle.hide()
					this.showQR(res.data)
				}
			}).catch(err => {
				this.$fhcAlert.alertError(this.$p.t('global/errorStartAnwKontrolle'))
				this.$refs.modalContainerNewKontrolle.hide()
			})

		},
		handleTerminChanged(termin) {
			this.setTimespanForKontrolleTermin(termin)
		},
		regenerateQR() {
			this.$fhcApi.factory.Kontrolle.regenerateQRCode(this.anwesenheit_id).then(async (res) => {
				const oldCode = this.code
				this.qr = res.data.svg
				this.url = res.data.url
				this.code = res.data.code

				await this.wait(200)

				this.$fhcApi.factory.Kontrolle.degenerateQRCode(this.anwesenheit_id, oldCode)
			})
		},
		progressCounter() {
			if(this.regenerateProgress === this.progressMax) {
				this.regenerateQR()
			}
			if(this.regenerateProgress >= this.progressMax) this.regenerateProgress = 0
			this.regenerateProgress++
		},
		saveChanges () {
			const changedStudents = new Set(this.changedData.map(e => e.prestudent_id))
			this.$fhcApi.factory.Kontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id, this.changedData).then((res) => {

				if(res.meta.status === "success") {
					this.$fhcAlert.alertSuccess(this.$p.t('global/anwUserUpdateSuccess'))
				} else {
					this.$fhcAlert.alertError(this.$p.t('global/errorAnwUserUpdate'))
				}

				const changedStudentsArr = [...changedStudents]
				this.$fhcApi.factory.Kontrolle.getAnwQuoteForPrestudentIds(changedStudentsArr, this.$entryParams.lv_id, this.$entryParams.sem_kurzbz)
					.then(res => {
						this.updateSumData(res.data.retval)
				})
			})

			this.changedData = []
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
			this.$fhcApi.factory.Kontrolle.degenerateQRCode(this.anwesenheit_id, oldCode)
		},
		setTimespanForKontrolleTermin(termin, setDate = true) {
			if(setDate) this.selectedDate = new Date(termin.datum)

			const beginn = new Date('1995-10-16 ' + termin.beginn)
			const ende = new Date('1995-10-16 ' + termin.ende)

			this.beginn = {hours: beginn.getHours(), minutes: beginn.getMinutes(), seconds: beginn.getSeconds()}
			this.ende = {hours: ende.getHours(), minutes: ende.getMinutes(), seconds: ende.getSeconds()}
		},
		findClosestTermin() {
			const todayTime = new Date(Date.now()).getTime()
			let nearestFutureTermin = null
			this.termine.forEach((termin, i) => {
				termin.timeDiff = new Date(termin.datum).getTime() - todayTime
				if (i === 0) {
					nearestFutureTermin = termin
				} else {
					nearestFutureTermin = (termin.timeDiff < nearestFutureTermin.timeDiff && termin.timeDiff > 0) ? termin : nearestFutureTermin
				}
			})

			return nearestFutureTermin
		},
		startNewAnwesenheitskontrolle(){
			if(!this.beginn || !this.ende) {
				this.$fhcAlert.alertError(this.$p.t('global/errorAnwStartAndEndSet'))
				return
			}

			if (!this.validateTimespan())
			{
				return false;
			}


			this.qr = '' // indirectly set start button disabled

			// fetch some data from stundenplan what should be happening rn
			// if there is no stundenplan entry enter some hours of anwesenheit?

			this.getNewQRCode()
		},
		stopAnwesenheitskontrolle () {
			this.$refs.modalContainerQR.hide()

			this.stopPollingAnwesenheiten() // stops polling loop on server
			this.qr = null
			this.url = null
			this.code = null

			// TODO: maybe only fetch new entries and merge
			// fetch table data
			this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id).then(res => {
				if(res.meta.status !== "success") return
				this.setupData(res.data)
			})

			this.$fhcApi.factory.Kontrolle.deleteQRCode(this.anwesenheit_id).then(
				res => {
					if(res.meta.status === "success" && res.data) {
						this.$fhcAlert.alertSuccess(this.$p.t('global/anwKontrolleBeendet'))
					} else {
						this.$fhcAlert.alertError(this.$p.t('global/errorDeleteQRCode'))
					}

					if(this.$entryParams.permissions.useRegenerateQR) this.stopRegenerateQR()
				}
			)
		},
		updateSumData (data) {
			data.forEach(e => {
				const student = this.students.find(s => s.prestudent_id === e.prestudent_id)
				student.sum = e.sum
				const studentTable = this.tableStudentData.find(s => s.prestudent_id === e.prestudent_id)
				studentTable.sum = e.sum
			})

			// TODO: consider show all toggle
			this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
		},
		openDeleteModal () {
			this.$refs.modalContainerDeleteKontrolle.show()
		},
		async deleteAnwesenheitskontrolle () {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			// const date = {year: this.selectedDate.getFullYear(), month: this.selectedDate.getMonth() + 1, day: this.selectedDate.getDate()}
			const dateobj = new Date(this.deleteData.datum)
			const date = {year: dateobj.getFullYear(), month: dateobj.getMonth() + 1, day: dateobj.getDate()}

			this.$fhcApi.factory.Kontrolle.deleteAnwesenheitskontrolle(this.$entryParams.selected_le_id, date).then(res => {
				if(res.meta.status === "success" && res.data) {
					this.$fhcAlert.alertSuccess(this.$p.t('global/deleteAnwKontrolleConfirmation'))

					this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id).then((res)=>{
						if(res.meta.status !== "success") return
						this.setupData(res.data)
					})
				} else if(res.meta.status === "success" && !res.data){
					this.$fhcAlert.alertWarning(this.$p.t('global/noAnwKontrolleFoundToDelete'))
				}
			})

			this.$refs.modalContainerDeleteKontrolle.hide()

		},
		formatDateToDbString (date) {
			return new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
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

			if(entry.studienstatus === 'Incoming') zusatz = ' (i)'
			if(entry.bisio_id && entry.studienstatus !== 'Incoming'
				&& entry.bis > stsemdatumvon && von < stsemdatumbis && ((bis.getTime()-von.getTime())/1000*3600*24) >= 30) {
				zusatz = ' (o) (ab ' + entry.von + ')'
			}

			if(entry.lkt_ueberschreibbar === false) zusatz = ' ('+entry.anmerkung+')'
			if(entry.mitarbeiter_uid !== null) zusatz = ' (ma)'
			if(entry.stg_kz_student === '9005') { // TODO: remove hardcoded value
				zusatz = ' (a.o.)'
			}
			if(entry.mobilitaetstyp_kurzbz && entry.doubledegree === 1) zusatz = ' (d.d.)'

			return zusatz
		},
		setDates(anwEntries) {

			// from anw entries
			anwEntries.forEach(entry => {
				// search for distinct kontrolle dates to use for show all columns
				this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status, anwesenheit_user_id: entry.anwesenheit_user_id})

				const datum = entry.datum
				if(this.dates.indexOf(datum) < 0) {
					this.dates.push(datum)
				}
			})

			// sort dates and termine
			this.dates.sort((a, b) => {
				const as = a.split('-')
				const bs = b.split('-')
				return as > bs ? 1 : a < b ? -1 : 0
			})
		},
		setupData(data) {
			this.students = data[0] ?? []
			const anwEntries = data[1] ?? []
			const stsem = data[2][0] ?? []
			this.entschuldigtStati = data[3] ?? []
			this.kontrollen = data[4] ?? []
			const viewData = data[5] ?? []
			this.termine = data[6] ?? []

			this.filterTitle = this.$entryParams.selected_le_info?.infoString ?? ''

			this.termine.forEach(termin => {
				const dateParts = termin.datum.split( "-")
				termin.datumFrontend = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]
			})

			this.$refs.termineDropdown.setTermine(this.termine)

			if(this.termine.length) {
				const termin = this.findClosestTermin();

				this.setTimespanForKontrolleTermin(termin, false)

				this.termine.forEach(t => this.dates.push(t.datum))
			}

			this.studentsData = new Map()

			this.students.forEach(entry => {
				entry.zusatz = this.formatZusatz(entry, stsem)
				this.studentsData.set(entry.prestudent_id, [])
			})
			this.dates = []

			this.setDates(anwEntries)
			this.$refs.kontrolleDropdown.setKontrollen(this.kontrollen)

			// date string formatting
			const selectedDateDBFormatted = this.formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split( "-")
			const selectedDateFrontendFormatted = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]
			this.$refs.anwesenheitenTable.tabulator.updateColumnDefinition("status", {title: selectedDateFrontendFormatted})

			this.tableStudentData = []
			this.studentCount = this.students.length
			this.students.forEach(student => {

				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateDBFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'

				const isEntschuldigt = !!this.entschuldigtStati.find(status => {
					const vonDate = new Date(status.von)
					const bisDate = new Date(status.bis)
					return status.person_id === student.person_id && vonDate <= this.selectedDate && bisDate >= this.selectedDate
				})

				const nachname = student.nachname + student.zusatz
				this.tableStudentData.push({prestudent_id: student.prestudent_id,
					foto: student.foto,
					vorname: student.vorname,
					nachname: nachname,
					gruppe: student.semester + student.verband + student.gruppe,
					entschuldigt: isEntschuldigt,
					status: status ?? '-',
					sum: student.sum});
			})

			if(this.showAllVar) {
				this.showAll()
			} else {
				const cols = this.$refs.anwesenheitenTable.tabulator.getColumns()


				// phrasen bandaid
				cols.find(e => e.getField() === 'foto').updateDefinition({title: this.$p.t('global/foto')})
				cols.find(e => e.getField() === 'prestudent_id').updateDefinition({title: this.$p.t('person/student')})
				cols.find(e => e.getField() === 'vorname').updateDefinition({title: this.$p.t('person/vorname')})
				cols.find(e => e.getField() === 'nachname').updateDefinition({title: this.$p.t('person/nachname')})
				cols.find(e => e.getField() === 'gruppe').updateDefinition({title: this.$p.t('lehre/gruppe')})
				cols.find(e => e.getField() === 'sum').updateDefinition({title: this.$p.t('global/summe')})
				this.anwesenheitenTabulatorOptions.columns[0].title = this.$p.t('global/foto')
				this.anwesenheitenTabulatorOptions.columns[1].title = this.$p.t('person/student')
				this.anwesenheitenTabulatorOptions.columns[2].title = this.$p.t('person/vorname')
				this.anwesenheitenTabulatorOptions.columns[3].title = this.$p.t('person/nachname')
				this.anwesenheitenTabulatorOptions.columns[4].title = this.$p.t('lehre/gruppe')
				this.anwesenheitenTabulatorOptions.columns[6].title = this.$p.t('global/summe')

				this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
			}

		},
		maUIDchangedHandler(oldIds) {
			this.$refs.LEDropdown.resetData()
			this.handleLEChanged()
		},
		openNewAnwesenheitskontrolleModal(){
			this.$refs.modalContainerNewKontrolle.show()
		},
		toggleAnwStatus (e, cell, prestudent_id) {

			const value = cell.getValue()
			if(value === undefined) return
			let date = cell.getColumn().getField() // '2024-10-24' or 'status'
			if(date === 'status') {
				date = this.formatDateToDbString(this.selectedDate)
			}

			const arrWrapped = this.studentsData.get(prestudent_id)
			const arr = JSON.parse(JSON.stringify(arrWrapped))
			const found = arr.find(e => e.datum === date)

			const anwesenheit_user_id = found?.anwesenheit_user_id

			if(value === "abwesend") {

				const newEntry = {
					prestudent_id, date, status: "anwesend", anwesenheit_user_id
				}

				this.handleChange(newEntry)
				cell.setValue("anwesend")

			} else if (value === "anwesend") {
				const newEntry = {
					prestudent_id, date, status: "abwesend", anwesenheit_user_id
				}
				this.handleChange(newEntry)
				cell.setValue("abwesend")
			}
		},
		handleChange(newEntry) {
			const updateFoundIndex = this.changedData.findIndex(e => e.prestudent_id === newEntry.prestudent_id && e.date === newEntry.date)
			if(updateFoundIndex >= 0) this.changedData.splice(updateFoundIndex, 1)
			else this.changedData.push(newEntry)

		},
		validateTimespan () {
			const vonDate = new Date(1995, 10, 16, this.beginn.hours, this.beginn.minutes, this.beginn.seconds)
			const bisDate = new Date(1995, 10, 16, this.ende.hours, this.ende.minutes, this.ende.seconds)

			if (bisDate < vonDate)
			{
				this.$fhcAlert.alertError(this.$p.t('global/errorValidateTimes'));
				return false
			}

			return true;
		},
		routeToLandingPage() {
			this.$router.push({
				name: 'LandingPage'
			})
		},
		async setupMounted(){
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise

			const now = new Date(Date.now())
			this.beginn = {hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds()}
			this.ende = {hours: now.getHours() + 2, minutes: now.getMinutes(), seconds: now.getSeconds()}

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
			const ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid ?? this.ma_uid
			this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id, ma_uid, date).then(res => {
				this.setupData(res.data)
			})

		},
		handleLEChanged () {
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid ?? this.ma_uid
			this.$fhcApi.factory.Info.getLehreinheitAndLektorInfo(this.$entryParams.selected_le_id, ma_uid, date)
				.then(res => this.setupLehreinheitAndLektorData(res));

			this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id).then(res => {


				this.setupData(res.data)

			})

			this.getExistingQRCode()
		}
	},
	created(){
		this.lv_id = this.$entryParams.lv_id
		this.sem_kurzbz = this.$entryParams.sem_kurzbz
		this.ma_uid = this.$entryParams.permissions.authID

		const selectedDateDBFormatted = this.formatDateToDbString(this.selectedDate)
		const dateParts = selectedDateDBFormatted.split( "-")
		const selectedDateFrontendFormatted = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]

		const found = this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status')
		found.title = selectedDateFrontendFormatted
	},
	mounted() {
		this.setupMounted()

	},
	unmounted(){
		// anwesenheitskontrolle could be active
		this.stopPollingAnwesenheiten()
	},
	updated(){
	},
	watch: {
		selectedDate(newVal) {
			this.showAllVar = false
			const selectedDateDBFormatted = this.formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split( "-")
			const selectedDateFrontendFormatted = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]


			const today = new Date(Date.now())
			this.isAllowedToStartKontrolle = this.areDatesSame(newVal, today)

			// load stundenplan hours for ma_uid, le_id and selected date
			const date = this.formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid ?? this.ma_uid

			this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status').title = selectedDateFrontendFormatted

			this.students.forEach((student, index) => {
				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateDBFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'

				const foundEntry = this.tableStudentData.find(entry => entry.prestudent_id === student.prestudent_id)
				foundEntry.status = status
			})
			this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
			this.$refs.anwesenheitenTable.tabulator.setData([...this.tableStudentData]);
			this.$refs.showAllTickbox.checked = false

		}
	},
	template:`
		<core-navigation-cmpt 
			v-bind:add-side-menu-entries="appSideMenuEntries"
			v-bind:add-header-menu-entries="headerMenuEntries"
			:hideTopMenu="true"
			leftNavCssClasses="">	
		</core-navigation-cmpt>
					
		<core-base-layout>			
			<template #main>
				<bs-modal ref="modalContainerNewKontrolle" class="bootstrap-prompt" dialogClass="modal-lg">
					<template v-slot:title>{{ $p.t('global/neueAnwKontrolle') }}</template>
					<template v-slot:default>
						<div class="row align-items-center">
							<div class="col-2" style="align-items: center; justify-items: center;"><label for="beginn" class="form-label col-sm-1">{{ $capitalize($p.t('ui/von')) }}</label></div>
							<div class="col-10">
								<datepicker
									v-model="beginn"
									time-picker="true"
									text-input="true"
									auto-apply="true">
								</datepicker>
							</div>
						</div>
						<div class="row align-items-center mt-2">
							<div class="col-2" style="align-items: center; justify-items: center;"><label for="von" class="form-label">{{ $capitalize($p.t('global/bis')) }}</label></div>
							<div class="col-10">
								<datepicker
									v-model="ende"
									time-picker="true"
									text-input="true"
									auto-apply="true">
								</datepicker>
							</div>
						</div>
						<div class="row mt-2">
							<div class="col-2 d-flex" style="height: 40px; align-items: center; justify-items: center;"><label for="datum" class="form-label col-sm-1">{{ $p.t('global/kontrolldatum') }}</label></div>
							<div class="col-10" style="height: 40px">
								<datepicker
									v-model="selectedDate"
									locale="de"
									format="dd.MM.yyyy"
									text-input="true"
									auto-apply="true">
								</datepicker>
							</div>
						</div>
						<Divider/>
						<div class="row align items center mt-8">
							<TermineDropdown ref="termineDropdown" @terminChanged="handleTerminChanged"></TermineDropdown>
						</div>
					</template>
					<template v-slot:footer>
						<button type="button" class="btn btn-primary" @click="startNewAnwesenheitskontrolle">{{ $p.t('global/neueAnwKontrolle') }}</button>
					</template>
				</bs-modal>
				
				<bs-modal ref="modalContainerDeleteKontrolle" class="bootstrap-prompt"
				dialogClass="modal-lg">
					<template v-slot:title>{{ $p.t('global/deleteAnwKontrolle') }}</template>
					<template v-slot:default>
						
						<KontrollenDropdown ref="kontrolleDropdown" @kontrolleChanged="handleKontrolleChanged"></KontrollenDropdown>
						
					</template>
					<template v-slot:footer>
						<button type="button" class="btn btn-primary" :disabled="deleteData === null" @click="deleteAnwesenheitskontrolle">{{ $p.t('global/deleteAnwKontrolle') }}</button>
					</template>
				</bs-modal>				
				
				<bs-modal ref="modalContainerQR" class="bootstrap-prompt" dialogClass="modal-lg"  backdrop="static" 
				 :keyboard=false noCloseBtn=true>
					<template v-slot:title>{{ $p.t('global/zugangscode') }}</template>
					<template v-slot:default>
						<h1 class="text-center">Code: {{code}}</h1>
						<div v-html="qr" class="text-center"></div>
						<div class="text-center">
							<h3>{{checkInCount}}/{{studentCount}}</h3>
						</div>
						<div class="row" style="width: 80%; margin-left: 10%;">
							<progress 
								v-if="$entryParams.permissions.useRegenerateQR"
								:max="progressMax"
								:value="regenerateProgress">
							</progress>
						</div>
					</template>
					<template v-slot:footer>
						<button type="button" class="btn btn-primary" @click="stopAnwesenheitskontrolle">{{ $p.t('global/endAnwKontrolle') }}</button>
					</template>
				</bs-modal>
				
				<div class="row">
					<div class="col-6"></div>
					<div class="col-3">
						<MaUIDDropdown v-if="$entryParams?.permissions?.admin || $entryParams?.permissions?.assistenz"
						 id="maUID" ref="MADropdown" @maUIDchanged="maUIDchangedHandler">
						</MaUIDDropdown>
					</div>
					<div class="col-3">
						<LehreinheitenDropdown id="lehreinheit" ref="LEDropdown" @leChanged="handleLEChanged">
						</LehreinheitenDropdown>
					</div>
				</div>
				
				<div class="row mt-4" style="height: 70px">
					<div class="col-6" style="transform: translateY(-90px)">
						<h1 class="h4">{{ filterTitle }}</h1>
						<h6>{{$entryParams.viewDataLv.bezeichnung}}</h6>
					</div>
					
					<div class="col-1 d-flex" style="height: 40px; align-items: center;"><label for="datum" class="form-label col-sm-1">{{ $p.t('global/kontrolldatum') }}</label></div>
					<div class="col-3" style="height: 40px">
						<datepicker
							v-model="selectedDate"
							locale="de"
							format="dd.MM.yyyy"
							text-input="true"
							auto-apply="true">
						</datepicker>
					</div>
					<div class="col-2 d-flex " style="height: 40px; align-items: center;">
						<input type="checkbox" @click="handleShowAllToggle" id="all" ref="showAllTickbox">
						<label for="all" style="margin-left: 12px;">{{ $p.t('global/showAllDates') }}</label>
					</div>
				</div>
				<div style="transform: translateY(-30px)">
					<core-filter-cmpt
						title=""
						ref="anwesenheitenTable"
						:tabulator-options="anwesenheitenTabulatorOptions"
						:tabulator-events="anwesenheitenTabulatorEventHandlers"
						:id-field="'anwesenheiten_id'"
						@nw-new-entry="newSideMenuEntryHandler"
						:tableOnly
						newBtnShow=true
						:newBtnLabel="$p.t('global/neueAnwKontrolle')"
						:newBtnDisabled=false
						@click:new=openNewAnwesenheitskontrolleModal
						:sideMenu="false"
						noColumnFilter>
							<template #actions>
								<button @click="saveChanges" :disabled="!changedData.length" role="button" class="btn btn-secondary ml-2">
	<!--								{{ $p.t('ui/save') }}-->
									<i class="fa fa-save"></i>
								</button>
								
								<button @click="openDeleteModal" :disabled="!kontrollen.length" role="button" class="btn btn-danger ml-2">
	<!--								{{ $p.t('global/deleteAnwKontrolle') }}-->
									<i class="fa fa-trash"></i>
								</button>
							</template>
					</core-filter-cmpt>
				</div>
			</template>
		</core-base-layout>
	</div>`
};

export default LektorComponent
