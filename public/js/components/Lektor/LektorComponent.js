import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

import { lektorFormatters } from "../../mixins/formatters";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';

import verticalsplit from "../../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../../js/components/searchbar/searchbar.js";

export default {
	name: 'LektorComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		CoreNavigationCmpt,
		BsModal,
		"datepicker": VueDatePicker,
		verticalsplit: verticalsplit,
		searchbar: searchbar
	},
	data() {
		return {
			appSideMenuEntries: {},
			headerMenuEntries: {},
			anwesenheitenTabulatorOptions: {
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+`/extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByLvaAssigned`,
				ajaxResponse: (url, params, response) => {
					console.log('getAllAnwesenheitenByLva', response)
					return this.setupData(response.data, true)
				},
				ajaxConfig: "POST",
				ajaxContentType:{
					headers:{
						'Content-Type': 'application/json'
					},
					body:(url,config,params)=>{
						return JSON.stringify({
							lv_id: this.lv_id, le_id: this.$entryParams.selected_le_id, sem_kurzbz: this.sem_kurzbz
						})
					}
				},
				rowHeight: 88, // foto max-height + 2x padding
				height: false,
				index: 'prestudent_id',
				layout: 'fitColumns',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					// TODO: debug foto column selection/visibility logic
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
				event: "rowClick",
				handler: (e, row) => {
					const prestudent_id = Reflect.get(row.getData(), 'prestudent_id')

					this.$router.push({
						name: 'StudentByLva',
						params: {id: prestudent_id, lv_id: this.lv_id, sem_kz: this.sem_kurzbz}
					})
				}
			}],
			boundRegenerateQR: null,
			boundProgressCounter: null,
			ma_uid: null,
			sem_kurzbz: null,
			lv_id: null,
			dates: [],
			filterTitle: "",
			beginn: null,
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
		setTimespanForKontrolle(data) {
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
			// TODO: do smth with raum or lektorinfo?

			if(res.meta.status === 'success' && res.data) {
				const data = res.data
				// find out von & bis times for lehreinheit
				this.filterTitle = this.$entryParams.selected_le_info.infoString

				this.setTimespanForKontrolle(data)

			}
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
		setupData(data, returnData = false) {
			this.students = data[0] ?? []
			const anwEntries = data[1] ?? []
			const stsem = data[2][0] ?? []

			this.studentsData = new Map()

			this.students.forEach(entry => {
				entry.zusatz = this.formatZusatz(entry, stsem)
				this.studentsData.set(entry.prestudent_id, [])
			})
			this.dates = []

			anwEntries.forEach(entry => {
				this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status})

				const datum = entry.datum
				if(this.dates.indexOf(datum) < 0) {
					this.dates.push(datum)
				}
			})
			console.log('dates', this.dates)
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

				const nachname = student.nachname + student.zusatz
				this.tableStudentData.push({prestudent_id: student.prestudent_id,
					foto: student.foto,
					vorname: student.vorname,
					nachname: nachname,
					gruppe: student.semester + student.verband + student.gruppe,
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
		openNewAnwesenheitskontrolleModal(){
			this.$refs.modalContainerNewKontrolle.show()
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

	},
	unmounted(){
		// anwesenheitskontrolle could be active
		this.stopPollingAnwesenheiten()
	},
	updated(){
	},
	watch: {
		selectedDate(newVal) {

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
				console.log(res)

				// TODO: FIND SOMETHING IN STUNDEPLAN TO TEST WITH AND SET KONTROLLE BEGINN END LIKE IN MOUNTED LE INFO METHOD

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
					
		<row>
			<button class="btn btn-outline-secondary" @click="routeToLandingPage"><a><i class="fa fa-chevron-left"></i></a></button>
		</row>
					
		<core-base-layout
			:title="filterTitle">			
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
					</template>
					<template v-slot:footer>
						<button type="button" class="btn btn-primary" @click="startNewAnwesenheitskontrolle">{{ $p.t('global/neueAnwKontrolle') }}</button>
					</template>
				</bs-modal>
				
				<bs-modal ref="modalContainerQR" class="bootstrap-prompt" backdrop="static" 
				dialogClass="modal-lg" :keyboard=false noCloseBtn=true>
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
							<div class="row">
								<div class="col-2 d-flex align-items-center"><label for="datum" class="form-label col-sm-1">{{ $p.t('global/datum') }}</label></div>
								<div class="col-9">
									<datepicker
										v-model="selectedDate"
										locale="de"
										format="dd.MM.yyyy"
										text-input="true"
										auto-apply="true">
									</datepicker>
								</div>
							</div>
							<div class="col-6">
								<div class="row justify-content-end">
									<button @click="deleteAnwesenheitskontrolle" role="button" class="btn btn-danger ml-2">
										{{ $p.t('global/deleteAnwKontrolle') }}
									</button>
								</div>
							</div>
							<div class="col-6">
								<div class="row justify-content-end">
									<button @click="showAll" role="button" class="btn btn-secondary ml-2">
										{{showAllVar ? 'Einen Termin anzeigen' : 'Alle Termine anzeigen'}}
									</button>
								</div>
							</div>
							
							
						</template>
					
				</core-filter-cmpt>
			</template>
		</core-base-layout>
	</div>`
};
