import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

import { lektorFormatters } from "../../mixins/formatters";

import verticalsplit from "../../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../../js/components/searchbar/searchbar.js";


export default {
	name: 'StudentByLvaComponent',
	components: {
		CoreBaseLayout,
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
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+`/extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByStudentByLva?prestudent_id=${this.id}&lv_id=${this.lv_id}&sem_kurzbz=${this.sem_kz}`,
				ajaxResponse: (url, params, response) => {
					console.log('getAllAnwesenheitenByStudentByLva', response)
					if(response.meta.status !== "success") return []

					this.tableData = response.data.retval
					this.initialTableData = [...response.data.retval]
					return response.data.retval
				},
				height: false,
				index: 'datum',
				layout: 'fitDataFill',
				columns: [

					{title: 'Datum', field: 'datum', headerFilter: true},
					{title: 'Status', field: 'status', formatter: lektorFormatters.anwesenheitFormatter},
					{title: 'Action', field: 'anwesenheit_user_id', formatter: this.formAction, width: 130, minWidth:130, maxWidth:130},
				]
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [{
				event: "cellClick",
				handler: (e, cell) => {
					const row = cell.getRow()
					const field = cell.getField()
					if(field !== 'status') return

					const data = cell.getData().status
					// TODO: (johann) more sophisticated check with db fetched status_type values
					if(data === "anwesend") {
						this.setRowStatus(cell, row, 'abwesend')
					} else if (data === "abwesend") {
						this.setRowStatus(cell, row, 'anwesend')
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
		deleteAnwesenheit(cell) {
			const anwesenheit_user_id = cell.getData().anwesenheit_user_id;

			Vue.$fhcapi.Anwesenheit.deleteUserAnwesenheitById(anwesenheit_user_id).then(
				res => {
					console.log('deleteUserAnwesenheitById', res)

					if(res.status === 200 && res.data.data.anwesenheit_user_id) {
						this.$fhcAlert.alertSuccess("Anwesenheiten deleted successfully.")
						cell.getRow().delete()

						Vue.$fhcapi.Student.getAnwesenheitSumByLva(this.id, this.lv_id, this.sem_kz).then(result => {
							console.log('getAnwesenheitSumByLva', result)
							if(result.status === 200 && result.data.data)
								this.sum = result.data.data[0].sum
						})

					} else {
						this.$fhcAlert.alertSuccess("Error deleting User Anwesenheit.")
					}
				}
			)

		},
		setRowStatus(cell, row, status) {
			if(cell.getData().status === status || cell.getData().status === "entschuldigt") return

			const newRow = {
				anwesenheit_user_id: cell.getData().anwesenheit_user_id,
				datum: cell.getData().datum,
				status: status
			}
			this.handleChange(newRow)
			row.update(newRow)
		},
		handleChange(row){
			const existingEntryIndex = this.changedData.findIndex(element => element.datum === row.datum)
			if(existingEntryIndex >= 0) this.changedData.splice(existingEntryIndex, 1)
			else this.changedData.push(row)
		},
		formAction: function(cell)
		{
			const wrapper = document.createElement('div');
			wrapper.className = "d-flex gap-3";

			const deleteButton = document.createElement('button');
			deleteButton.className = 'btn btn-outline-secondary';
			deleteButton.innerHTML = '<i class="fa fa-trash"></i>';
			deleteButton.addEventListener('click', () => this.deleteAnwesenheit(cell, false));
			wrapper.append(deleteButton);

			const setCheckedButton = document.createElement('button');
			setCheckedButton.className = 'btn btn-outline-secondary';
			setCheckedButton.innerHTML = '<i class="fa fa-check"></i>';
			setCheckedButton.addEventListener('click', () => this.setRowStatus(cell, cell.getRow(), "anwesend"));
			wrapper.append(setCheckedButton);

			const setCrossedButton = document.createElement('button');
			setCrossedButton.className = 'btn btn-outline-secondary';
			setCrossedButton.innerHTML = '<i class="fa fa-xmark"></i>';
			setCrossedButton.addEventListener('click', () => this.setRowStatus(cell, cell.getRow(), "abwesend"));
			wrapper.append(setCrossedButton);

			return wrapper;
		},
		async saveChanges(){
			const changedData = this.changedData
			this.changedData = []
			Vue.$fhcapi.Anwesenheit.saveChangedAnwesenheiten(changedData).then(result => {
				console.log('saveChangedAnwesenheiten', result)
				if(result.status === 200) {
					this.$fhcAlert.alertSuccess("Anwesenheiten updated successfully.")
				} else {
					this.$fhcAlert.alertError("Something went terribly wrong.")
				}

				Vue.$fhcapi.Student.getAnwesenheitSumByLva(this.id, this.lv_id, this.sem_kz).then(result => {
					console.log('getAnwesenheitSumByLva', result)
					if(result.status === 200 && result.data.data)
					this.sum = result.data.data[0].sum
				})
			})
		}
	},
	created(){

	},
	mounted() {
		Vue.$fhcapi.Info.getStudentInfo(this.id, this.lv_id, this.sem_kz).then((res) => {
			console.log('getStudentInfo', res);
			if(res.status !== 200 || !res.data.data) return

			this.vorname = res.data.data[0].vorname
			this.nachname = res.data.data[0].nachname
			this.semester = res.data.data[0].semester
			this.verband = res.data.data[0].verband
			this.gruppe = res.data.data[0].gruppe
			this.sum = res.data.data[0].sum
			this.foto = res.data.data[0].foto

			this.filterTitle = this.vorname + ' ' + this.nachname + ' ' + this.semester + this.verband + this.gruppe
		})

		// Vue.$fhcapi.Anwesenheit.getAllAnwesenheitenByStudentByLva(this.id, this.lv_id, this.sem_kz)
		// 	.then((res) => {
		// 		console.log('getAllAnwesenheitenByStudentByLva', res)
		// 		if(res.status !== 200 || !res.data.data) return
		//
		// 		this.tableData = res.data.data.retval
		// 		this.initialTableData = [...res.data.data.retval]
		// 		this.$refs.anwesenheitenByStudentByLvaTable.tabulator.setData(this.tableData);
		// 	})
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

		<core-base-layout
			:title="filterTitle"
			mainCols="8"
			asideCols="4">
			<template #main>
				<core-filter-cmpt
					title=""
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
			</template>
			<template #aside>
<!--				<img v-if="foto" :src="'data:image/jpeg;base64,'+ foto" />-->
				<h4> Summe: {{sum}} %</h4>
			</template>
		</core-base-layout>
	</div>`
};
