import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../formatters/formatters.js";
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import {StudiengangDropdown} from "../Student/StudiengangDropdown.js";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {EntschuldigungEdit} from "./EntschuldigungEdit.js";
import {dateFilter} from "../../../../../js/tabulator/filters/Dates.js"
import AnwTimeline from "./AnwTimeline.js";

export const AssistenzComponent = {
	name: 'AssistenzComponent',
	components: {
		BsModal,
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreFilterCmpt,
		CoreRESTClient,
		Datepicker: VueDatePicker,
		StudiengangDropdown,
		EntschuldigungEdit,
		AnwTimeline
	},
	data: function() {
		return {
			selectedEntschuldigung: null,
			selectedEntschuldigungValid: false,
			selectedAnwArray: null,
			selectedEntArray: null,
			tabulatorUuid: Vue.ref(0),
			headerMenuEntries: {},
			sideMenuEntries: {},
			editCellValue: '',
			tableData: null,
			zeitraum: {
				von: this.$formatTime(new Date(Date.now()).setDate((new Date(Date.now()).getDate() - (30)))),
				bis: this.$formatTime(new Date(Date.now()).setDate((new Date(Date.now()).getDate() + (60))))
			},
			permissionsLoaded: false,
			tableBuiltPromise: null,
			assistenzViewTabulatorOptions: {
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+'/extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getEntschuldigungen',
				ajaxResponse: (url, params, response) => {
					this.tableData = response.data.retval
					return response.data.retval
				},
				ajaxConfig: "POST",
				ajaxContentType:{
					headers:{
						'Content-Type': 'application/json'
					},
					body:()=> {
						const berechtigungenArrayAdmin = this.$entryParams.permissions.admin && Array.isArray(this.$entryParams.permissions.studiengaengeAdmin) ? this.$entryParams.permissions.studiengaengeAdmin : []
						const berechtigungenArrayAssistenz = this.$entryParams.permissions.assistenz && Array.isArray(this.$entryParams.permissions.studiengaengeAssistenz) ? this.$entryParams.permissions.studiengaengeAssistenz : []
						const joined = [... new Set([... berechtigungenArrayAssistenz, ... berechtigungenArrayAdmin])]
						return JSON.stringify({
							stg_kz_arr: joined,
							von: this.zeitraum.von,
							bis: this.zeitraum.bis
						})
					}
				},
				debugInvalidComponentFuncs:false,
				layout: 'fitData',
				selectable: false,
				placeholder: this.$p.t('global/noDataAvailable'),
				pagination: true,
				paginationSize: 50,
				height: this.$entryParams.tabHeights.assistenz,
				columns: [
					{title: this.$capitalize(this.$p.t('person/vorname')), field: 'vorname',
						headerFilter: true,
						tooltip:false
					},
					{title: this.$capitalize(this.$p.t('person/nachname')), field: 'nachname',
						headerFilter: true,
						tooltip:false
					},
					{title: this.$capitalize(this.$p.t('lehre/ausbildungssemester')), field: 'semester',
						headerFilter: true,
						tooltip:false
					} ,
					{title: this.$capitalize(this.$p.t('global/status')), field: 'akzeptiert',
						headerFilter:'list',
						headerFilterParams:{values: {'true': 'Akzeptiert', 'false': 'Abgelehnt', 'null': 'Hochgeladen', '':'Alle'}},
						headerFilterFunc: this.akzeptiertFilterFunc,
						formatter: this.entschuldigungstatusFormatter,
						tooltip: false
					},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: studentFormatters.formDate, headerFilterFunc: 'dates', headerFilter: dateFilter},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: studentFormatters.formDate, headerFilterFunc: 'dates', headerFilter: dateFilter},
					{title: this.$capitalize(this.$p.t('global/uploaddatum')), field: 'uploaddatum', headerFilterFunc: 'dates', headerFilter: dateFilter},
					{title: this.$capitalize(this.$p.t('lehre/organisationsform')), field: 'studentorgform',
						headerFilter: true,
						tooltip: false
					},
					{title: this.$capitalize(this.$p.t('lehre/studiengang')), field: 'studiengang_kz', formatter: studentFormatters.formStudiengangKz, tooltip:false},
					{title: this.$capitalize(this.$p.t('ui/aktion')), field: 'entschuldigung_id', formatter: this.formAction, tooltip:false},
					{title: this.$capitalize(this.$p.t('global/begruendungAnw')), field: 'notiz', editor: "input", headerFilter: true, tooltip:false, maxWidth: 300}
				],
				persistence: true,
				persistenceID: "assistenzTable"
			},
			assistenzViewTabulatorEventHandlers: [
				{
					event: "cellEditing",
					handler: (cell) => {
						this.editCellValue = cell.getData().notiz
					}
				},
				{
					event: "cellEdited",
					handler: (cell) => {
						const data = cell.getData()
						if((data.notiz === '' || data.notiz === null) && (this.editCellValue === '' || this.editCellValue === null)) return

						this.$fhcApi.factory.Anwesenheiten.Administration.updateEntschuldigung(String(data.entschuldigung_id), data.akzeptiert, data.notiz).then(res => {
							if (res.meta.status === "success")
							{
								this.$fhcAlert.alertSuccess(this.$p.t('ui/gespeichert'));
							}
						});
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
			notiz: '',
			studiengang: null,
			titleText: ''
		};
	},
	props: {
		permissions: []
	},
	methods: {
		saveEditEntschuldigung() {
			if(!this.selectedEntschuldigung) return
			
			this.$fhcApi.factory.Anwesenheiten.Administration.updateEntschuldigung(String(this.selectedEntschuldigung.entschuldigung_id), this.selectedEntschuldigung.akzeptiert, this.selectedEntschuldigung.notiz, this.selectedEntschuldigung.von, this.selectedEntschuldigung.bis).then(res => {
				if (res.meta.status === "success")
				{
					this.$fhcAlert.alertSuccess(this.$p.t('ui/gespeichert'));
					
					Object.keys(this.selectedEntschuldigung).forEach(key => {
						this.selectedEntschuldigungCellRef[key] = this.selectedEntschuldigung[key];
					});
					
				}
			}).finally(()=>{
				this.$refs.modalContainerEditEntschuldigung.hide()
				this.selectedEntschuldigung = null
				this.selectedEntschuldigungCellRef = null
			});
		},
		cancelEdit() {
			this.$refs.modalContainerEditEntschuldigung.hide()
			this.selectedEntschuldigung = null
			this.selectedEntschuldigungCellRef = null
		},
		openEditEntschuldigungModal(data) {
			this.selectedEntschuldigungCellRef = data
			this.selectedEntschuldigung = {...data}

			this.$refs.modalContainerEditEntschuldigung.show()
		},
		closeTimelineModal() {
			this.selectedAnwArray = null
			this.selectedEntArray = null
			
			this.$refs.modalContainerTimeline.hide()
		},
		savePersonIdDataArr(person_id, data) {
			// for given person_id save data in an array to avoid redundant fetches if different timelines are being looked at
		},
		openTimelineModal(data) {
			this.selectedEntschuldigungCellRef = data
			this.selectedEntschuldigung = {...data}

			// TODO: save fetched anw and check if we already fetched timeline for person_id
			// if that is the case just open modal with saved anwArray and overlay selected entschuldigung together with all others
			
			// keep track of ent updates for that person -> if ent was updated fetch again
			this.$fhcApi.factory.Anwesenheiten.Administration.getTimeline(this.selectedEntschuldigung.entschuldigung_id, this.selectedEntschuldigung.person_id).then(
				(res) => {
					
					this.savePersonIdDataArr(this.selectedEntschuldigung.person_id, res.data)
					
					this.selectedAnwArray = res.data[0].retval
					this.selectedEntArray = res.data[1].retval
				}
			)
			
			this.$refs.modalContainerTimeline.show()
		},
		akzeptiertFilterFunc(filterVal, rowVal) {
			// 400 iq code
			if(filterVal === 'null') return rowVal === null
			else if(filterVal === 'true') return rowVal === true
			else if(filterVal === 'false') return rowVal === false
		},
		entschuldigungstatusFormatter(cell) {
			let data = cell.getValue()
			if (data == null) {
				cell.getElement().style.color = "#17a2b8"
				return this.$p.t('global/hochgeladen')
			} else if (data === true) {
				cell.getElement().style.color = "#28a745";
				return this.$p.t('global/akzeptiert')
			} else if (data === false) {
				cell.getElement().style.color = "#dc3545";
				return this.$p.t('global/abgelehnt')
			}
		},
		updateEntschuldigung: function(cell, status, notizParam = '')
		{

			const entschuldigung_id = cell.getData().entschuldigung_id
			const existingNotiz = cell.getData().notiz
			const notiz = notizParam !== '' ? notizParam : (existingNotiz !== null && existingNotiz !== undefined) ? existingNotiz : ''
			this.$fhcApi.factory.Anwesenheiten.Administration.updateEntschuldigung(String(entschuldigung_id), status, notiz).then(res => {

				if (res.meta.status === "success")
				{
					cell.getRow().update({'akzeptiert': status, 'notiz': notiz});
					this.$fhcAlert.alertSuccess(this.$p.t('ui/gespeichert'));
				}
			});
		},
		downloadEntschuldigung: function(dms_id)
		{
			window.location = CoreRESTClient._generateRouterURI('extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile?entschuldigung=' + dms_id);
		},
		formAction: function(cell)
		{
			let actionwrapper = document.createElement('div');
			actionwrapper.className = "d-flex gap-3";
			const minwidth = '40px';
			const cellData = cell.getData()
			let button = null
			
			if(cellData.dms_id){
				button = document.createElement('button');
				button.className = 'btn btn-outline-secondary';
				button.style.minWidth = minwidth;
				button.innerHTML = '<i class="fa fa-download"></i>';
				button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
				button.title = this.$p.t('table/download');
				actionwrapper.append(button);
			}

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.style.minWidth = minwidth;
			button.innerHTML = '<i class="fa fa-pen-to-square"></i>';
			button.addEventListener('click', () => this.openEditEntschuldigungModal(cell.getData()));
			button.title = this.$p.t('global/entschuldigungEditieren');
			actionwrapper.append(button);

			// button = document.createElement('button');
			// button.className = 'btn btn-outline-secondary';
			// button.style.minWidth = minwidth;
			// button.innerHTML = '<i class="fa fa-timeline"></i>';
			// button.addEventListener('click', () => this.openTimelineModal(cell.getData()));
			// button.title = this.$p.t('global/anwTimeline');
			// actionwrapper.append(button);

			if(cellData.dms_id) {
				button = document.createElement('button');
				button.className = 'btn btn-outline-secondary';
				button.style.minWidth = minwidth;
				button.innerHTML = '<i class="fa fa-check"></i>';
				button.title = this.$p.t('global/entschuldigungAkzeptieren');
				button.addEventListener('click', () => this.updateEntschuldigung(cell, true));
				actionwrapper.append(button);
			}
			
			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.style.minWidth = minwidth;
			button.innerHTML = '<i class="fa fa-xmark"></i>';
			button.title = this.$p.t('global/entschuldigungAblehnen');
			button.addEventListener('click', () => this.openRejectionModal(cell));
			actionwrapper.append(button);

			return actionwrapper;
		},
		bisFilter: function (data, filterParams) {
			return new Date(data.bis).getTime() <= new Date(filterParams.bis).getTime()
		},
		vonFilter: function (data, filterParams) {
			return new Date(data.von).getTime() >= new Date(filterParams.von).getTime()
		},
		studiengangFilter: function (data, filterParams) {
			return data.studiengang_kz === Number(filterParams.studiengang)
		},
		filtern: function()
		{
			this.$refs.assistenzTable.tabulator.clearFilter()

			// if (this.zeitraum.von) this.$refs.assistenzTable.tabulator.addFilter(this.vonFilter, {von: this.zeitraum.von})
			// if (this.zeitraum.bis) this.$refs.assistenzTable.tabulator.addFilter(this.bisFilter, {bis: this.zeitraum.bis})
			if (this.studiengang) this.$refs.assistenzTable.tabulator.addFilter(this.studiengangFilter, {studiengang: this.studiengang})

		},
		handleInputNotiz(e) {
			this.notiz = e.target.value;
		},
		rejectEntschuldigung() {
			this.updateEntschuldigung(this.rejectCell, false, this.notiz)
			this.rejectCell = null
			this.notiz = ''

			this.$refs.modalContainerRejectionReason.hide()
		},
		openRejectionModal(cell) {
			this.rejectCell = cell

			this.notiz = cell.getData().notiz
			this.$refs.modalContainerRejectionReason.show()
		},
		sgChangedHandler: function(e) {
			this.studiengang = e.value ? e.value.studiengang_kz : null
		},
		checkEntryParamPermissions() {
			if(this.$entryParams.permissions === undefined) { // routed into app inner component skipping init in landing page
				this.$entryParams.permissions = JSON.parse(this.permissions)
			}

			this.permissionsLoaded = true

			if(this.$entryParams.phrasenPromise === undefined) {
				this.$entryParams.phrasenPromise = this.$p.loadCategory(['global', 'person', 'lehre', 'table', 'filter', 'ui'])
			}
		},
		async setup() {
			await this.$entryParams.phrasenPromise
			await this.tableBuiltPromise

			const cols = this.$refs.assistenzTable.tabulator.getColumns()

			// phrasen bandaid
			cols.find(e => e.getField() === 'vorname').updateDefinition({title: this.$capitalize(this.$p.t('person/vorname'))})
			cols.find(e => e.getField() === 'nachname').updateDefinition({title: this.$capitalize(this.$p.t('person/nachname'))})
			cols.find(e => e.getField() === 'semester').updateDefinition({title: this.$capitalize(this.$p.t('lehre/ausbildungssemester'))})

			cols.find(e => e.getField() === 'akzeptiert').updateDefinition({title: this.$capitalize(this.$p.t('global/status'))})
			cols.find(e => e.getField() === 'von').updateDefinition({title: this.$capitalize(this.$p.t('ui/von'))})
			cols.find(e => e.getField() === 'bis').updateDefinition({title: this.$capitalize(this.$p.t('global/bis'))})
			cols.find(e => e.getField() === 'studiengang_kz').updateDefinition({title: this.$capitalize(this.$p.t('lehre/studiengang'))})
			cols.find(e => e.getField() === 'entschuldigung_id').updateDefinition({title: this.$capitalize(this.$p.t('ui/aktion'))})
			cols.find(e => e.getField() === 'notiz').updateDefinition({title: this.$capitalize(this.$p.t('global/begruendungAnw'))})
			cols.find(e => e.getField() === 'uploaddatum').updateDefinition({title: this.$capitalize(this.$p.t('global/uploaddatum'))})
			cols.find(e => e.getField() === 'studentorgform').updateDefinition({title: this.$capitalize(this.$p.t('lehre/organisationsform'))})

			
		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
		refetchData() {
			const stg_kz_arr =  this.$entryParams.permissions.assistenz ?
				this.$entryParams.permissions.studiengaengeAssistenz :
				this.$entryParams.permissions.admin ? this.$entryParams.permissions.studiengaengeAdmin : []

			this.$fhcApi.factory.Anwesenheiten.Administration.getEntschuldigungen(stg_kz_arr, this.zeitraum.von, this.zeitraum.bis).then(res => {
				this.$refs.assistenzTable.tabulator.setData(res.data.retval)
			})
		},
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		},
		redrawTable() {
			if(this.$refs.assistenzTable?.tabulator) this.$refs.assistenzTable.tabulator.redraw(true)
		},
		handleSelectedEntschuldigungValidate(valid) {
			this.selectedEntschuldigungValid = valid
		}
	},
	mounted() {
		this.tableBuiltPromise = new Promise(this.tableResolve)
		this.checkEntryParamPermissions()
		this.setup()

		const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
		const tableDataSet = document.getElementById('filterTableDataset' + tableID);
		if(!tableDataSet) return
		const rect = tableDataSet.getBoundingClientRect();

		const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight :  window.visualViewport.height
		this.$entryParams.tabHeights['assistenz'].value = screenY - rect.top
	},
	beforeMounted() {
		if(!this.$entryParams?.permissions?.entschuldigungen_enabled) {

			// TODO: route to some 404 page or show entschuldigung disabled status
			this.$router.back()

		}
	},
	watch: {
		'zeitraum.von'() {
			this.refetchData()
		},
		'zeitraum.bis'() {
			this.refetchData()
		},
		studiengang() {
			this.filtern()
		}
	},
	computed: {
		getAllowedStg() {
			return this.$entryParams?.permissions?.assistenz ? this.$entryParams?.permissions?.studiengaengeAssistenz
				: this.$entryParams?.permissions?.admin ? this.$entryParams?.permissions?.studiengaengeAdmin : []
		},
		getTooltipObj(){
			return {
				value: this.$p.t('global/tooltipAssistenz'),
				class: "custom-tooltip"
			}
		}
	},
	template: `

	<core-base-layout>
		<template #main>
			<bs-modal ref="modalContainerRejectionReason" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>{{ $p.t('global/entschuldigungNotizAblehnen') }}</template>
				<template v-slot:default>
					<div>
						<div class="mt-2">
							<input maxlength=255 class="form-control" :value="notiz" @input="handleInputNotiz" :placeholder="$p.t('global/begruendungAnw')">
						</div>
					</div>
					
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-primary" :disabled="!notiz" @click="rejectEntschuldigung">{{ $p.t('global/reject') }}</button>
				</template>
			</bs-modal>


			<bs-modal ref="modalContainerTimeline" class="bootstrap-prompt" bodyClass="px-4 py-0" dialogClass="modal-dialog modal-fullscreen">
				<template v-slot:title>
					<div>
						{{ $p.t('global/anwTimeline') }}
					</div>
				</template>
				<template v-slot:default>
					
					<AnwTimeline v-model="selectedEntschuldigung" :anwArray="selectedAnwArray" :entArray="selectedEntArray"></AnwTimeline>
					
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-outline-secondary " @click="closeTimelineModal">{{$p.t('ui','cancel')}}</button>    
				</template>
			</bs-modal>	

			<bs-modal ref="modalContainerEditEntschuldigung" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>
					<div>
						{{ $p.t('global/entschuldigungEdit') }}
					</div>
				</template>
				<template v-slot:default>
					
					<EntschuldigungEdit v-model="selectedEntschuldigung" @validate="handleSelectedEntschuldigungValidate"></EntschuldigungEdit>
					
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-outline-secondary " @click="cancelEdit">{{$p.t('ui','cancel')}}</button>    
					<button type="button" class="btn btn-primary" :disabled="!selectedEntschuldigungValid" @click="saveEditEntschuldigung">{{ $p.t('ui', 'speichern') }}</button>
				</template>
			</bs-modal>	

			<div class="row">
			
				<div class="col-6" style="display: flex; align-items: center;">
					<h1 class="h4 mb-5" style="max-width: 50%; margin-right: 10px;">{{ $p.t('global/entschuldigungsmanagement') }}</h1>
					<div style="max-width: 25%; align-self: normal;" v-tooltip.bottom="getTooltipObj">
						<h4 style="margin: 0;"><i class="fa fa-circle-question"></i></h4>
					</div>
				</div>
			
				<div class="col-2">
					<div class="row mb-3 align-items-center">
						<StudiengangDropdown
							:allowedStg="getAllowedStg" @sgChanged="sgChangedHandler">
						</StudiengangDropdown>
					</div>
				</div>
				<div class="col-2">
					<div class="row mb-3 align-items-center">
						<datepicker
							v-model="zeitraum.von"
							:placeholder="$capitalize($p.t('ui/von'))"
							:clearable="false"
							auto-apply
							:enable-time-picker="false"
							format="dd.MM.yyyy"
							model-type="yyyy-MM-dd"
						></datepicker>
					</div>
				</div>
				<div class="col-2">
					<div class="row mb-3 align-items-center">
						<datepicker
							v-model="zeitraum.bis"
							:placeholder="$capitalize($p.t('global/bis'))"
							:clearable="false"
							auto-apply
							:enable-time-picker="false"
							format="dd.MM.yyyy"
							model-type="yyyy-MM-dd"
						></datepicker>
					</div>
				</div>
			</div>
			<core-filter-cmpt
				ref="assistenzTable"
				@uuidDefined="handleUuidDefined"
				:tabulator-options="assistenzViewTabulatorOptions"
				:tabulator-events="assistenzViewTabulatorEventHandlers"
				:sideMenu="false"
				:table-only="true"
			></core-filter-cmpt>
		</template>
	</core-base-layout>
`
};

export default AssistenzComponent