import {CoreFilterCmpt} from '../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../js/components/navigation/Navigation.js';

import verticalsplit from "../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../js/components/searchbar/searchbar.js";

export default {
	name: 'LektorComponent',
	components: {
		CoreFilterCmpt,
		CoreNavigationCmpt,
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
				columns: [
					{title: 'Prestudent ID', field: 'prestudent_id', visible: false},
					{title: 'Vorname', field: 'vorname', headerFilter: true},
					{title: 'Nachname', field: 'nachname', headerFilter: true},
					{title: 'Aktuelles Datum', field: 'datum', headerFilter: true},
					{title: 'Summe', field: 'sum', headerFilter: true},
				]
			},
			anwesenheitenTabulatorEventHandlers: [{
				event: "rowClick",
				handler: (e, row) => {
					const prestudent_id = Reflect.get(row.getData(), 'prestudent_id')

					// this.$router.push({
					// 	name: 'StudentByLva',
					// 	params: {id: prestudent_id, lv_id: this.lv_id, sem_kz: this.sem_kurzbz}
					// })
					this.$router.push({
						name: 'StudentByLva',
						params: {id: prestudent_id, lv_id: this.lv_id, sem_kz: this.sem_kurzbz}
					})
				}
			}],
			tableData: [],
			ma_uid: 'ma0144',
			sem_kurzbz: 'WS2023',
			lv_id: '38733',
			selectedDate: new Date('2023-10-09'), // formatDate(new Date()),
			studentsData: null,
			datesData: null,
			namesAndID: null,
			tableStudentData: null
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
		startNewAnwesenheitskontrolle(){
			// TODO: QR code magic
		}

	},
	created(){
		const selectedDateFormatted = formatDate(this.selectedDate)
		this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'datum').title = selectedDateFormatted
	},
	mounted() {


		Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByLektor(this.ma_uid, this.lv_id, this.sem_kurzbz, this.selectedDate).then((res)=>{
			if(!res.data)return

			this.studentsData = new Map()
			this.datesData = new Set()
			this.namesAndID = []
			res.data.retval.forEach(entry => {

				if(!this.datesData.has(entry.date)) this.datesData.add(entry.date)

				if(!this.studentsData.has(entry.prestudent_id)) {
					this.studentsData.set(entry.prestudent_id, [{datum: entry.date, status: entry.status}])
					this.namesAndID.push({prestudent_id: entry.prestudent_id, vorname: entry.vorname, nachname: entry.nachname, sum: entry.sum})
				} else {
					this.studentsData.get(entry.prestudent_id).push({datum: entry.date, status: entry.status})
				}
			})

			this.tableStudentData = []
			const selectedDateFormatted = formatDate(this.selectedDate)
			this.namesAndID.forEach(student => {
				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum') === selectedDateFormatted)
				const status = Reflect.get(anwesenheit, 'status')

				this.tableStudentData.push({prestudent_id: student.prestudent_id,
					vorname: student.vorname,
					nachname: student.nachname,
					datum: status ?? '-',
					sum: student.sum});
			})

			this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
			this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
		})
	},
	updated(){
	},
	watch: {
		selectedDate(newVal) {


			const selectedDateFormatted = formatDate(newVal)
			this.anwesenheitenTabulatorOptions.columns.find(col => col.field === 'datum').title = selectedDateFormatted

				this.namesAndID.forEach(student => {
				const studentDataEntry = this.studentsData.get(student.prestudent_id)
				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum')=== selectedDateFormatted)
				const status = anwesenheit ? Reflect.get(anwesenheit, 'status') : '-'
				this.tableStudentData.find(entry => entry.prestudent_id === student.prestudent_id).datum = status
			})

			this.$refs.anwesenheitenTable.tabulator.setColumns(this.anwesenheitenTabulatorOptions.columns)
			this.$refs.anwesenheitenTable.tabulator.setData(this.tableStudentData);
		}
	},

	template:`
	
		<core-navigation-cmpt 
			v-bind:add-side-menu-entries="appSideMenuEntries"
			v-bind:add-header-menu-entries="headerMenuEntries">	
		</core-navigation-cmpt>
		
		<div id="content">
			<div class="row">
				<div class="col-8">
					<core-filter-cmpt
						title="Anwesenheiten Viewer"
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
						<button @click="startNewAnwesenheitskontrolle" role="button" class="btn btn-primary align-self-end">
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