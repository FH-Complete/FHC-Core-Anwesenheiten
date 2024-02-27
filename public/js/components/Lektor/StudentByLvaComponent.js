import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';

import { lektorFormatters } from "../../mixins/formatters";

import verticalsplit from "../../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../../js/components/searchbar/searchbar.js";


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
				index: 'datum',
				layout: 'fitColumns',
				columns: [
					{title: 'Anwesenheit ID', field: 'anwesenheit_id', visible: false},
					{title: 'Datum', field: 'datum', headerFilter: true},
					{title: 'Status', field: 'status', formatter: lektorFormatters.anwesenheitFormatter},
				]
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [{
				event: "cellClick",
				handler: (e, cell) => {
					const row = cell.getRow()
					const data = cell.getData().status
					// TODO: (johann) more sophisticated check with db fetched status_type values
					if(data === "anwesend") {
						const newRow = {
							anwesenheit_id: cell.getData().anwesenheit_id,
							datum: cell.getData().datum,
							status: "abwesend"
						}
						this.handleChange(newRow)
						row.update(newRow)
					} else if (data === "abwesend") {
						const newRow = {
							anwesenheit_id: cell.getData().anwesenheit_id,
							datum: cell.getData().datum,
							status: "anwesend"
						}
						this.handleChange(newRow)
						row.update(newRow)
					}
				}
			}],
			filterTitle: "",
			changedData: [],
			tableData: null,
			initialTableData: null,
			vorname: null,
			nachname: null,
			semester: null,
			verband: null,
			gruppe: null,
			sum: null,
			foto: null
		}
	},
	props: {
		id: null,
		lv_id: null,
		sem_kz: null,

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
		handleChange(row){
			const existingEntryIndex = this.changedData.findIndex(element => element.datum === row.datum)
			if(existingEntryIndex >= 0) this.changedData.splice(existingEntryIndex, 1)
			else this.changedData.push(row)
		},
		async saveChanges(){
			const changedData = this.changedData
			this.changedData = []
			const result = await Vue.$fhcapi.Anwesenheit.saveChangedAnwesenheiten(changedData)

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
		Vue.$fhcapi.Info.getStudentInfo(this.id, this.lv_id, this.sem_kz).then((res) => {
			console.log('getStudentInfo', res);
			if(!res.data || !res.data.retval) return

			this.vorname = res.data.retval[0].vorname
			this.nachname = res.data.retval[0].nachname
			this.semester = res.data.retval[0].semester
			this.verband = res.data.retval[0].verband
			this.gruppe = res.data.retval[0].gruppe
			this.sum = res.data.retval[0].sum
			this.foto = res.data.retval[0].foto

			console.log(this.foto)

			this.filterTitle = this.vorname + ' ' + this.nachname + ' ' + this.semester + this.verband + this.gruppe
		})

		Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByStudentByLva(this.id, this.lv_id, this.sem_kz)
			.then((res) => {
				console.log('getAllAnwesenheitenByStudentByLva', res)
				if(!res.data || !res.data.retval) return

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
					<core-filter-cmpt
						:title="filterTitle"
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
				<div class="col-4">
<!--					<img v-if="foto" :src="'data:image/jpeg;base64,'+ foto" />-->
					<h4> Summe: {{sum}} %</h4>
				</div>
		</div>
	</div>`
};
