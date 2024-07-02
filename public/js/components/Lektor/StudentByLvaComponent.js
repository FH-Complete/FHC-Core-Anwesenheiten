import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

import {lektorFormatters, studentFormatters} from "../../formatters/formatters";

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
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+`/extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByStudentByLva?prestudent_id=${this.id}&lv_id=${this.lv_id}&sem_kurzbz=${this.sem_kz}`,
				ajaxResponse: (url, params, response) => {
					if(response.meta.status !== "success") return []

					this.tableData = response.data.retval
					this.initialTableData = [...response.data.retval]
					return response.data.retval
				},
				height: false,
				index: 'datum',
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
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
					{title: this.$p.t('global/datum'), field: 'datum', headerFilter: true, formatter: lektorFormatters.formDateOnly, widthGrow: 1, minWidth: 150},
					{title: this.$p.t('global/status'), field: 'status', formatter: lektorFormatters.anwesenheitFormatter, bottomCalc: this.anwCalc, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: lektorFormatters.dateOnlyTimeFormatter, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: lektorFormatters.dateOnlyTimeFormatter, widthGrow: 1, minWidth: 150},
					{title: this.$p.t('global/notiz'), field: 'notiz', editor: "input", tooltip:false, minWidth: 150}
				],
				persistence:true,
				persistenceID: "lektorDetailViewStudentByLva"
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [
			{
				event: "rowSelected",
				handler: (row) => {
					this.selected++
				}
			},
			{
				event: "rowDeselected",
				handler: (row) => {
					this.selected--
				}
			},
			{
				event: "cellEdited",
				handler: (cell) => {
					const data = cell.getData()
					this.$fhcApi.factory.Kontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id, [data]).then(res => {
						if(res.meta.status === "success") {
							this.$fhcAlert.alertSuccess(this.$p.t('global/anwNotizUpdated'))
						}
					})
				}
			}
			],
			filterTitle: "",
			filterSubtitle: "",
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
		anwCalc(values, data, calcParams){
			// TODO: might not exist in time when network is slow
			return (this.sum ? this.sum : '-') + ' %'
		},
		async deleteAnwesenheit(cell) {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			const anwesenheit_user_id = cell.getData().anwesenheit_user_id;

			this.$fhcApi.factory.Profil.deleteUserAnwesenheitById(anwesenheit_user_id).then(
				res => {
					if(res.meta.status === "success" && res.data.anwesenheit_user_id) {
						this.$fhcAlert.alertSuccess(this.$p.t('global/anwUserDeleteSuccess'))
						cell.getRow().delete()

						this.$fhcApi.factory.Profil.getAnwesenheitSumByLva(this.lv_id, this.sem_kz, this.id).then(res => {
							if(res.meta.status === "success" && res.data)
							{
								this.sum = result.data[0].sum
								this.$refs.anwesenheitenByStudentByLvaTable.tabulator.recalc();
							}
						})

					} else {
						this.$fhcAlert.alertSuccess(this.$p.t('global/errorAnwUserDelete'))
					}
				}
			)

		},
		setRowStatus(cell, row, status) {
			//TODO: remove hardcoded status
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
			this.$fhcApi.factory.Kontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id, changedData).then(res => {
				if(res.meta.status === "success") {
					this.$fhcAlert.alertSuccess(this.$p.t('global/anwUserUpdateSuccess'))
				} else {
					this.$fhcAlert.alertError(this.$p.t('global/errorAnwUserUpdate'))
				}

				this.$fhcApi.factory.Profil.getAnwesenheitSumByLva(this.lv_id, this.sem_kz, this.id).then(res => {
					if(res.meta.status === "success" && res.data)
					{
						this.sum = res.data[0].sum
						this.$refs.anwesenheitenByStudentByLvaTable.tabulator.recalc();

						this.setFilterTitle()
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
						status: "anwesend",
						notiz: data.notiz
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

			this.$fhcApi.factory.Profil.deleteUserAnwesenheitByIds(ids).then(
				res => {
					if(res.meta.status === "success") {
						this.$fhcAlert.alertSuccess(this.$p.t('global/anwUserDeleteSuccess'))
						selectedRows.forEach(row => {
							const rowData = row.getData()
							if(rowData.status === "entschuldigt"){
								row.deselect()
							} else {
								row.deselect()
								row.delete()
							}

						})

						this.$fhcApi.factory.Profil.getAnwesenheitSumByLva(this.lv_id, this.sem_kz, this.id).then(res => {
							if(res.meta.status === "success" && res.data)
							{
								this.sum = res.data[0].sum
								this.$refs.anwesenheitenByStudentByLvaTable.tabulator.recalc();

								this.setFilterTitle()
							}
						})

					} else {
						this.$fhcAlert.alertSuccess(this.$p.t('global/errorAnwUserDelete'))
					}
				}
			)

		},
		setFilterTitle() {
			this.filterTitle = this.vorname + ' ' + this.nachname + ' ' + this.semester
				+ this.verband + this.gruppe + ' '
			this.filterSubtitle = this.$p.t('global/summe')
				+ ': ' + (this.sum ? this.sum : '-') + ' %'
		},
		routeToLektor() {
			this.$router.push({
				name: 'Lektor'
			})
		},
		routeToLandingPage() {

			// TODO: avoid refetch when going this route

			this.$router.push({
				name: 'LandingPage'
			})
		}
	},
	created(){

	},
	mounted() {
		this.$fhcApi.factory.Info.getStudentInfo(this.id, this.lv_id, this.sem_kz).then(res => {
			if (res.meta.status !== "success" || !res.data) return

			this.vorname = res.data[0].vorname
			this.nachname = res.data[0].nachname
			this.semester = res.data[0].semester
			this.verband = res.data[0].verband
			this.gruppe = res.data[0].gruppe
			this.sum = res.data[0].sum
			this.foto = res.data[0].foto

			this.setFilterTitle()
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
			v-bind:add-header-menu-entries="headerMenuEntries"
			:hideTopMenu=true
			leftNavCssClasses="">	
		</core-navigation-cmpt>

		<core-base-layout
			:title="filterTitle"
			:subtitle="filterSubtitle"
			:main-cols=[10]
			:aside-cols=[2]
			>
			<template #main>
				<row>
					<button class="btn btn-outline-secondary" @click="routeToLandingPage"><a><i class="fa fa-chevron-left"></i></a></button>
				</row>
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
							{{ $p.t('ui/loeschen') }}
						</button>
						<button @click="setSelectedRowsAnwesend" role="button" class="btn btn-success align-self-end" :disabled="!selected">
							{{ $capitalize($p.t('global/anwesend')) }}
						</button>
						<button @click="setSelectedRowsAbwesend" role="button" class="btn btn-primary align-self-end" :disabled="!selected">
							{{ $capitalize($p.t('global/abwesend')) }}
						</button>
					</template>
				</core-filter-cmpt>
					
			</template>
			<template #aside>
				<img v-if="foto" :src="foto" style="width: 100%;"/>
			</template>
		</core-base-layout>
	</div>`
};
