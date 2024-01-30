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
		verticalsplit: verticalsplit,
		searchbar: searchbar
	},
	data() {
		return {
			leCount: 0,
			appSideMenuEntries: {},
			anwesenheitenTabulatorOptions: AnwesenheitenTabulatorOptions,
			anwesenheitenTabulatorEventHandlers: AnwesenheitenTabulatorEventHandlers
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

	},
	updated(){
	},

	template:`
	<th>
		<core-navigation-cmpt v-bind:add-side-menu-entries="appSideMenuEntries"></core-navigation-cmpt>
		
		<div id="content">
			<core-filter-cmpt
				title="Anwesenheiten Viewer"
				filter-type="AnwesenheitenByLektor"
				:tabulator-options="anwesenheitenTabulatorOptions"
				:tabulator-events="anwesenheitenTabulatorEventHandlers"
				:id-field="'anwesenheiten_id'"
				@nw-new-entry="newSideMenuEntryHandler">
			</core-filter-cmpt>

<!--			<core-filter-cmpt-->
<!--				title="Anwesenheiten Viewer"-->
<!--				:tabulator-options="anwesenheitenTabulatorOptions"-->
<!--				:tabulator-events="anwesenheitenTabulatorEventHandlers"-->
<!--				:id-field="'anwesenheiten_id'"-->
<!--				@nw-new-entry="newSideMenuEntryHandler"-->
<!--				:tableOnly>-->
<!--			</core-filter-cmpt>-->
		</div>

			
	</div>`


};
