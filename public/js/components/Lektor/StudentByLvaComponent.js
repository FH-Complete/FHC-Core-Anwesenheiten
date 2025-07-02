import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {lektorFormatters} from "../../formatters/formatters.js";

import ApiKontrolle from '../../api/factory/kontrolle.js';
import ApiProfil from '../../api/factory/profil.js';
import ApiInfo from '../../api/factory/info.js';

export const StudentByLvaComponent = {
	name: 'StudentByLvaComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		CoreNavigationCmpt,
	},
	data() {
		return {
			tabulatorUuid: Vue.ref(0),
			appSideMenuEntries: {},
			headerMenuEntries: {},
			tableBuiltPromise: null,
			cellEditing: null,
			anwesenheitenByStudentByLvaTabulatorOptions: {
				height: this.$entryParams?.tabHeights?.studentByLva ?? 400,
				index: 'datum',
				layout: 'fitDataStretch',
				placeholder: this.$p.t('global/noDataAvailable'),
				selectableCheck: this.selectableCheck,
				rowFormatter: this.unselectableFormatter,
				debugInvalidComponentFuncs:false,
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
					{title: this.$capitalize(this.$p.t('global/anteilAnw')), field: 'anteil', bottomCalcFormatter: this.sumBottomCalcFormatter, bottomCalc: this.anwCalc, formatter: this.percentFormatter},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: lektorFormatters.dateOnlyTimeFormatter, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: lektorFormatters.dateOnlyTimeFormatter, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/lehreinheit_id')), field: 'lehreinheit_id', widthGrow: 1, visible: false},
					{title: this.$capitalize(this.$p.t('global/kontrolle') + ' ' + this.$p.t('global/insertvon')), field: 'kinsertvon', widthGrow: 1, visible: false},
					{title: this.$capitalize(this.$p.t('global/kontrolle') + ' ' + this.$p.t('global/updatevon')), field: 'kupdatevon', widthGrow: 1, visible: false},
					{title: this.$capitalize(this.$p.t('global/anwUserEntry') + ' ' + this.$p.t('global/insertvon')), field: 'ainsertvon', widthGrow: 1, visible: false},
					{title: this.$capitalize(this.$p.t('global/anwUserEntry') + ' ' + this.$p.t('global/updatevon')), field: 'aupdatevon', widthGrow: 1, visible: false},
					{title: this.$capitalize(this.$p.t('global/einheiten')), field: 'dauer', visible: false, bottomCalc: this.einheitenCalc, formatter: this.einheitenFormatter, widthGrow: 1, minWidth: 250},
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
				persistenceID: this.$entryParams.patchdate + "-lektorDetailViewStudentByLva"
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
				event: "cellEditing",
				handler: (cell) => {
					const data = cell.getData()
					this.cellEditing = {...data}
				}
			},
			{
				event: "cellEdited",
				handler: (cell) => {
					const data = cell.getData()
					
					if(this.cellEditing?.notiz === null && data?.notiz === '') {
						// do nothing when just clicking edit input and not typing
						
					} else {
						this.$api.call(ApiKontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id.value, [data]))
							.then(res => {
							if(res.meta.status === "success") {
								this.$fhcAlert.alertSuccess(this.$p.t('global/anwNotizUpdated'))
							}
						})
					}

					this.cellEditing = null
				}
			},
			{
				event: "tableBuilt",
				handler: async () => {
					await this.$entryParams.phrasenPromise

					this.tableBuiltResolve()
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
	emits: [
		'titleSet',
		'anwesenheitenUpdated'
	],
	props: {
		permissions: [],
		id: null,
		lv_id: null,
		sem_kz: null,

	},
	methods: {
		percentFormatter: function (cell) {
			const data = cell.getData()
			const val = data.sum ??  data.anteil ?? '-'
			return '<div style="display: flex; justify-content: center; align-items: center; height: 100%">'+ val + ' %</div>'
		},
		anwCalc(){
			return this.sum + ' %'
		},
		sumBottomCalcFormatter(cell) {
			const val = Number.parseFloat(cell.getValue())
			if(Number.isNaN(val)) return cell.getValue()
			if (val < (this.$entryParams.permissions.positiveRatingThreshold * 100)) {
				const el = cell.getElement()
				el.style.setProperty('color', 'red')
			}

			return cell.getValue()
		},
		einheitenCalc(values) {

			return this.formatMinutes(values.reduce((acc, cur) => cur+=acc,0))
		},
		selectableCheck(row) {
			return row.getData().status !== this.$entryParams?.permissions?.entschuldigt_status
		},
		formatMinutes(minutes) {
			let valInEh = (minutes / 60 / this.$entryParams.permissions.einheitDauer)
			const rest = valInEh % 1
			if(rest > 0) valInEh = valInEh.toFixed(2).replace('.', ',')

			return minutes+' '+this.$p.t('global/minuten')+' / '+valInEh+' '+this.$p.t('global/einheiten')
		},
		einheitenFormatter: function (cell) {
			const valInMin = Number(cell.getValue())
			const content = this.formatMinutes(valInMin)

			return '<div style="display: flex; justify-content: center; align-items: center; height: 100%">'
					+content+
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
			this.$api.call(ApiKontrolle.updateAnwesenheiten(this.$entryParams.selected_le_id.value, changedData)).then(res => {
				if(res.meta.status === "success") {
					this.$fhcAlert.alertSuccess(this.$p.t('global/anwUserUpdateSuccess'))
					this.$emit('anwesenheitenUpdated')
				} else {
					this.$fhcAlert.alertError(this.$p.t('global/errorAnwUserUpdate'))
				}

				this.$api.call(ApiProfil.getAnwesenheitSumByLva(this.lv_id, this.sem_kz, this.id))
					.then(res => {
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
			
			this.$emit('titleSet', this.filterTitle)
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
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
		async setupMounted() {
			
			if(!this.tableBuiltPromise) {
				this.tableBuiltPromise = new Promise(this.tableResolve)
				await this.tableBuiltPromise
			}
			
			this.$api.call(ApiKontrolle.getAllAnwesenheitenByStudentByLva(this.id, this.lv_id, this.sem_kz))
				.then(res => {
				if (res.meta.status !== "success" || !res.data) {
					return []
				} else {
					const arr = res?.data?.retval ?? []
					// calculate total time of anw
					const sum = arr.reduce((acc, cur) => acc + cur.dauer, 0)
					arr.forEach(row => {
						row.anteil = (row.dauer / sum * 100).toFixed(2)
					})

					this.tableData = res.data.retval
					this.initialTableData = [...res.data.retval]
					this.$refs.anwesenheitenByStudentByLvaTable.tabulator.setData(res.data.retval)
					// return res.data.retval
				}

			})

			this.$api.call(ApiInfo.getStudentInfo(this.id, this.lv_id, this.sem_kz))
				.then(res => {
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
		isLowResolution(imgSrc) {
			const img = new Image()
			img.src = imgSrc
			return img.width < 150 || img.height < 200
		},
		calculateTableHeight() {

			const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
			const tableDataSet = document.getElementById('filterTableDataset' + tableID);
			if(!tableDataSet) return
			const rect = tableDataSet.getBoundingClientRect();

			const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight : window.visualViewport.height
			this.$entryParams.tabHeights['studentByLva'].value = screenY - rect.top - 100 // approx for calc row on bottom

			if(this.$refs.anwesenheitenByStudentByLvaTable.tabulator) this.$refs.anwesenheitenByStudentByLvaTable.tabulator.redraw(true)

		},
		load(){
			this.setupMounted()

			// this.calculateTableHeight()
			// window.addEventListener('resize', this.calculateTableHeight)
			// window.addEventListener('orientationchange', this.calculateTableHeight)
		}
	},
	mounted() {
		// this.setupMounted()
		//
		// this.calculateTableHeight()
		window.addEventListener('resize', this.calculateTableHeight)
		window.addEventListener('orientationchange', this.calculateTableHeight)
	},
	unmounted() {
		window.removeEventListener('resize', this.calculateTableHeight)
		window.removeEventListener('orientationchange', this.calculateTableHeight)	
	},
	computed: {
		dataChanged() {
			return this.changedData.length
		},
		getTooltipObj() {
			return {
				value: this.$p.t('global/tooltipStudentByLva'),
				class: "custom-tooltip"
			}
		}
	},
	template:`
		<div class="row">
			<div class="col-10" style="mx-width: 80%">
				<core-filter-cmpt
					ref="anwesenheitenByStudentByLvaTable"
					title=""
					@uuidDefined="handleUuidDefined"
					:tabulator-options="anwesenheitenByStudentByLvaTabulatorOptions"
					:tabulator-events="anwesenheitenByStudentByLvaTabulatorEventHandlers"
					:tableOnly="true"
					:sideMenu="false" 
					noColumnFilter>
					<template #actions>

						<button @click="setSelectedRowsAnwesend" role="button" class="btn btn-success align-self-end" :disabled="!selected">
							{{ $capitalize($p.t('global/anwesend')) }}
						</button>
						<button @click="setSelectedRowsAbwesend" role="button" class="btn btn-primary align-self-end" :disabled="!selected">
							{{ $capitalize($p.t('global/abwesend')) }}
						</button>
						
						<div v-tooltip.bottom="getTooltipObj">
							<h5><i class="fa fa-circle-question"></i></h5>
						</div>
					</template>
				</core-filter-cmpt>
			</div>
			<div class="col-2">
				<img v-if="foto" :src="foto" :class="isLowResolution(foto) ? 'image-low-resolution' : ''" style="width: 100%"/>
			</div>
		</div>`
};

export default StudentByLvaComponent