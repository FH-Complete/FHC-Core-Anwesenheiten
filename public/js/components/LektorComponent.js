import {CoreFilterCmpt} from '../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../js/components/navigation/Navigation.js';

import verticalsplit from "../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../js/components/searchbar/searchbar.js";

import {AnwesenheitenTabulatorOptions} from '../components/TabulatorSetup.js';
import {AnwesenheitenTabulatorEventHandlers} from '../components/TabulatorSetup.js';

export default {

	components: {
		CoreFilterCmpt,
		CoreNavigationCmpt,
		"datepicker": VueDatePicker,
		verticalsplit: verticalsplit,
		searchbar: searchbar
	},
	data() {
		return {
			leCount: 0,
			appSideMenuEntries: {},
			headerMenuEntries: {},
			anwesenheitenTabulatorOptions: AnwesenheitenTabulatorOptions,
			anwesenheitenTabulatorEventHandlers: AnwesenheitenTabulatorEventHandlers,
			tableData: [],
			ma_uid: 'ma0144',
			sem_kurzbz: 'WS2023',
			lv_id: '38733',
			selectedDate: new Date('2023-10-09'), // formatDate(new Date()),
			studentsData: null,
			datesData: null
		}
	},
	props: {
		students: [],
		dates: [],
		parameters: []
	},
	methods: {
		prepareData(students, dates, parameters) {
			const internalDates = this.filterDates(dates)
			this.leCount = internalDates.length
			// TODO: filter by parameters von and bis
			const internalStudents = this.filterStudents(students)
			this.calculateAnwesenheitSumme(internalStudents)
			console.log('internalDates')
			console.log(internalDates)

			console.log('internalStudents')
			console.log(internalStudents)
			return {internalDates, internalStudents, internalParameters: parameters}
		},
		calculateAnwesenheitSumme(internalStudents) {

			// count attended classes
			internalStudents.forEach(student => {
				let attendedClasses = 0

				student.anwesenheiten.forEach(anw => {

					// TODO: move away from hardcoding the calculation against statusBezeichnung
					if(anw.status == "Ja") attendedClasses++
				})
				debugger
				student.sum = (attendedClasses / this.leCount * 100).toFixed(2)
			})
		},
		filterDates(dates) {
			const datesMapped = dates.map(entry => entry.datum)
			return Array.from(new Set(datesMapped))

		},
		filterStudents(students) {
			// add up anwesenheiten for each student
			const studentMap = new Map()
			students.forEach(student => {
				if(studentMap.has(student.prestudent_id)) {
					studentMap.get(student.prestudent_id).push({datum: student.date, status: student.status})
				} else {
					studentMap.set(student.prestudent_id, [{datum: student.date, status: student.status}])
				}
			})

			// revert into array since maps have trouble with objects as keys
			const ret = []
			studentMap.forEach((value, key) => {
				const student = students.find(s => s.prestudent_id == key)
				const sortedValue = value.sort((entryA, entryB) => new Date(entryA.datum) - new Date(entryB.datum))

				ret.push({prestudent_id: key, vorname: student.vorname, nachname: student.nachname, anwesenheiten: sortedValue})
			})

			return ret
		},
		newSideMenuEntryHandler: function(payload) {
			this.appSideMenuEntries = payload;
		},
		searchfunction: function(searchsettings) {
			return Vue.$fhcapi.Search.search(searchsettings);
		},
		searchfunctiondummy: function(searchsettings) {
			return Vue.$fhcapi.Search.searchdummy(searchsettings);
		}

	},
	created(){

	},
	mounted() {
		Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByLektor(this.ma_uid, this.lv_id, this.sem_kurzbz, this.selectedDate).then((res)=>{
			console.log('res.data', res.data);
			if(!res.data)return

			this.studentsData = new Map()
			this.datesData = new Set()
			const namesAndID = []
			res.data.retval.forEach(entry => {

				if(!this.datesData.has(entry.date)) this.datesData.add(entry.date)

				if(!this.studentsData.has(entry.prestudent_id)) {
					this.studentsData.set(entry.prestudent_id, [{datum: entry.date, status: entry.status}])
					namesAndID.push({prestudent_id: entry.prestudent_id, vorname: entry.vorname, nachname: entry.nachname, sum: entry.sum})
				} else {
					this.studentsData.get(entry.prestudent_id).push({datum: entry.date, status: entry.status})
				}
			})

			const tableStudentData = []
			const selectedDateFormatted = formatDate(this.selectedDate)
			namesAndID.forEach(student => {
				const studentDataEntry = this.studentsData.get(student.prestudent_id)

				const anwesenheit = studentDataEntry.find(entry => Reflect.get(entry, 'datum')=== selectedDateFormatted)
				const status = Reflect.get(anwesenheit, 'status')

				// tableStudentData.push(student.prestudent_id, student.vorname, student.nachname, this.studentsData.get(student.prestudent_id), '100%');
				tableStudentData.push({prestudent_id: student.prestudent_id,
					vorname: student.vorname,
					nachname: student.nachname,
					datum: status ?? '-',
					sum: student.sum});
			})


			this.$refs.anwesenheitenTable.tabulator.setData(tableStudentData);

		})
	},
	updated(){
	},
	watch: {
		selectedDate(newVal, oldVal) {
			console.log('selectedDate watcher')
			console.log('oldVal', oldVal)
			console.log('newVal', newVal)
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
