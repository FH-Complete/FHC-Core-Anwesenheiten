import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../formatters/formatters.js";
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import {StudiengangDropdown} from "../Student/StudiengangDropdown.js";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {EntschuldigungEdit} from "./EntschuldigungEdit.js";
import {AccountList} from "./AccountList.js";
import {dateFilter} from "../../../../../js/tabulator/filters/Dates.js"
import AnwTimeline from "./AnwTimeline.js";
import InViewHelp from "../../../../../js/components/InViewHelp.js";
import ApiAdmin from '../../api/factory/administration.js';

export const AssistenzComponent = {
	name: 'AssistenzComponent',
	components: {
		AccountList,
		BsModal,
		CoreBaseLayout,
		CoreFilterCmpt,
		Datepicker: VueDatePicker,
		StudiengangDropdown,
		EntschuldigungEdit,
		AnwTimeline,
		InViewHelp
	},
	data: function() {
		return {
			selectedEntschuldigung: null,
			selectedEntschuldigungValid: false,
			selectedAnwArray: null,
			selectedEntArray: null,
			tabulatorUuid: Vue.ref(0),
			editCellValue: '',
			zeitraum: {
				von: this.$formatTime(new Date(Date.now()).setDate((new Date(Date.now()).getDate() - (30)))),
				bis: this.$formatTime(new Date(Date.now()).setDate((new Date(Date.now()).getDate() + (60))))
			},
			tableBuiltPromise: null,
			assistenzViewTabulatorOptions: {
				debugInvalidComponentFuncs:false,
				layout: 'fitData',
				selectable: false,
				placeholder: this.$p.t('global/noDataAvailable'),
				pagination: true,
				paginationSize: 50,
				height: this.$entryParams.tabHeights.assistenz,
				// work order: open ones first, the oldest antrag on top. Tabulator sorts by the last entry
				// first. A sort the user stored in the local storage replaces this one
				initialSort: [
					{column: 'entuploaddatum', dir: 'asc'},
					{column: 'akzeptiert', dir: 'asc'}
				],
				columns: [
					{title: Vue.computed(() => this.$capitalize(this.$p.t('ui/student_uid'))), field: 'student_uid',
						formatter: this.studentUidFormatter,
						// student_uid is an array: the sorter guess of tabulator calls value.match and throws
						sorter: 'string',
						headerFilter: true,
						headerSort: true,
						tooltip:false
					},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('person/vorname'))), field: 'vorname',
						headerFilter: true,
						headerSort: true,
						tooltip:false
					},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('person/nachname'))), field: 'nachname',
						headerFilter: true,
						headerSort: true,
						tooltip:false
					},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('lehre/ausbildungssemester'))), field: 'semester',
						headerFilter: true,
						headerSort: true,
						tooltip:false
					} ,
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('global/status'))), field: 'akzeptiert',
						headerFilter:'list',
						headerFilterParams:{values: {'true': 'Akzeptiert', 'false': 'Abgelehnt', 'null': 'Offen', '':'Alle'}},
						headerFilterFunc: this.akzeptiertFilterFunc,
						formatter: this.entschuldigungstatusFormatter,
						sorter: this.statusSorter,
						tooltip: false,
						headerSort: true
					},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('global/file'))), headerSort: true,field: 'dms_id', formatter: studentFormatters.formFile},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('ui/dateFrom'))), headerSort: true,field: 'von', formatter: studentFormatters.formDate, headerFilterFunc: 'dates', headerFilter: dateFilter},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('global/bis'))),headerSort: true, field: 'bis', formatter: studentFormatters.formDate, headerFilterFunc: 'dates', headerFilter: dateFilter},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('global/antragsdatum'))),headerSort: true, field: 'entuploaddatum', formatter: studentFormatters.formDate, headerFilterFunc: 'dates', headerFilter: dateFilter},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('global/fileuploaddatum'))),headerSort: true, field: 'fileuploaddatum', formatter: studentFormatters.formDate, headerFilterFunc: 'dates', headerFilter: dateFilter},
					// filter and sort use the shown text, it lists every account for a person with more than one
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('lehre/organisationsform'))),headerSort: true, field: 'studentorgform',
						formatter: cell => this.orgformText(cell.getData()),
						headerFilter: true,
						headerFilterFunc: (filterVal, rowVal, rowData) => this.orgformText(rowData).toLowerCase().includes(filterVal.toLowerCase()),
						sorter: (a, b, aRow, bRow) => this.orgformText(aRow.getData()).localeCompare(this.orgformText(bRow.getData())),
						tooltip: false
					},
					// sort uses the shown text like the orgform column
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('lehre/studiengang'))), headerSort: true,field: 'studiengang_kz',
						formatter: cell => this.studiengangText(cell.getData()),
						sorter: (a, b, aRow, bRow) => this.studiengangText(aRow.getData()).localeCompare(this.studiengangText(bRow.getData())),
						tooltip:false
					},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('ui/aktion'))), headerSort: true,field: 'entschuldigung_id', formatter: this.formAction, tooltip:false, minWidth: 260},
					{title: Vue.computed(()=>this.$capitalize(this.$p.t('global/begruendungAnw'))), headerSort: true,field: 'notiz', editor: "input", headerFilter: true, tooltip:false, maxWidth: 300}
				],
				// every type on. Keep the keys instead of a plain true: the filter component
				// switches the column, the header filter and the sort persistence off in this
				// object as soon as a table preset is stored. columns keeps the layout keys only:
				// with true, tabulator writes the stored title back into the column definition,
				// and a Vue.computed title is readonly (TypeError when the table loads)
				persistence: {
					sort: true,
					filter: true,
					headerFilter: true,
					group: true,
					page: true,
					columns: ['width', 'visible'],
				},
				persistenceID: this.$entryParams.patchdate + "-assistenzTable"
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

						this.$api.call(ApiAdmin.updateEntschuldigung(String(data.entschuldigung_id), data.akzeptiert, data.notiz))
							.then(res => {
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
				},
				{
					event: "dataFiltered",
					handler: (filters, rows) => {
						this.updateCounts(rows)
					}
				},
				{
					event: "cellClick",
					handler: async (e, cell) => {

						if (cell.getColumn().getField() === "dms_id") {
							const val = cell.getValue()

							if(val !== '-' && val !== null) this.downloadEntschuldigung(val)
						}
						e.stopPropagation()

					}
				}
			],
			notiz: '',
			studiengang: null,
			counts: {gefiltert: 0, gesamt: 0},
			// open entschuldigungen: anzahl outside the date range, von - bis covers all of them
			offene: {anzahl: 0, von: null, bis: null},
			// the date range before "alle offenen anzeigen", null while that mode is off. The mode loads the open ones only
			savedZeitraum: null,
			loading: false,
			loadRequest: 0,
			statusAkzeptiert: false,
			statusAccounts: []
		};
	},
	props: {
		permissions: []
	},
	methods: {
		formatForSql(date) {
			if(typeof date === 'string') return date
			else if (date instanceof Date) {
				const pad = n => String(n).padStart(2, "0");

				return (
					date.getFullYear() + "-" +
					pad(date.getMonth() + 1) + "-" +
					pad(date.getDate()) + " " +
					pad(date.getHours()) + ":" +
					pad(date.getMinutes()) + ":" +
					pad(date.getSeconds())
				);
			}
		},
		saveEditEntschuldigung() {
			if(!this.selectedEntschuldigung) return
				this.selectedEntschuldigung.von = this.formatForSql(this.selectedEntschuldigung.von)
				this.selectedEntschuldigung.bis = this.formatForSql(this.selectedEntschuldigung.bis)
			
				this.$api.call(ApiAdmin.updateEntschuldigung(String(this.selectedEntschuldigung.entschuldigung_id),
					this.selectedEntschuldigung.akzeptiert, this.selectedEntschuldigung.notiz,
					this.selectedEntschuldigung.von, this.selectedEntschuldigung.bis))
			.then(res => {
				if (res.meta.status === "success")
				{
					this.$fhcAlert.alertSuccess(this.$p.t('ui/gespeichert'));
					
					Object.keys(this.selectedEntschuldigung).forEach(key => {
						this.selectedEntschuldigungCellRef[key] = this.selectedEntschuldigung[key];
					});
					this.$refs.assistenzTable.tabulator.redraw(true);
					
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
		openTimelineModal(data) {
			this.selectedEntschuldigungCellRef = data
			this.selectedEntschuldigung = {...data}

			// TODO: save fetched anw and check if we already fetched timeline for person_id
			// if that is the case just open modal with saved anwArray and overlay selected entschuldigung together with all others
			
			// keep track of ent updates for that person -> if ent was updated fetch again
			this.$api.call(ApiAdmin.getTimeline(this.selectedEntschuldigung.person_id))
				.then(
				(res) => {
					
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
		// work order: offen, akzeptiert, abgelehnt
		statusSorter(a, b) {
			const rank = value => value === null ? 0 : value === true ? 1 : 2
			return rank(a) - rank(b)
		},
		// a person with more than one account can belong to another assistenz. The uid, studiengang and
		// orgform column then list every account, all from data.accounts, so the order is always the same
		hasMehrereAccounts(data) {
			return data.accounts?.length > 1
		},
		studentUidFormatter(cell) {
			const data = cell.getData()
			if (!this.hasMehrereAccounts(data))
				return Array.isArray(data.student_uid) ? data.student_uid.join(', ') : (data.student_uid ?? '')

			const title = this.$p.t('global/entMehrereAccountsKurz') + ': '
				+ data.accounts.map(account => account.uid + ' (' + account.kurzbzlang + ', ' + (account.orgform_kurzbz ?? '-') + ')').join(', ')
			return ' <i class="fa fa-users text-warning-emphasis ms-1" title="' + title + '"></i> ' + data.accounts.map(account => account.uid).join(', ')
		},
		studiengangText(data) {
			if (!this.hasMehrereAccounts(data)) return data.kurzbzlang + ' ' + data.bezeichnung

			return data.accounts.map(account => account.kurzbzlang + ' ' + account.bezeichnung).join(', ')
		},
		// '-' keeps the positions when an account has no orgform
		orgformText(data) {
			if (!this.hasMehrereAccounts(data)) return data.studentorgform ?? ''

			return data.accounts.map(account => account.orgform_kurzbz ?? '-').join(', ')
		},
		// the colors live in FhcMain.css with a variant for the dark theme
		entschuldigungstatusFormatter(cell) {
			const data = cell.getValue()
			const status = data === true ? 'akzeptiert' : data === false ? 'abgelehnt' : 'offen'
			return '<span class="anw-ent-status--' + status + '">' + this.$p.t('global/' + status) + '</span>'
		},
		updateEntschuldigung: function(cell, status, notizParam = '')
		{

			const entschuldigung_id = cell.getData().entschuldigung_id
			const existingNotiz = cell.getData().notiz
			const notiz = notizParam !== '' ? notizParam : (existingNotiz !== null && existingNotiz !== undefined) ? existingNotiz : ''
			this.$api.call(ApiAdmin.updateEntschuldigung(String(entschuldigung_id), status, notiz))
				.then(res => {

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

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.style.minWidth = minwidth;
			button.innerHTML = '<i class="fa fa-timeline"></i>';
			button.addEventListener('click', () => this.openTimelineModal(cell.getData()));
			button.title = this.$p.t('global/anwTimelineV3');
			actionwrapper.append(button);

			if(cellData.dms_id) {
				button = document.createElement('button');
				button.className = 'btn btn-outline-secondary';
				button.style.minWidth = minwidth;
				button.innerHTML = '<i class="fa fa-check"></i>';
				button.title = this.$p.t('global/entschuldigungAkzeptieren');
				button.addEventListener('click', () => this.acceptEntschuldigung(cell));
				actionwrapper.append(button);
			}
			
			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.style.minWidth = minwidth;
			button.innerHTML = '<i class="fa fa-xmark"></i>';
			button.title = this.$p.t('global/entschuldigungAblehnen');
			button.addEventListener('click', () => this.openStatusModal(cell, false));
			actionwrapper.append(button);

			return actionwrapper;
		},
		// the query keeps one studiengang_kz per entschuldigung, a person with more than one account
		// must match every studiengang of its accounts
		studiengangFilter: function (data, filterParams) {
			const accounts = data.accounts?.length ? data.accounts : [data]
			return accounts.some(account => Number(account.studiengang_kz) === Number(filterParams.studiengang))
		},
		filtern: function()
		{
			this.$refs.assistenzTable.tabulator.clearFilter()

			if (this.studiengang) this.$refs.assistenzTable.tabulator.addFilter(this.studiengangFilter, {studiengang: this.studiengang})

		},
		handleInputNotiz(e) {
			this.notiz = e.target.value;
		},
		acceptEntschuldigung(cell) {
			// the assistenz of another studiengang can be responsible for a person with more than one account
			if (cell.getData().accounts?.length > 1) this.openStatusModal(cell, true)
			else this.updateEntschuldigung(cell, true)
		},
		confirmStatus() {
			this.updateEntschuldigung(this.statusCell, this.statusAkzeptiert, this.statusAkzeptiert ? '' : this.notiz)
			this.statusCell = null
			this.notiz = ''

			this.$refs.modalContainerStatus.hide()
		},
		openStatusModal(cell, akzeptiert) {
			this.statusCell = cell
			this.statusAkzeptiert = akzeptiert
			this.statusAccounts = cell.getData().accounts ?? []

			this.notiz = cell.getData().notiz
			this.$refs.modalContainerStatus.show()
		},
		sgChangedHandler: function(e) {
			this.studiengang = e.value ? e.value.studiengang_kz : null
		},
		checkEntryParamPermissions() {
			if(this.$entryParams.permissions === undefined) { // routed into app inner component skipping init in landing page
				this.$entryParams.permissions = JSON.parse(this.permissions)
			}

			if(this.$entryParams.phrasenPromise === undefined) {
				this.$entryParams.phrasenPromise = this.$p.loadCategory(['global', 'person', 'lehre', 'table', 'filter', 'ui'])
			}
		},
		async setup() {
			await this.$entryParams.phrasenPromise
			await this.tableBuiltPromise
			
		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
		// getEntschuldigungen answers with a message instead of a list on several branches:
		// entschuldigungen turned off, no studiengang assigned, no permission. Tabulator takes
		// an array only and shows a data loading error for everything else
		toTableData(response) {
			if (Array.isArray(response?.data)) return response.data

			console.warn('getEntschuldigungen returned no list:', response)
			return []
		},
		// studiengaenge of both rights, the first load, the reload and the count use the same ones
		getStgKzArr() {
			const permissions = this.$entryParams.permissions
			const admin = permissions.admin && Array.isArray(permissions.studiengaengeAdmin) ? permissions.studiengaengeAdmin : []
			const assistenz = permissions.assistenz && Array.isArray(permissions.studiengaengeAssistenz) ? permissions.studiengaengeAssistenz : []
			return [... new Set([... assistenz, ... admin])]
		},
		// one load path for the first load, the date range and "alle offenen laden"
		loadData() {
			// an older request that answers late must not overwrite the newer data
			const request = ++this.loadRequest
			this.loading = true
			this.fetchOffene()

			Promise.all([
				// "alle offenen anzeigen" spans a wide date range, the backend loads the open ones only
				this.$api.call(ApiAdmin.getEntschuldigungen(this.getStgKzArr(), this.zeitraum.von, this.zeitraum.bis, this.savedZeitraum !== null)),
				this.tableBuiltPromise
			])
				.then(([res]) => {
					if (request === this.loadRequest) this.$refs.assistenzTable.tabulator.setData(this.toTableData(res))
				})
				.catch(this.$fhcAlert.handleSystemError)
				.finally(() => {
					if (request === this.loadRequest) this.loading = false
				})
		},
		fetchOffene() {
			// the count follows the studiengang dropdown like the table
			const stg_kz_arr = this.studiengang ? [this.studiengang] : this.getStgKzArr()
			this.$api.call(ApiAdmin.getOffeneTimespan(stg_kz_arr, this.zeitraum.von, this.zeitraum.bis))
				.then(res => {
					// a message object without anzahl if entschuldigungen are turned off
					this.offene = Number.isInteger(res.data?.anzahl) ? res.data : {anzahl: 0, von: null, bis: null}
				})
				.catch(this.$fhcAlert.handleSystemError)
		},
		// widens the date range to the antragsdatum of all open entschuldigungen, the datepickers show what is loaded
		alleOffenenLaden() {
			if (!this.offene.von) return

			if (!this.savedZeitraum) this.savedZeitraum = {...this.zeitraum}
			this.zeitraum = {
				von: this.offene.von < this.zeitraum.von ? this.offene.von : this.zeitraum.von,
				bis: this.offene.bis > this.zeitraum.bis ? this.offene.bis : this.zeitraum.bis
			}
			this.offene.anzahl = 0
		},
		zeitraumZuruecksetzen() {
			this.zeitraum = this.savedZeitraum
			this.savedZeitraum = null
		},
		// a manual date change ends the "alle offenen" mode, the saved range no longer fits
		setZeitraum(key, value) {
			if (this.zeitraum[key] === value) return

			this.savedZeitraum = null
			this.zeitraum[key] = value
		},
		// dataFiltered hands over the filtered rows, the active rows of the table are not up to date there yet
		updateCounts(filteredRows) {
			const table = this.$refs.assistenzTable?.tabulator
			if (!table) return

			this.counts = {gefiltert: filteredRows.length, gesamt: table.getDataCount()}
		},
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		},
		redrawTable() {
			if(this.$refs.assistenzTable?.tabulator) this.$refs.assistenzTable.tabulator.redraw(true)
		},
		handleSelectedEntschuldigungValidate(valid) {
			this.selectedEntschuldigungValid = valid
		},
		calculateTableHeight() {
			const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
			const tableDataSet = document.getElementById('filterTableDataset' + tableID);
			if(!tableDataSet) return
			const rect = tableDataSet.getBoundingClientRect();

			const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight :  window.visualViewport.height
			this.$entryParams.tabHeights['assistenz'].value = screenY - rect.top - this.$contentBottomOffset()
		},
	},
	mounted() {
		this.tableBuiltPromise = new Promise(this.tableResolve)
		this.checkEntryParamPermissions()
		this.setup()
		this.loadData()
		
		this.calculateTableHeight()
		
		
		
		window.addEventListener('resize', this.calculateTableHeight)
		window.addEventListener('orientationchange', this.calculateTableHeight)
	},
	unmounted() {
		window.removeEventListener('resize', this.calculateTableHeight)
		window.removeEventListener('orientationchange', this.calculateTableHeight)
	},
	beforeMounted() {
		if(!this.$entryParams?.permissions?.entschuldigungen_enabled) {
			this.$router.back()
		}
	},
	watch: {
		// deep: one load when von and bis change together
		zeitraum: {
			deep: true,
			handler() {
				this.loadData()
			}
		},
		studiengang() {
			this.filtern()
			this.fetchOffene()
		}
	},
	computed: {
		getAllowedStg() {
			return this.$entryParams?.permissions?.assistenz ? this.$entryParams?.permissions?.studiengaengeAssistenz
				: this.$entryParams?.permissions?.admin ? this.$entryParams?.permissions?.studiengaengeAdmin : []
		}
	},
	template: `

	<core-base-layout>
		<template #main>
			<bs-modal ref="modalContainerStatus" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>{{ statusAkzeptiert ? $p.t('global/entschuldigungAkzeptieren') : $p.t('global/entschuldigungAblehnen') }}</template>
				<template v-slot:default>
					<div>
						<div v-if="statusAccounts.length > 1" class="alert alert-warning">
							<p><i class="fa fa-triangle-exclamation me-2"></i>{{ $p.t('global/entMehrereAccounts') }}</p>
							<AccountList :accounts="statusAccounts"></AccountList>
						</div>
						<div v-if="!statusAkzeptiert" class="mt-2">
							<input maxlength=255 class="form-control" :value="notiz" @input="handleInputNotiz" :placeholder="$p.t('global/begruendungAnw')">
						</div>
					</div>
					
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-outline-secondary" @click="$refs.modalContainerStatus.hide()">{{ $p.t('ui','cancel') }}</button>
					<button v-if="statusAkzeptiert" type="button" class="btn btn-primary" @click="confirmStatus">{{ $p.t('ui/bestaetigen') }}</button>
					<button v-else type="button" class="btn btn-primary" :disabled="!notiz" @click="confirmStatus">{{ $p.t('global/reject') }}</button>
				</template>
			</bs-modal>


			<bs-modal ref="modalContainerTimeline" class="bootstrap-prompt" bodyClass="px-0 pt-3 pb-0" dialogClass="modal-dialog modal-fullscreen">
				<template v-slot:title>
					<div>
						{{ $p.t('global/anwTimelineV3') }}
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
						{{ $p.t('global/entschuldigungEditieren') }}
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
					<h1 class="h4 mb-5" style="margin-right: 10px;">{{ $p.t('global/entschuldigungsmanagement') }}</h1>
					<in-view-help class="align-self-start" button-class="fs-4" :text="$p.t('global/tooltipAssistenzV3')"></in-view-help>
				</div>
			
				<div class="col-2">
					<div class="row mb-3 align-items-center">
						<label class="form-label small mb-1">{{ $capitalize($p.t('lehre/studiengang')) }}</label>
						<StudiengangDropdown
							:allowedStg="getAllowedStg" @sgChanged="sgChangedHandler">
						</StudiengangDropdown>
					</div>
				</div>
				<!-- the date range filters the antragsdatum, not the absence of the von/bis columns -->
				<div class="col-2">
					<div class="row mb-3 align-items-center">
						<label class="form-label small mb-1">{{ $p.t('global/entAntragsdatumVon') }}</label>
						<datepicker
							:model-value="zeitraum.von"
							@update:model-value="setZeitraum('von', $event)"
							:placeholder="$capitalize($p.t('ui/dateFrom'))"
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
						<label class="form-label small mb-1">{{ $p.t('global/entAntragsdatumBis') }}</label>
						<datepicker
							:model-value="zeitraum.bis"
							@update:model-value="setZeitraum('bis', $event)"
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
			<div class="position-relative" :class="{'anw-loading': loading}">
				<div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-body bg-opacity-50" style="z-index: 20;" role="status">
					<i class="fa-solid fa-spinner fa-pulse fa-3x" aria-hidden="true"></i>
					<span class="visually-hidden">{{ $p.t('ui/loading') }}</span>
				</div>
				<core-filter-cmpt
					ref="assistenzTable"
					@uuidDefined="handleUuidDefined"
					:tabulator-options="assistenzViewTabulatorOptions"
					:tabulator-events="assistenzViewTabulatorEventHandlers"
					:isUsingPresets="true"
					presetsId="anwesenheitenAssistenzTable"
					:sideMenu="false"
					:table-only="true"
				>
					<!-- header filters from the local storage and a short date range can hide entschuldigungen
					without notice. The counts and the red button show what is hidden -->
					<template #actions>
						<span>
							{{ $capitalize($p.t('global/gefiltert')) }}/{{ $capitalize($p.t('global/gesamt')) }}:
							<strong>{{ counts.gefiltert }}</strong>/{{ counts.gesamt }}
						</span>
						<button v-if="offene.anzahl > 0" type="button" class="btn btn-sm btn-outline-danger" v-tooltip.bottom.sticky="$p.t('global/tooltipEntAlleOffenenAnzeigenv2')" @click="alleOffenenLaden">
							<i class="fa fa-triangle-exclamation"></i> {{ $p.t('global/entAlleOffenenAnzeigen') }} - {{ $p.t('global/entAnzahlVerfuegbar', {count: offene.anzahl}) }}
						</button>
						<button v-if="savedZeitraum" type="button" class="btn btn-sm btn-outline-secondary" @click="zeitraumZuruecksetzen">
							<i class="fa fa-rotate-left"></i> {{ $p.t('global/entZeitraumZuruecksetzen') }}
						</button>
					</template>
				</core-filter-cmpt>
			</div>
		</template>
	</core-base-layout>
`
};

export default AssistenzComponent