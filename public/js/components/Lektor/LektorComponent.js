import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

import { lektorFormatters } from "../../mixins/formatters";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {TermineDropdown} from "../Setup/TermineDropdown";

import verticalsplit from "../../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../../js/components/searchbar/searchbar.js";
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown";
import {MaUIDDropdown} from "../Setup/MaUIDDropdown";

export const LektorComponent = {
	name: 'LektorComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		CoreNavigationCmpt,
		BsModal,
		TermineDropdown,
		LehreinheitenDropdown,
		MaUIDDropdown,
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
				layout: 'fitColumns',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: this.$p.t('global/foto'), field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: true, minWidth: 100, maxWidth: 100, tooltip: false},
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
			}],
			boundRegenerateQR: null,
			boundProgressCounter: null,
			beginn: null,
			changedData: [],
			entschuldigtStati: [],
			ma_uid: null,
			sem_kurzbz: null,
			lv_id: null,
			dates: [],
			filterTitle: Vue.ref(""),
			ende: null,
			selectedDate: new Date(Date.now()),
			showAllVar: false,
			// selectedDate: new Date('2023-10-02'),
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
		handleShowAllToggle() {
			this.showAll()
		},
		showAll() {
			// set tabulator column definition to show every distinct date fetched

			if(!this.showAllVar) {
				const newCols = this.anwesenheitenTabulatorOptions.columns.slice(0, 4)
				this.dates.forEach(date => newCols.push({
					title: date, field: date
					, formatter: lektorFormatters.anwesenheitFormatterValue
					, hozAlign:"center",widthGrow: 1, tooltip:false, minWidth: 150
				}))
				newCols.push(this.anwesenheitenTabulatorOptions.columns[6])

				const newData = this.setupAllData(newCols)


				this.$refs.anwesenheitenTable.tabulator.setColumns(newCols)
				this.$refs.anwesenheitenTable.tabulator.setData(newData)
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

			console.log('setupAllData', data)

			return data
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
			console.log('termin changed', termin)

			this.setTimespanForKontrolleTermin(termin)
		},
		regenerateQR() {

			// console.log('regenerateQR')
			// console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressMax)
			this.$fhcApi.factory.Kontrolle.regenerateQRCode(this.anwesenheit_id).then(res => {
				const oldCode = this.code
				this.qr = res.data.svg
				this.url = res.data.url
				this.code = res.data.code
				// console.log('regenerateQR set new QR')
				// console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressMax)

				//TODO: can wait here

				this.$fhcApi.factory.Kontrolle.degenerateQRCode(this.anwesenheit_id, oldCode)
			})


		},
		progressCounter() {
			if(this.regenerateProgress === this.progressMax) {
				this.regenerateQR()
			}
			if(this.regenerateProgress >= this.progressMax) this.regenerateProgress = 0
			this.regenerateProgress++

			// console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressMax)
		},
		saveChanges () {
			const changedStudents = new Set(this.changedData.map(e => e.prestudent_id))
			const changedData = this.changedData
			console.log('changedStudents', changedStudents)
			this.$fhcApi.factory.Kontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id, this.changedData).then((res) => {

				if(res.meta.status === "success") {
					this.$fhcAlert.alertSuccess(this.$p.t('global/anwUserUpdateSuccess'))
				} else {
					this.$fhcAlert.alertError(this.$p.t('global/errorAnwUserUpdate'))
				}

				// debugger
				// // TODO: update tableData to avoid refetching every anwesenheit
				// changedData.forEach(entry => {
				// 	debugger
				// 	// find studentsData entry and edit
				// 	const sD = this.studentsData.get(entry.prestudent_id)
				// 	sD.status = entry.status
				// 	debugger
				// 	// find tableStudentData entry and edit
				//
				// 	const tSD = this.tableStudentData.find(e => e.prestudent_id === entry.prestudent_id)
				// 	tSD[entry.datum]
				// })

				const changedStudentsArr = [...changedStudents]
				this.$fhcApi.factory.Kontrolle.getAnwQuoteForPrestudentIds(changedStudentsArr, this.$entryParams.lv_id, this.$entryParams.sem_kurzbz)
					.then(res => {
					console.log('getAnwQuoteForPrestudentIds', res)

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
		setTimespanForKontrolle(data) {
			// TODO: rewrite the sql of this to get better formed data
			if(data[0].beginn && data[0].ende) {
				let beginn = new Date('1995-10-16 ' + data[0].beginn)
				let ende = new Date('1995-10-16 ' + data[0].ende)

				data.forEach(entry => {
					const entryBeginn = new Date('1995-10-16 ' + entry.beginn)
					const entryEnde = new Date('1995-10-16 ' + entry.ende)

					if(entryBeginn <= beginn) beginn = entryBeginn
					if(entryEnde >= ende) ende = entryEnde

				})

				// TODO (johann): since we deleted datum and only have von
				//  & bis setting those variables dates correctly is integral for stundenplan lookup
				this.beginn = {hours: beginn.getHours(), minutes: beginn.getMinutes(), seconds: beginn.getSeconds()}
				this.ende = {hours: ende.getHours(), minutes: ende.getMinutes(), seconds: ende.getSeconds()}
			}
		},
		setupLehreinheitAndLektorData(res) {
			console.log('setupLehreinheitAndLektorData', res)

			if(res.meta.status === 'success' && res.data) {
				const viewData = res.data[0]
				// find out von & bis times for lehreinheit
				console.log('viewData', res.data[0])

				this.filterTitle = this.$entryParams.selected_le_info.infoString
				console.log('this.filterTitle', this.filterTitle)

				// todo filter termine in future/past

				res.data?.[1]?.forEach(termin => {
					const dateParts = termin.datum.split( "-")
					termin.datumFrontend = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]
				})

				this.termine = res.data[1] ?? []
				this.$refs.termineDropdown.setTermine(this.termine)

				if(this.termine.length) {
					const termin = this.findClosestTermin();
					console.log('findClosestTermin', termin)

					this.setTimespanForKontrolleTermin(termin, false)

					this.termine.forEach(t => this.dates.push(t.datum))

				} else this.setTimespanForKontrolle(viewData)

			}
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

			console.log('nearestFutureTermin', nearestFutureTermin)
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
				console.log('getAllAnwesenheitenByLva', res)
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

			this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
		},
		openDeleteModal () {
			this.$refs.modalContainerDeleteKontrolle.show()
		},
		async deleteAnwesenheitskontrolle () {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			const date = {year: this.selectedDate.getFullYear(), month: this.selectedDate.getMonth() + 1, day: this.selectedDate.getDate()}

			this.$fhcApi.factory.Kontrolle.deleteAnwesenheitskontrolle(this.$entryParams.selected_le_id, date).then(res => {
				console.log('deleteAnwesenheitskontrolle', res)

				if(res.meta.status === "success" && res.data) {
					this.$fhcAlert.alertSuccess(this.$p.t('global/deleteAnwKontrolleConfirmation'))

					this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.lv_id, this.sem_kurzbz, this.$entryParams.selected_le_id).then((res)=>{
						console.log('getAllAnwesenheitenByLva', res)
						if(res.meta.status !== "success") return
						this.setupData(res.data)
					})
				} else if(res.meta.status === "success" && !res.data){
					this.$fhcAlert.alertWarning(this.$p.t('global/noAnwKontrolleFoundToDelete'))
				}
			})

			this.$refs.modalContainerDeleteKontrolle.hide()

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
				this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status, anwesenheit_user_id: entry.anwesenheit_user_id})

				const datum = entry.datum
				if(this.dates.indexOf(datum) < 0) {
					this.dates.push(datum)
				}
			})
			console.log('dates', this.dates)
		},
		setupData(data, returnData = false) {
			this.students = data[0] ?? []
			const anwEntries = data[1] ?? []
			const stsem = data[2][0] ?? []
			this.entschuldigtStati = data[3] ?? []

			this.studentsData = new Map()

			this.students.forEach(entry => {
				entry.zusatz = this.formatZusatz(entry, stsem)
				this.studentsData.set(entry.prestudent_id, [])
			})
			this.dates = []

			this.setDates(anwEntries)


			// date string formatting
			const selectedDateDBFormatted = formatDateToDbString(this.selectedDate)
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

			console.log('tableStudentData', this.tableStudentData)
			console.log('studentsData', this.studentsData)

			if(returnData) {
				return this.tableStudentData
			} else {
				this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
			}
		},
		maUIDchangedHandler(oldIds) {

			console.log('oldIds', oldIds)
			console.log('newIds', this.$entryParams.available_le_ids)

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
				date = formatDateToDbString(this.selectedDate)
			}

			const arrWrapped = this.studentsData.get(prestudent_id)
			const arr = JSON.parse(JSON.stringify(arrWrapped))
			const found = arr.find(e => e.datum === date)

			const anwesenheit_user_id = found.anwesenheit_user_id

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
			console.log('setup mounted lektor component')
			await this.$entryParams.setupPromise
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
			const date = formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid ?? this.ma_uid
			this.$fhcApi.factory.Info.getLehreinheitAndLektorInfo(this.$entryParams.selected_le_id, ma_uid, date)
				.then(res => this.setupLehreinheitAndLektorData(res));

			this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id).then(res => {
				this.setupData(res.data)
			})

		},
		handleLEChanged () {
			const date = formatDateToDbString(this.selectedDate)
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

		const selectedDateDBFormatted = formatDateToDbString(this.selectedDate)
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
			const selectedDateDBFormatted = formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split( "-")
			const selectedDateFrontendFormatted = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]


			const today = new Date(Date.now())
			this.isAllowedToStartKontrolle = areDatesSame(newVal, today)

			// load stundenplan hours for ma_uid, le_id and selected date
			const date = formatDateToDbString(this.selectedDate)
			const ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid ?? this.ma_uid
			this.$fhcApi.factory.Info.getStundenPlanEntriesForLEandLektorOnDate(this.$entryParams.selected_le_id, ma_uid, date)
				.then(res => {

				if(res?.data?.retval && res?.data?.retval?.length) this.setTimespanForKontrolle(res.data.retval)

			})

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
							<div class="col-2"><label for="beginn" class="form-label col-sm-1">{{ $capitalize($p.t('ui/von')) }}</label></div>
							<div class="col-10">
								<datepicker
									v-model="beginn"
									time-picker="true"
									text-input="true"
									auto-apply="true">
								</datepicker>
							</div>
						</div>
						<div class="row align-items-center mt-4">
							<div class="col-2 align-items-center"><label for="von" class="form-label">{{ $capitalize($p.t('global/bis')) }}</label></div>
							<div class="col-10">
								<datepicker
									v-model="ende"
									time-picker="true"
									text-input="true"
									auto-apply="true">
								</datepicker>
							</div>
						</div>
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
					<template v-slot:title>{{ $p.t('global/zugangscode') }}</template>
					<template v-slot:default>
						
						//todo delete stuff
						
					</template>
					<template v-slot:footer>
						<button type="button" class="btn btn-primary" @click="deleteAnwesenheitskontrolle">{{ $p.t('global/deleteAnwKontrolle') }}</button>
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
					<div class="col-6" style="transform: translateY(-70px)">
						<h1 class="h4 mb-5">{{ filterTitle }}</h1>
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
						<input type="checkbox" @change="handleShowAllToggle" id="all" >
						<label for="all" style="margin-left: 12px;">Show All</label>
					</div>

					
				</div>
				

				
				
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
								Änderungen speichern
							</button>
							
							<button @click="openDeleteModal" role="button" class="btn btn-danger ml-2">
								{{ $p.t('global/deleteAnwKontrolle') }}
							</button>
						</template>
				</core-filter-cmpt>
			</template>
		</core-base-layout>
	</div>`
};

export default LektorComponent
