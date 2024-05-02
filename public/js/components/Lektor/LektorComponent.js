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
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLvaAssignedV2`,
				ajaxResponse: (url, params, response) => {
					console.log('getAllAnwesenheitenByLva', response)
					return this.setupDataV2(response.data, true)
				},
				ajaxConfig: "POST",
				ajaxContentType:{
					headers:{
						'Content-Type': 'application/json'
					},
					body:(url,config,params)=>{
						return JSON.stringify({
							lv_id: this.lv_id, le_ids: [this.$entryParams.selected_le_id], sem_kurzbz: this.sem_kurzbz
						})
					}
				},
				rowHeight: 88, // foto max-height + 2x padding
				index: 'prestudent_id',
				layout: 'fitColumns',
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					// TODO: debug foto column selection/visibility logic
					{title: this.$p.t('global/foto'), field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: true, minWidth: 100, maxWidth: 100, tooltip: false},
					{title: this.$p.t('person/student'), field: 'prestudent_id', visible: false,tooltip:false},
					{title: this.$p.t('person/vorname'), field: 'vorname', headerFilter: true, widthGrow: 1, tooltip:false},
					{title: this.$p.t('person/nachname'), field: 'nachname', headerFilter: true, widthGrow: 1, tooltip:false},
					{title: this.$p.t('lehre/gruppe'), field: 'gruppe', headerFilter: true, widthGrow: 1, tooltip:false},
					{title: this.$p.t('global/datum'), field: 'status', formatter: lektorFormatters.anwesenheitFormatter, hozAlign:"center",widthGrow: 1, tooltip:false},
					{title: this.$p.t('global/summe'), field: 'sum', formatter: lektorFormatters.percentFormatter,widthGrow: 1, tooltip:false},
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
			fotos: [],
			filterTitle: "",
			beginn: null,
			ende: null,
			selectedDate: new Date(Date.now()),
			// selectedDate: new Date('2023-10-02'),
			studentsData: null,
			namesAndID: null,
			tableStudentData: null,
			qr: null,
			url: null,
			code: null,
			timerID: null,
			timerIDPolling: null,
			progressTimerID: null,
			setupPromise: null,
			regenerateProgress: 0,
			progressTimerCalc: 0,
			polling: false,
			checkInCount: 0,
			studentCount: 0,
			internalPermissions: JSON.parse(this.permissions)
		}
	},
	props: {
		permissions: null
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.appSideMenuEntries = payload;
		},
		getExistingQRCode(){

			// TODO: get information of already checked in students as a count
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorGetExistingQRCode',
				{le_ids: [this.$entryParams.selected_le_id], ma_uid: this.ma_uid, date: formatDateToDbString(this.selectedDate)}, null
			).then(res => {
				if(res.data.svg) {
					this.showQR(res.data)
				}
			})
		},
		pollAnwesenheit() {
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorPollAnwesenheiten',
				{anwesenheit_id: this.anwesenheit_id}
			).then(res => {
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
		showQR (data) {
			this.qr = data.svg
			this.url = data.url
			this.code = data.code
			this.checkInCount = data.count
			this.anwesenheit_id = data.anwesenheit_id
			this.$refs.modalContainerQR.show()
			if(this.internalPermissions.useRegenerateQR) this.startRegenerateQR()
			this.startPollingAnwesenheiten()
		},
		getNewQRCode () {
			// js months 0-11, php months 1-12
			const date = {year: this.selectedDate.getFullYear(), month: this.selectedDate.getMonth() + 1, day: this.selectedDate.getDate()}

			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorGetNewQRCode',
				{le_ids: [this.$entryParams.selected_le_id], beginn: this.beginn, ende: this.ende, datum: date}
			).then(res => {
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
			// console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressTimerCalc)
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorRegenerateQRCode',
				{anwesenheit_id: this.anwesenheit_id}
			).then(res => {
				const oldCode = this.code
				this.qr = res.data.svg
				this.url = res.data.url
				this.code = res.data.code
				// console.log('regenerateQR set new QR')
				// console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressTimerCalc)

				//TODO: can wait here

				this.$fhcApi.post(
					'extensions/FHC-Core-Anwesenheiten/Api/lektorDegenerateQRCode',
					{anwesenheit_id: this.anwesenheit_id, zugangscode: oldCode}
				)
			})


		},
		progressCounter() {
			if(this.regenerateProgress >= this.progressTimerCalc) this.regenerateProgress = 0
			this.regenerateProgress++

			// console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressTimerCalc)
		},
		startRegenerateQR() {
			//TODO: interval has certain overhead and is never 100% in sync with actual timer currently
			this.timerID = setInterval(this.boundRegenerateQR, this.internalPermissions.regenerateQRTimer)
			this.progressTimerID = setInterval(this.boundProgressCounter, this.progressTimerInterval) // track time passed for regenerate
		},
		stopRegenerateQR() {
			const oldCode = this.code
			clearInterval(this.timerID)
			this.timerID = null

			clearInterval(this.progressTimerID)
			this.progressTimerID = null

			this.qr = null
			this.url = null
			this.code = null

			// attempt to degenerate one last time to not leave any codes in db
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorDegenerateQRCode',
				{anwesenheit_id: this.anwesenheit_id, zugangscode: oldCode}
			)
		},
		setupLehreinheitAndLektorData(res) {
			console.log('setupLehreinheitAndLektorData', res)
			// TODO: do smth with raum or lektorinfo?

			if(res.meta.status === 'success' && res.data) {
				const data = res.data
				// find out von & bis times for lehreinheit
				this.filterTitle = this.$entryParams.selected_le_info.infoString

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
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLvaAssignedV2',
				{lv_id: this.lv_id, le_ids: [this.$entryParams.selected_le_id], sem_kurzbz: this.sem_kurzbz}
			).then(res => {
				console.log('getAllAnwesenheitenByLva', res)
				if(res.meta.status !== "success") return
				this.setupDataV2(res.data)
			})

			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorDeleteQRCode',
				{le_ids: [this.$entryParams.selected_le_id], anwesenheit_id: this.anwesenheit_id}
			).then(
				res => {
					if(res.meta.status === "success" && res.data) {
						this.$fhcAlert.alertSuccess(this.$p.t('global/anwKontrolleBeendet'))
					} else {
						this.$fhcAlert.alertError(this.$p.t('global/errorDeleteQRCode'))
					}

					if(this.internalPermissions.useRegenerateQR) this.stopRegenerateQR()
				}
			)
		},
		async deleteAnwesenheitskontrolle () {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			const date = {year: this.selectedDate.getFullYear(), month: this.selectedDate.getMonth() + 1, day: this.selectedDate.getDate()}

			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorDeleteAnwesenheitskontrolle',
				{le_ids: [this.$entryParams.selected_le_id], date: date}
			).then(res => {
				console.log('deleteAnwesenheitskontrolle', res)

				if(res.meta.status === "success" && res.data) {
					this.$fhcAlert.alertSuccess(this.$p.t('global/deleteAnwKontrolleConfirmation'))

					this.$fhcApi.post(
						'extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLvaAssignedV2',
						{lv_id: this.lv_id, le_ids: [this.$entryParams.selected_le_id], sem_kurzbz: this.sem_kurzbz}
					).then((res)=>{
						console.log('getAllAnwesenheitenByLva', res)
						if(res.meta.status !== "success") return
						this.setupDataV2(res.data)
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
		setupDataV2(data, returnData = false) {
			const students = data[0]
			const anwEntries = data[1]
			const stsem = data[2][0]

			this.studentsData = new Map()

			students.forEach(entry => {
				entry.zusatz = this.formatZusatz(entry, stsem)
				this.studentsData.set(entry.prestudent_id, [])
			})

			anwEntries.forEach(entry => {
				this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status})
			})

			// date string formatting
			const selectedDateDBFormatted = formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split( "-")
			const selectedDateFrontendFormatted = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]
			this.$refs.anwesenheitenTable.tabulator.updateColumnDefinition("status", {title: selectedDateFrontendFormatted})

			this.tableStudentData = []
			this.studentCount = students.length
			students.forEach(student => {

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

			if(returnData) {
				return this.tableStudentData
			} else {
				this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
			}
		},
		async setupData(dataParam, returnData = false){

			const data = dataParam[0].retval
			const stsem = dataParam[1].retval[0]

			this.studentsData = new Map()
			this.namesAndID = []
			// retrieve students from anwesenheiten data and gather their entries
			data.forEach(entry => {

				if(!this.studentsData.has(entry.prestudent_id)) {
					this.studentsData.set(entry.prestudent_id, [])
					if(entry.status && entry.datum) this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status})
					this.namesAndID.push({
						prestudent_id: entry.prestudent_id, vorname: entry.vorname, nachname: entry.nachname, sum: entry.sum,
						semester: entry.semester, verband: entry.verband, gruppe: entry.gruppe,
						zusatz: this.formatZusatz(entry, stsem)
					})
				} else {
					this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status})
				}
			})

			// date string formatting
			const selectedDateDBFormatted = formatDateToDbString(this.selectedDate)
			const dateParts = selectedDateDBFormatted.split( "-")
			const selectedDateFrontendFormatted = dateParts[2] + '.'+ dateParts[1] + '.' + dateParts[0]
			this.$refs.anwesenheitenTable.tabulator.updateColumnDefinition("status", {title: selectedDateFrontendFormatted})

			this.tableStudentData = []
			this.studentCount = this.namesAndID.length
			this.namesAndID.forEach((student, index) => {

				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateDBFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'

				const nachname = student.nachname + student.zusatz
				this.tableStudentData.push({prestudent_id: student.prestudent_id,
					// TODO: test for cases where no foto was available
					foto: returnData ? '' : this.fotos.find(entry => entry.prestudent_id === student.prestudent_id).foto,
					vorname: student.vorname,
					nachname: nachname,
					gruppe: student.semester + student.verband + student.gruppe,
					status: status ?? '-',
					sum: student.sum});
			})

			if(returnData) {
				await this.fetchStudentPictures()
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
		async fetchStudentPictures () {
			const prom = new Promise((resolve, reject) => {
				const ids = this.namesAndID.map(el => el.prestudent_id)

				this.$fhcApi.post(
					'extensions/FHC-Core-Anwesenheiten/Api/infoGetPicturesForPrestudentIds',
					{prestudent_ids: ids}
				).then(
					(res) => {
						this.fotos = res.data.retval
						this.tableStudentData.forEach(data => {
							data.foto = res.data.retval.find(entry => entry.prestudent_id === data.prestudent_id).foto
						})

						resolve()
					}
				)
			})

			return prom
		}
	},
	created(){
		this.lv_id = this.$entryParams.lv_id
		this.sem_kurzbz = this.$entryParams.sem_kurzbz
		this.ma_uid = this.internalPermissions.authID

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
		this.progressTimerCalc = this.internalPermissions.regenerateQRTimer / 10
		// which is called in an interval
		this.progressTimerInterval = 10
		// console.log('regenerateQRTimer: ' + this.internalPermissions.regenerateQRTimer)
		// console.log('progressTimerCalc: ' + this.progressTimerCalc)
		// console.log('progressTimerInterval: ' + this.progressTimerInterval)

		// see if test is still running
		this.getExistingQRCode()

		// fetch LE data
		this.$fhcApi.post(
			'extensions/FHC-Core-Anwesenheiten/Api/infoGetLehreinheitAndLektorInfo',
			{le_ids: [this.$entryParams.selected_le_id], ma_uid: this.ma_uid, date: formatDateToDbString(this.selectedDate)}
		).then(res => this.setupLehreinheitAndLektorData(res));

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
			this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status').title = selectedDateFrontendFormatted

				this.namesAndID.forEach((student, index) => {
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
						<div class="row align-items-center">
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
								v-if="internalPermissions && internalPermissions.useRegenerateQR"
								:max="progressTimerCalc"
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
					:newBtnDisabled=qr
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
							<div class="row justify-content-end">
								<button @click="deleteAnwesenheitskontrolle" role="button" class="btn btn-danger ml-2">
									{{ $p.t('global/deleteAnwKontrolle') }}
								</button>
							</div>
						</div>
						</template>
					
				</core-filter-cmpt>
			</template>
		</core-base-layout>
	</div>`
};
