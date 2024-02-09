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
					// TODO(johann): define anwesenheitFormatter once and import from somewhere
					{title: 'Status', field: 'status', formatter: this.anwesenheitFormatter},
				]
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [{
				event: "cellClick",
				handler: (e, cell) => {
					const row = cell.getRow()
					const data = cell.getData().status
					// TODO: (johann) more sophisticated check with db fetched status_type values
					if(data === "anw") {
						const newRow = {
							anwesenheit_id: cell.getData().anwesenheit_id,
							datum: cell.getData().datum,
							status: "abw"
						}
						this.handleChange(newRow)
						row.update(newRow)
					} else if (data === "abw") {
						const newRow = {
							anwesenheit_id: cell.getData().anwesenheit_id,
							datum: cell.getData().datum,
							status: "anw"
						}
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
			// TODO: (johann) more sophicitcated check against db fetched status_type values
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
			const existingEntryIndex = this.changedData.findIndex(element => element.datum === row.datum)
			if(existingEntryIndex >= 0) this.changedData.splice(existingEntryIndex, 1)
			else this.changedData.push(row)
		},
		async saveChanges(){

			const result = await Vue.$fhcapi.Anwesenheit.saveChangedAnwesenheiten(this.changedData)
			this.changedData = []


			if(result && result.status === 200) {
				this.$fhcAlert.alertSuccess("Anwesenheiten updated successfully.")
			} else {
				this.$fhcAlert.alertError("Something went terribly wrong.")
			}


		}
	},
	created(){

	},
	mounted() {
		Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByStudentByLva(this.id, this.lv_id, this.sem_kz)
			.then((res) => {

				if(!res.data) return
				console.log(res.data.retval)
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
						<button @click="saveChanges" role="button" class="btn btn-primary align-self-end" :disabled="!dataChanged">
							Änderungen Speichern
						</button>
					</div>
				</div>
		</div>
	</div>`
};
