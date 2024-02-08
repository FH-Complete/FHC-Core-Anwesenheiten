import {CoreFilterCmpt} from '../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../js/components/navigation/Navigation.js';

import verticalsplit from "../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../js/components/searchbar/searchbar.js";


export default {
	name: 'StudentByLvaComponent',
	components: {
		CoreFilterCmpt,
		CoreNavigationCmpt,
		verticalsplit: verticalsplit,
		searchbar: searchbar
	},
	data() {
		return {
			appSideMenuEntries: {},
			headerMenuEntries: {},
			anwesenheitenByStudentByLvaTabulatorOptions: {
				height: func_height(),
				index: 'datum',
				layout: 'fitColumns',
				columns: [
					{title: 'Anwesenheit ID', field: 'anwesenheit_id', visible: false},
					{title: 'Datum', field: 'datum', headerFilter: true},
					{title: 'Status', field: 'status', formatter: this.anwesenheitFormatter
					},
				]
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [{
				event: "cellClick",
				handler: (e, cell) => {
					const row = cell.getRow()
					const data = cell.getData().status
					// TODO: (johann) more sophisticated check
					if(data === "anw") {
						const newRow = {datum: cell.getData().datum, status: "abw"}
						this.handleChange(newRow)
						row.update(newRow)
					} else if (data === "abw") {
						const newRow = {datum: cell.getData().datum, status: "anw"}
						this.handleChange(newRow)
						row.update(newRow)
					}
				}
			}],
			changedData: [],
			tableData: null,
			initialTableData: null
		}
	},
	props: {
		id: null,
		lv_id: null,
		sem_kz: null,

	},
	methods: {
		anwesenheitFormatter (cell) {
			const data = cell.getData().status
			if (data === "anw") return '<i class="fa fa-check"></i>'
			else if (data === "abw") return '<i class="fa fa-xmark"></i>'
			else return '-'
		},
		newSideMenuEntryHandler: function(payload) {
			this.appSideMenuEntries = payload;
		},
		searchfunction: function(searchsettings) {
			return Vue.$fhcapi.Search.search(searchsettings);
		},
		searchfunctiondummy: function(searchsettings) {
			return Vue.$fhcapi.Search.searchdummy(searchsettings);
		},
		handleChange(row){
			// TODO: write data changed detection

			// const existingEntryIndex = this.changedData.findIndex(element => element.datum === row.datum && element.status === row.status)
			// if(existingEntry === undefined) this.changedData.push(row)
			// else this.changedData
		},
		saveChanges(){
			Vue.$fhcapi.Anwesenheit.saveChangedAnwesenheiten()
		}
	},
	created(){

	},
	mounted() {

		Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByStudentByLva(this.id, this.lv_id, this.sem_kz)
			.then((res) => {

				if(!res.data) return

				this.tableData = res.data.retval
				this.initialTableData = [...res.data.retval]
				this.$refs.anwesenheitenByStudentByLvaTable.tabulator.setData(this.tableData);
			})
	},

	updated(){

	},
	watch: {

	},
	computed: {
		dataChanged() {
			return this.changedData.length
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
<!--					<i class="fa fa-chevron-left"></i>-->
					<core-filter-cmpt
						title="anwesenheitenByStudentByLva Viewer"
						ref="anwesenheitenByStudentByLvaTable"
						:tabulator-options="anwesenheitenByStudentByLvaTabulatorOptions"
						:tabulator-events="anwesenheitenByStudentByLvaTabulatorEventHandlers"
						@nw-new-entry="newSideMenuEntryHandler"
						:tableOnly
						:sideMenu="false" 
						noColumnFilter>
					</core-filter-cmpt>
					<div class="d-flex justify-content-end align-items-end mt-3">
						<button @click="saveChanges" role="button" class="btn btn-primary align-self-end" disabled="!dataChanged">
							Änderungen Speichern
						</button>
					</div>
				</div>
		</div>
	</div>`
};
