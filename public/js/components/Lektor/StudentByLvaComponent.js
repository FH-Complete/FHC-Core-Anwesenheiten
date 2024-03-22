import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

import {lektorFormatters} from "../../mixins/formatters";

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
				layout: 'fitColumns',
				columns: [
					{
						formatter: 'rowSelection',
						titleFormatter: 'rowSelection',
						titleFormatterParams: {
							rowRange: "active" // Only toggle the values of the active filtered rows
						},
						headerSort: false,
						frozen: true,
						width: 70
					},
					{title: 'Datum', field: 'datum', headerFilter: true, formatter: lektorFormatters.formDateOnly, widthGrow: 1, minWidth: 150},
					{title: 'Status', field: 'status', formatter: lektorFormatters.anwesenheitFormatter, bottomCalc: this.anwCalc, widthGrow: 1, minWidth: 150},
					// {title: 'Action', field: 'anwesenheit_user_id', formatter: this.formAction, widthGrow: 1, minWidth: 150},
				]
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [
			{
				event: "rowSelected",
				handler: (row) => {
					console.log("rowSelected", row)
					this.selected++
				}
			},
			{
				event: "rowDeselected",
				handler: (row) => {
					console.log("rowDeselected", row)
					this.selected--
				}
			}
			],
			filterTitle: "",
			changedData: [],
			tableData: null,
			initialTableData: null,
			vorname: null,
			nachname: null,
			semester: null,
			verband: null,
			gruppe: null,
			sum: 0,
			foto: null,
			selected: 0
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
		anwCalc(values, data, calcParams){
			// TODO: might not exist in time when network is slow
			return (this.sum ? this.sum : '-') + ' %'
		},
		async deleteAnwesenheit(cell) {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

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
							{
								this.sum = result.data.data[0].sum
								this.$refs.anwesenheitenByStudentByLvaTable.tabulator.recalc();
							}
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

			// const deleteButton = document.createElement('button');
			// deleteButton.className = 'btn btn-outline-secondary';
			// deleteButton.innerHTML = '<i class="fa fa-trash"></i>';
			// deleteButton.addEventListener('click', () => this.deleteAnwesenheit(cell, false));
			// wrapper.append(deleteButton);

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
		async saveChanges(changedData){
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
					{
						this.sum = result.data.data[0].sum
						this.$refs.anwesenheitenByStudentByLvaTable.tabulator.recalc();
					}
				})
			})
		},
		setSelectedRowsAnwesend() {
			const selectedData = this.$refs.anwesenheitenByStudentByLvaTable.tabulator.getSelectedData()
			const selectedRows = this.$refs.anwesenheitenByStudentByLvaTable.tabulator.getSelectedRows()

			const changedData = []
			const changedRows = []
			selectedData.forEach((data,i) => {
				if(data.status !== "entschuldigt" || data.status === "anwesend") {
					const newData = {
						anwesenheit_user_id: data.anwesenheit_user_id,
						datum: data.datum,
						status: "anwesend"
					}
					selectedRows[i].update(newData)
					changedData.push(newData)
					changedRows.push(selectedRows[i])
				}

			})


			this.saveChanges(changedData)

			changedRows.forEach(row => row.toggleSelect())
		},
		async setSelectedRowsAbwesend(){
			const selectedData = this.$refs.anwesenheitenByStudentByLvaTable.tabulator.getSelectedData()
			const selectedRows = this.$refs.anwesenheitenByStudentByLvaTable.tabulator.getSelectedRows()

			const changedData = []
			const changedRows = []
			selectedData.forEach((data,i) => {
				if(data.status !== "entschuldigt" || data.status === "abwesend") {
					const newData = {
						anwesenheit_user_id: data.anwesenheit_user_id,
						datum: data.datum,
						status: "abwesend"
					}
					selectedRows[i].update(newData)
					changedData.push(newData)
					changedRows.push(selectedRows[i])
				}

			})

			this.saveChanges(changedData)

			changedRows.forEach(row => row.toggleSelect())
		},
		async deleteSelectedRows(){
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			const selectedRows = this.$refs.anwesenheitenByStudentByLvaTable.tabulator.getSelectedRows()
			const selectedData = this.$refs.anwesenheitenByStudentByLvaTable.tabulator.getSelectedData()
			const ids = []
			selectedData.forEach(data => {
				if(data.status !== "entschuldigt") ids.push(data.anwesenheit_user_id)
			})

			Vue.$fhcapi.Anwesenheit.deleteUserAnwesenheitByIds(ids).then(
				res => {
					console.log('deleteUserAnwesenheitByIds', res)

					if(res.status === 200 && res.data.meta.status === "success") {
						this.$fhcAlert.alertSuccess("Anwesenheiten deleted successfully.")
						selectedRows.forEach(row => {
							const rowData = row.getData()
							if(rowData.status === "entschuldigt"){
								row.deselect()
							} else {
								row.deselect()
								row.delete()
							}

						})

						Vue.$fhcapi.Student.getAnwesenheitSumByLva(this.id, this.lv_id, this.sem_kz).then(result => {
							console.log('getAnwesenheitSumByLva', result)
							if(result.status === 200 && result.data.data)
							{
								this.sum = result.data.data[0].sum
								this.$refs.anwesenheitenByStudentByLvaTable.tabulator.recalc();
							}
						})

					} else {
						this.$fhcAlert.alertSuccess("Error deleting User Anwesenheiten.")
					}
				}
			)

		}
	},
	created(){

	},
	mounted() {
		Vue.$fhcapi.Info.getStudentInfo(this.id, this.lv_id, this.sem_kz).then((res) => {
			console.log('getStudentInfo', res);
			if (res.status !== 200 || !res.data.data) return

			this.vorname = res.data.data[0].vorname
			this.nachname = res.data.data[0].nachname
			this.semester = res.data.data[0].semester
			this.verband = res.data.data[0].verband
			this.gruppe = res.data.data[0].gruppe
			this.sum = res.data.data[0].sum
			this.foto = res.data.data[0].foto

			this.filterTitle = this.vorname + ' ' + this.nachname + ' ' + this.semester
				+ this.verband + this.gruppe + ' Summe: ' + (this.sum ? this.sum : '-') + ' %'
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
			v-bind:add-header-menu-entries="headerMenuEntries"
			:hideTopMenu=true
			leftNavCssClasses="">	
		</core-navigation-cmpt>

		<core-base-layout
			:title="filterTitle"
			:main-cols=[10]
			:aside-cols=[2]
			>
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
					<template #actions>
						<button @click="deleteSelectedRows" role="button" class="btn btn-danger align-self-end" :disabled="!selected">
							Löschen
						</button>
						<button @click="setSelectedRowsAnwesend" role="button" class="btn btn-success align-self-end" :disabled="!selected">
							Anwesend
						</button>
						<button @click="setSelectedRowsAbwesend" role="button" class="btn btn-primary align-self-end" :disabled="!selected">
							Abwesend
						</button>
					</template>
				</core-filter-cmpt>
					
			</template>
			<template #aside>
				
				<img v-if="foto" :src="'data:image/jpeg;base64,'+ foto" />
				
			</template>
		</core-base-layout>
	</div>`
};
