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
					{title: 'Datum', field: 'datum', headerFilter: true},
					{title: 'Status', field: 'status', headerFilter: true},
				]
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [{

			}],
			tableData: null
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

	},
	created(){

	},
	mounted() {

		console.log('this.id', this.id)
		console.log('this.lv_id', this.lv_id)
		console.log('this.sem_kz', this.sem_kz)

		Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByStudentByLva(this.id, this.lv_id, this.sem_kz)
			.then((res) => {

				if(!res.data) return

				this.tableData = res.data.retval
				this.$refs.anwesenheitenByStudentByLvaTable.tabulator.setData(this.tableData);
			})
	},

	updated(){

	},
	watch: {

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
						title="anwesenheitenByStudentByLva Viewer"
						ref="anwesenheitenByStudentByLvaTable"
						:tabulator-options="anwesenheitenByStudentByLvaTabulatorOptions"
						:tabulator-events="anwesenheitenByStudentByLvaTabulatorEventHandlers"
						@nw-new-entry="newSideMenuEntryHandler"
						:tableOnly
						:sideMenu="false" 
						noColumnFilter>
					</core-filter-cmpt>
					
				</div>
		</div>
	</div>`
};
