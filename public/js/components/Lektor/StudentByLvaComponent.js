import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {lektorFormatters} from "../../formatters/formatters";

export const StudentByLvaComponent = {
	name: 'StudentByLvaComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		CoreNavigationCmpt,
	},
	data() {
		return {
			appSideMenuEntries: {},
			headerMenuEntries: {},
			anwesenheitenByStudentByLvaTabulatorOptions: {
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+`/extensions/FHC-Core-Anwesenheiten/api/KontrolleApi/getAllAnwesenheitenByStudentByLva?prestudent_id=${this.id}&lv_id=${this.lv_id}&sem_kurzbz=${this.sem_kz}`,
				ajaxResponse: (url, params, response) => {
					if(response.meta.status !== "success") return []

					const arr = response?.data?.retval ?? []

					// calculate total time of anw
					const sum = arr.reduce((acc, cur) => acc + cur.dauer, 0)
					arr.forEach(row => {
						row.anteil = (row.dauer / sum * 100).toFixed(2)
					})

					this.tableData = response.data.retval
					this.initialTableData = [...response.data.retval]
					return response.data.retval
				},
				height: false,
				index: 'datum',
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
				selectableCheck: this.selectableCheck,
				rowFormatter: this.unselectableFormatter,
				selectable: true,
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
					{title: this.$capitalize(this.$p.t('global/datum')), field: 'datum', headerFilter: true, formatter: lektorFormatters.formDateOnly, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/status')), field: 'status', formatter: this.anwesenheitFormatterValue,  widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/anteilAnw')), field: 'anteil', bottomCalc: this.anwCalc, formatter: lektorFormatters.percentFormatter},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: lektorFormatters.dateOnlyTimeFormatter, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: lektorFormatters.dateOnlyTimeFormatter, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/einheiten')), field: 'dauer', formatter: this.einheitenFormatter, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/notiz')), field: 'notiz', editor: "input", tooltip:false, minWidth: 150}
				],
				persistence: {
					sort: false,
					filter: true,
					headerFilter: false,
					group: true,
					page: true,
					columns: true,
				},
				persistenceID: "lektorDetailViewStudentByLva"
			},
			anwesenheitenByStudentByLvaTabulatorEventHandlers: [
			{
				event: "rowSelected",
				handler: () => {
					this.selected++
				}
			},
			{
				event: "rowDeselected",
				handler: () => {
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
			sum: '',
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
		anwCalc(){
			return this.sum + ' %'
		},
		selectableCheck(row) {
			return row.getData().status !== this.$entryParams.permissions.entschuldigt_status
		},
		einheitenFormatter: function (cell) {
			const valInMin = Number(cell.getValue())
			let valInEh = (cell.getValue() / 60 / this.$entryParams.permissions.einheitDauer)
			const rest = valInEh % 1
			if(rest > 0) valInEh = valInEh.toFixed(2)

			return '<div style="display: flex; justify-content: center; align-items: center; height: 100%">'
					+valInMin+' '+this.$p.t('global/minuten')+' / '+valInEh+' '+this.$p.t('global/einheiten')+
				'</div>'
		},
		unselectableFormatter(row) {
			const data = row.getData()

			if(data.status === this.$entryParams.permissions.entschuldigt_status) {
				row.getElement().children[0]?.children[0]?.remove()
			}

		},
		setRowStatus(cell, row, status) {
			if(cell.getData().status === status || cell.getData().status === this.$entryParams.permissions.entschuldigt_status) return

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

			const setCheckedButton = document.createElement('button');
			setCheckedButton.className = 'btn btn-outline-secondary';
			setCheckedButton.innerHTML = '<i class="fa fa-check"></i>';
			setCheckedButton.addEventListener('click', () => this.setRowStatus(cell, cell.getRow(), this.$entryParams.permissions.anwesend_status));
			wrapper.append(setCheckedButton);

			const setCrossedButton = document.createElement('button');
			setCrossedButton.className = 'btn btn-outline-secondary';
			setCrossedButton.innerHTML = '<i class="fa fa-xmark"></i>';
			setCrossedButton.addEventListener('click', () => this.setRowStatus(cell, cell.getRow(), this.$entryParams.permissions.abwesend_status));
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
						const student = this.$entryParams.lektorState.students.find(s => s.prestudent_id === this.prestudent_id && s.person_id === this.person_id)
						student.sum = this.sum

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
				if(data.status !== this.$entryParams.permissions.entschuldigt_status || data.status === this.$entryParams.permissions.anwesend_status) {
					const newData = {
						anwesenheit_user_id: data.anwesenheit_user_id,
						datum: data.datum,
						status: this.$entryParams.permissions.anwesend_status,
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
				if(data.status !== this.$entryParams.permissions.entschuldigt_status || data.status === this.$entryParams.permissions.abwesend_status) {
					const newData = {
						anwesenheit_user_id: data.anwesenheit_user_id,
						datum: data.datum,
						status: this.$entryParams.permissions.abwesend_status
					}
					selectedRows[i].update(newData)
					changedData.push(newData)
					changedRows.push(selectedRows[i])
				}

			})

			this.saveChanges(changedData)

			changedRows.forEach(row => row.toggleSelect())
		},
		setFilterTitle() {
			this.filterTitle = this.vorname + ' ' + this.nachname + ' ' + this.semester
				+ this.verband + this.gruppe + ' '
			this.filterSubtitle = this.$p.t('global/summe')
				+ ': ' + this.sum+ ' %'
		},
		routeToLandingPage() {
			this.$router.push({
				name: 'LandingPage'
			})
		},
		anwesenheitFormatterValue(cell) {
			const data = cell.getValue()
			if (data === this.$entryParams.permissions.anwesend_status) {
				cell.getElement().style.color = "#28a745";
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa fa-check"></i></div>'
			} else if (data === this.$entryParams.permissions.abwesend_status) {
				cell.getElement().style.color = "#dc3545";
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa fa-xmark"></i></div>'
			} else if (data === this.$entryParams.permissions.entschuldigt_status) {
				cell.getElement().style.color = "#0335f5";
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><i class="fa-solid fa-user-shield"></i></div>'
			} else return '-'
		},
	},
	created(){

	},
	mounted() {
		this.$fhcApi.factory.Info.getStudentInfo(this.id, this.lv_id, this.sem_kz).then(res => {
			if (res.meta.status !== "success" || !res.data) return

			this.prestudent_id = res.data[0].prestudent_id
			this.person_id = res.data[0].person_id
			this.vorname = res.data[0].vorname
			this.nachname = res.data[0].nachname
			this.semester = res.data[0].semester
			this.verband = res.data[0].verband
			this.gruppe = res.data[0].gruppe
			this.sum = res.data[0].sum
			this.foto = res.data[0].foto

			this.$refs.anwesenheitenByStudentByLvaTable.tabulator.recalc();
			this.setFilterTitle()
		})
		
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

export default StudentByLvaComponent