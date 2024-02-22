import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';

import { anwesenheitFormatter } from "../../mixins/formatters";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';

import verticalsplit from "../../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../../js/components/searchbar/searchbar.js";

export default {
	name: 'LektorComponent',
	components: {
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
				height: func_height(),
				index: 'prestudent_id',
				layout: 'fitColumns',
				placeholder: "Keine Daten verfügbar",
				columns: [
					{title: 'Prestudent ID', field: 'prestudent_id', visible: false},
					{title: 'Vorname', field: 'vorname', headerFilter: true},
					{title: 'Nachname', field: 'nachname', headerFilter: true},
					{title: 'Aktuelles Datum', field: 'status', formatter: anwesenheitFormatter},
					{title: 'Summe', field: 'sum'},
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
			tableData: [],
			// TODO: get these via get parameter into properties
			ma_uid: 'ma0144',
			sem_kurzbz: 'WS2023',
			lv_id: '38733',
			le_id: '138879',
			filterTitle: "Anwesenheiten",
			beginn: null,
			ende: null,
			// selectedDate: new Date(Date.now()),
			selectedDate: new Date('2023-10-02'),
			studentsData: null,
			datesData: null,
			namesAndID: null,
			tableStudentData: null,
			qr: null,
			url: null,
			code: null
		}
	},
	props: {
		students: [],
		dates: [],
		parameters: [],
		// ma_uid: null,
		// sem_kurzbz: null,
		// lv_id: null
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.appSideMenuEntries = payload;
		},
		searchfunction: function(searchsettings) {
			return Vue.$fhcapi.Search.search(searchsettings);
		},
		searchfunctiondummy: function(searchsettings) {
			return Vue.$fhcapi.Search.searchdummy(searchsettings);
		},
		getExistingQRCode(){
			Vue.$fhcapi.Anwesenheit.getExistingQRCode(this.le_id).then(
				res => {
					if(res?.data?.retval?.svg) {
						this.qr = res.data.retval.svg
						this.url = res.data.retval.url
						this.code = res.data.retval.code

						this.$refs.modalContainer.show()
					}
				}
			)
		},
		getNewQRCode () {

			Vue.$fhcapi.Anwesenheit.getNewQRCode(this.le_id, this.beginn, this.ende).then(
				res => {

					if(res && res.data && res.data.retval) {
						this.qr = res.data.retval.svg
						this.url = res.data.retval.url
						this.code = res.data.retval.code

						this.$refs.modalContainer.show()
					}
				}
			)
		},
		setupLehreinheitAndLektorData(res) {
			console.log('setupLehreinheitAndLektorData', res)
			// TODO: do smth with raum or lektorinfo?

			if(res && res.data && res.data.retval) {
				// find out von & bis times for lehreinheit

				// TODO: maybe handle this more elegantly
				this.filterTitle = res.data.retval[0].bezeichnung + " (" +res.data.retval[0].kurzbz+ ")"

				let beginn = new Date('1995-10-16 ' + res.data.retval[0].beginn)
				let ende = new Date('1995-10-16 ' + res.data.retval[0].ende)

				res.data.retval.forEach(entry => {
					const entryBeginn = new Date('1995-10-16 ' + entry.beginn)
					const entryEnde = new Date('1995-10-16 ' + entry.ende)

					if(entryBeginn <= beginn) beginn = entryBeginn
					if(entryEnde >= ende) ende = entryEnde

				})

				this.beginn = {hours: beginn.getHours(), minutes: beginn.getMinutes(), seconds: beginn.getSeconds()}
				this.ende = {hours: ende.getHours(), minutes: ende.getMinutes(), seconds: ende.getSeconds()}

			}
		},
		startNewAnwesenheitskontrolle(){
			// TODO: VALIDATE IF BEGINN AND ENDE ARE SET

			this.qr = '' // indirectly set start button disabled

			// fetch some data from stundenplan what should be happening rn
			// if there is no stundenplan entry enter some hours of anwesenheit?

			this.getNewQRCode()
		},
		stopAnwesenheitskontrolle () {
			this.$refs.modalContainer.hide()

			this.qr = null
			this.url = null
			this.code = null

			Vue.$fhcapi.Anwesenheit.deleteQRCode(this.le_id).then(
				res => {

					if(res && res.status === 200) {
						this.$fhcAlert.alertSuccess("Anwesenheitskontrolle erfolgreich terminiert.")
					} else {
						this.$fhcAlert.alertError("Something went terribly wrong with deleting the Anwesenheitskontrolle.")
					}
				}
			)
		},

	},
	created(){
		const selectedDateFormatted = formatDate(this.selectedDate)
		const found = this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status')
		found.title = selectedDateFormatted
	},
	mounted() {

		// see if test is still running
		this.getExistingQRCode()

		// fetch LE data
		Vue.$fhcapi.Info.getLehreinheitAndLektorData(this.le_id, this.ma_uid, formatDate(this.selectedDate))
			.then(res => this.setupLehreinheitAndLektorData(res));

		// fetch table data
		Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByLektor(this.ma_uid, this.lv_id, this.sem_kurzbz, this.selectedDate).then((res)=>{
			console.log('getAllAnwesenheitenByLektor', res)
			if(!res.data || !res.data.retval) return

			this.studentsData = new Map()
			this.datesData = new Set()
			this.namesAndID = []
			res.data.retval.forEach(entry => {

				if(!this.datesData.has(entry.von)) this.datesData.add(entry.von)

				if(!this.studentsData.has(entry.prestudent_id)) {
					this.studentsData.set(entry.prestudent_id, [{datum: entry.von, status: entry.status}])
					this.namesAndID.push({prestudent_id: entry.prestudent_id, vorname: entry.vorname, nachname: entry.nachname, sum: entry.sum})
				} else {
					this.studentsData.get(entry.prestudent_id).push({datum: entry.von, status: entry.status})
				}
			})

			this.tableStudentData = []
			const selectedDateFormatted = formatDate(this.selectedDate)
			this.namesAndID.forEach((student, index) => {

				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'

				this.tableStudentData.push({prestudent_id: student.prestudent_id,
					vorname: student.vorname,
					nachname: student.nachname,
					status: status ?? '-',
					sum: student.sum});
			})

			console.log([...this.namesAndID])

			this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
			this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
		})
	},
	updated(){
	},
	watch: {
		selectedDate(newVal) {

			const selectedDateFormatted = formatDate(newVal)
			this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'status').title = selectedDateFormatted

				this.namesAndID.forEach((student, index) => {
					const studentDataEntry = this.studentsData.get(student.prestudent_id)
					const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateFormatted)
					const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'

					const foundEntry = this.tableStudentData.find(entry => entry.prestudent_id === student.prestudent_id)
					console.log(foundEntry.stat)
					foundEntry.status = status
			})
			this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
			this.$refs.anwesenheitenTable.tabulator.setData([...this.tableStudentData]);
		}
	},
	template:`
	
		<core-navigation-cmpt 
			v-bind:add-side-menu-entries="appSideMenuEntries"
			v-bind:add-header-menu-entries="headerMenuEntries">	
		</core-navigation-cmpt>
		
		<div id="content">
			<div class="row">
			
				<bs-modal ref="modalContainer" class="bootstrap-prompt" backdrop="static" 
				dialogClass="modal-lg" :keyboard=false noCloseBtn=true>
					<template v-slot:title>Anwesenheiten QR</template>
					<template v-slot:default>
						<p>URL: {{url}}</p>
						<p>Code: {{code}}</p>
						<div v-html="qr" class="text-center"></div>
					</template>
					<template v-slot:footer>
						<button type="button" class="btn btn-primary" @click="stopAnwesenheitskontrolle">Anwesenheitskontrolle beenden</button>
					</template>
				</bs-modal>
				
				<div class="col-8">
					<core-filter-cmpt
						:title="filterTitle"
						ref="anwesenheitenTable"
						:tabulator-options="anwesenheitenTabulatorOptions"
						:tabulator-events="anwesenheitenTabulatorEventHandlers"
						:id-field="'anwesenheiten_id'"
						@nw-new-entry="newSideMenuEntryHandler"
						:tableOnly
						:sideMenu="false" 
						noColumnFilter>
					</core-filter-cmpt>
					<div class="d-flex justify-content-end align-items-end mt-3">
						<datepicker
							v-model="beginn"
							time-picker="true"
							text-input="true"
							auto-apply="true">
						</datepicker>
						<datepicker
							v-model="ende"
							time-picker="true"
							text-input="true"
							auto-apply="true">
						</datepicker>	
						<button @click="startNewAnwesenheitskontrolle" role="button" class="btn btn-primary align-self-end" :disabled=qr>
							Neue Anwesenheitskontrolle starten 
						</button>
					</div>
					
				</div>
				<div class="col-2">
					<datepicker
						v-model="selectedDate"
						locale="de"
						format="dd-MM-yyyy"
						text-input="true"
						auto-apply="true">
					</datepicker>		
				</div>
				
			</div>
		</div>
	</div>`
};
