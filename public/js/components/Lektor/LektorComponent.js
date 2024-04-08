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
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLva`,
				ajaxResponse: (url, params, response) => {
					console.log('getAllAnwesenheitenByLva', response)
					return this.setupData(response.data.retval, true)
				},
				ajaxConfig: "POST",
				ajaxContentType:{
					headers:{
						'Content-Type': 'application/json'
					},
					body:(url,config,params)=>{
						return JSON.stringify({
							lv_id: this.lv_id, le_ids: this.le_ids, sem_kurzbz: this.sem_kurzbz
						})
					}
				},
				rowHeight: 88, // foto max-height + 2x padding
				index: 'prestudent_id',
				layout: 'fitColumns',
				placeholder: "Keine Daten verfügbar",
				columns: [
					// TODO: debug foto column selection/visibility logic
					{title: 'Foto', field: 'foto', formatter: lektorFormatters.fotoFormatter, visible: false, minWidth: 100, maxWidth: 100, tooltip: false},
					{title: 'Prestudent ID', field: 'prestudent_id', visible: false},
					{title: 'Vorname', field: 'vorname', headerFilter: true, widthGrow: 1, minWidth: 150},
					{title: 'Nachname', field: 'nachname', headerFilter: true, widthGrow: 1, minWidth: 150},
					{title: 'Gruppe', field: 'gruppe', headerFilter: true, widthGrow: 1, minWidth: 150},
					{title: 'Aktuelles Datum', field: 'status', formatter: lektorFormatters.anwesenheitFormatter, hozAlign:"center",widthGrow: 1, minWidth: 150},
					{title: 'Summe', field: 'sum', formatter: lektorFormatters.percentFormatter,widthGrow: 1, minWidth: 150},
				]
			},
			anwesenheitenTabulatorEventHandlers: [{
				event: "rowClick",
				handler: (e, row) => {
					// TODO (johann): detect if rowclick was on name columns, else dont route or do smth else

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
			le_ids: [],
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
			progressTimerID: null,
			setupPromise: null,
			regenerateProgress: 0,
			progressTimerCalc: 0,
			internalPermissions: JSON.parse(this.permissions)
		}
	},
	props: {
		students: [],
		dates: [],
		parameters: [],
		// ma_uid: null,
		// sem_kurzbz: null,
		// lv_id: null,
		permissions: null
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.appSideMenuEntries = payload;
		},
		getExistingQRCode(){
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorGetExistingQRCode',
				{le_ids: this.le_ids, ma_uid: this.ma_uid, date: formatDateToDbString(this.selectedDate)}, null
			).then(res => {
				console.log('getExistingQr', res)
				if(res.data.svg) {
					this.showQR(res.data)
				}
			})
		},
		showQR (data) {
			this.qr = data.svg
			this.url = data.url
			this.code = data.code
			this.anwesenheit_id = data.anwesenheit_id
			this.$refs.modalContainerQR.show()
			if(this.internalPermissions.useRegenerateQR) this.startRegenerateQR()
		},
		getNewQRCode () {
			// js months 0-11, php months 1-12
			const date = {year: this.selectedDate.getFullYear(), month: this.selectedDate.getMonth() + 1, day: this.selectedDate.getDate()}

			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorGetNewQRCode',
				{le_ids: this.le_ids, beginn: this.beginn, ende: this.ende, datum: date}
			).then(res => {
				if(res.data) {
					this.$refs.modalContainerNewKontrolle.hide()
					this.showQR(res.data)
				}
			}).catch(err => {
				this.$fhcAlert.alertError("Fehler beim dem Versuch eine neue Anwesenheitskontrolle zu starten")
				this.$refs.modalContainerNewKontrolle.hide()
			})

		},
		regenerateQR() {

			console.log('regenerateQR')
			console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressTimerCalc)
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorRegenerateQRCode',
				{anwesenheit_id: this.anwesenheit_id}
			).then(res => {
				const oldCode = this.code
				this.qr = res.data.svg
				this.url = res.data.url
				this.code = res.data.code
				console.log('regenerateQR set new QR')
				console.log('current Progress: ' + this.regenerateProgress + ' from ' + this.progressTimerCalc)

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
				if(data[0].bezeichnung && data[0].kurzbz) this.filterTitle = data[0].bezeichnung + " (" + data[0].kurzbz + ")"

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
				this.$fhcAlert.alertError("Beginn und Ende der Anwesenheitskontrolle müssen gesetzt sein!")
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

			this.qr = null
			this.url = null
			this.code = null

			// TODO: maybe only fetch new entries and merge
			// fetch table data
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLva',
				{lv_id: this.lv_id, le_ids: this.le_ids, sem_kurzbz: this.sem_kurzbz}
			).then(res => {
				console.log('getAllAnwesenheitenByLva', res)
				if(res.meta.status !== "success") return
				this.setupData(res.data.retval)
			})

			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/lektorDeleteQRCode',
				{le_ids: this.le_ids, anwesenheit_id: this.anwesenheit_id}
			).then(
				res => {
					if(res.meta.status === "success" && res.data) {
						this.$fhcAlert.alertSuccess("Anwesenheitskontrolle erfolgreich terminiert.")
					} else {
						this.$fhcAlert.alertError("Something went terribly wrong with deleting the Anwesenheitskontrolle QR Code.")
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
				{le_ids: this.le_ids, date: date}
			).then(res => {
				console.log('deleteAnwesenheitskontrolle', res)

				if(res.meta.status === "success" && res.data) {
					this.$fhcAlert.alertSuccess("Anwesenheitskontrolle erfolgreich gelöscht.")

					this.$fhcApi.post(
						'extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLva',
						{lv_id: this.lv_id, le_ids: this.le_ids, sem_kurzbz: this.sem_kurzbz}
					).then((res)=>{
						console.log('getAllAnwesenheitenByLva', res)
						if(res.meta.status !== "success") return
						this.setupData(res.data)
					})
				} else if(res.meta.status === "success" && !res.data){
					this.$fhcAlert.alertWarning("Keine Anwesenheitskontrolle gefunden zu löschen!")
				}
			})

		},
		async setupData(data, returnData = false){
			// TODO: remove date string logic from this method


			this.studentsData = new Map()
			this.namesAndID = []
			data.forEach(entry => {

				if(!this.studentsData.has(entry.prestudent_id)) {
					this.studentsData.set(entry.prestudent_id, [])
					if(entry.status && entry.datum) this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status})
					this.namesAndID.push({
						prestudent_id: entry.prestudent_id, vorname: entry.vorname, nachname: entry.nachname, sum: entry.sum,
						semester: entry.semester, verband: entry.verband, gruppe: entry.gruppe
					})
				} else {
					this.studentsData.get(entry.prestudent_id).push({datum: entry.datum, status: entry.status})
				}
			})

			this.tableStudentData = []
			const selectedDateFormatted = formatDateToDbString(this.selectedDate)
			this.$refs.anwesenheitenTable.tabulator.updateColumnDefinition("status", {title: selectedDateFormatted})


			this.namesAndID.forEach((student, index) => {

				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'


				this.tableStudentData.push({prestudent_id: student.prestudent_id,
					// TODO: test for cases where no foto was available
					foto: returnData ? '' : this.fotos.find(entry => entry.prestudent_id === student.prestudent_id).foto,
					vorname: student.vorname,
					nachname: student.nachname,
					gruppe: student.semester + student.verband + student.gruppe,
					status: status ?? '-',
					sum: student.sum});
			})

			console.log('names and id', this.namesAndID)

			if(returnData) {
				await this.fetchStudentPictures()
				return this.tableStudentData
			} else {
				// this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
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
				this.$fhcAlert.alertError('Das Enddatum muss nach dem Startdatum liegen.');
				return false
			}

			return true;
		},
		async fetchStudentPictures () {
			const prom = new Promise((resolve, reject) => {
				const ids = this.namesAndID.map(el => el.prestudent_id)
				console.log('mapped ids', ids)

				this.$fhcApi.post(
					'extensions/FHC-Core-Anwesenheiten/Api/infoGetPicturesForPrestudentIds',
					{prestudent_ids: ids}
				).then(
					(res) => {
						this.fotos = res.data.retval
						console.log('getPicturesForPrestudentIds RES', res)
						console.log('this.tableStudentData', this.tableStudentData)
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
		this.lv_id = this._.root.appContext.config.globalProperties.$entryParams.lv_id
		this.sem_kurzbz = this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
		this.ma_uid = this.internalPermissions.authID


		const selectedDateFormatted = formatDateToDbString(this.selectedDate)
		const found = this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status')
		found.title = selectedDateFormatted
	},
	mounted() {
		this.le_ids = this._.root.appContext.config.globalProperties.$entryParams.le_ids

		this.boundRegenerateQR = this.regenerateQR.bind(this)
		this.boundProgressCounter = this.progressCounter.bind(this)

		// ceiling to check for inside progress calc
		this.progressTimerCalc = this.internalPermissions.regenerateQRTimer / 10
		// which is called in an interval
		this.progressTimerInterval = 10
		console.log('regenerateQRTimer: ' + this.internalPermissions.regenerateQRTimer)
		console.log('progressTimerCalc: ' + this.progressTimerCalc)
		console.log('progressTimerInterval: ' + this.progressTimerInterval)

		// see if test is still running
		this.getExistingQRCode()

		// fetch LE data
		this.$fhcApi.post(
			'extensions/FHC-Core-Anwesenheiten/Api/infoGetLehreinheitAndLektorInfo',
			{le_ids: this.le_ids, ma_uid: this.ma_uid, date: formatDateToDbString(this.selectedDate)}
		).then(res => this.setupLehreinheitAndLektorData(res));

	},
	updated(){
	},
	watch: {
		selectedDate(newVal) {

			const selectedDateFormatted = formatDateToDbString(newVal)
			this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status').title = selectedDateFormatted

				this.namesAndID.forEach((student, index) => {
					const studentDataEntry = this.studentsData.get(student.prestudent_id)
					const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateFormatted)
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
					<template v-slot:title>Anwesenheitskontrolle starten</template>
					<template v-slot:default>
						<div class="row align-items-center">
							<div class="col-2"><label for="beginn" class="form-label col-sm-1">Von</label></div>
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
							<div class="col-2 align-items-center"><label for="von" class="form-label">Bis</label></div>
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
						<button type="button" class="btn btn-primary" @click="startNewAnwesenheitskontrolle">Anwesenheitskontrolle starten</button>
					</template>
				</bs-modal>
				
				<bs-modal ref="modalContainerQR" class="bootstrap-prompt" backdrop="static" 
				dialogClass="modal-lg" :keyboard=false noCloseBtn=true>
					<template v-slot:title>Anwesenheitskontrolle</template>
					<template v-slot:default>
						<h1 class="text-center">Code: {{code}}</h1>
						<div v-html="qr" class="text-center"></div>
						<div class="row" style="width: 80%; margin-left: 10%;">
							
								<progress 
									v-if="internalPermissions && internalPermissions.useRegenerateQR"
									:max="progressTimerCalc"
									:value="regenerateProgress">
								</progress>
						</div>
					</template>
					<template v-slot:footer>
						<button type="button" class="btn btn-primary" @click="stopAnwesenheitskontrolle">Anwesenheitskontrolle beenden</button>
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
					newBtnLabel="Neue Anwesenheitskontrolle starten"
					:newBtnDisabled=qr
					@click:new=openNewAnwesenheitskontrolleModal
					:sideMenu="false"
					noColumnFilter>
						<template #actions>
							<div class="row">
								<div class="col-2 d-flex align-items-center"><label for="datum" class="form-label col-sm-1">Datum</label></div>
								<div class="col-9">
									<datepicker
										v-model="selectedDate"
										locale="de"
										format="dd-MM-yyyy"
										text-input="true"
										auto-apply="true">
									</datepicker>
								</div>
							</div>
							<div class="row justify-content-end">
								<button @click="deleteAnwesenheitskontrolle" role="button" class="btn btn-danger ml-2">
									Anwesenheitskontrolle löschen 
								</button>
							</div>
						</div>
						</template>
					
				</core-filter-cmpt>
			</template>
		</core-base-layout>
	</div>`
};
