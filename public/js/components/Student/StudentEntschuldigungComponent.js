import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../formatters/formatters";
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import Upload from '../../../../../js/components/Form/Upload/Dms.js';
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';

export default {
	name: 'StudentEntschuldigungComponent',
	components: {
		CoreBaseLayout,
		CoreRESTClient,
		CoreFilterCmpt,
		BsModal,
		Upload,
		"datepicker": VueDatePicker
	},
	data: function() {
		return {
			tabulatorUuid: Vue.ref(0),
			entschuldigung: {
				von: Vue.ref({ hours: 0, minutes: 0 }),
				bis: Vue.ref({ hours: 23, minutes: 59 }),
				files: []
			},
			minDate: this.calcMinDate(),
			tableBuiltPromise: null,
			entschuldigungsViewTabulatorOptions: {
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+'/extensions/FHC-Core-Anwesenheiten/api/ProfilApi/getEntschuldigungenByPersonID',
				ajaxResponse: (url, params, response) => {
					return response.data.retval
				},
				height: this.$entryParams.tabHeights.studentEnt,
				ajaxConfig: "POST",
				ajaxContentType: {
					headers:{
						'Content-Type': 'application/json'
					},
					body:()=>{
						return JSON.stringify({
							person_id: this.$entryParams.selected_student_info ? this.$entryParams.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id
						})
					}
				},
				placeholder: this._.root.appContext.config.globalProperties.$p.t('global/noDataAvailable'),
				layout:"fitDataStretch",
				pagination: true,
				paginationSize: 100,
				columns: [
					{title: this.$capitalize(this.$p.t('global/status')), field: 'akzeptiert', formatter: this.entschuldigungstatusFormatter, tooltip: false, minWidth: 200, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: studentFormatters.formDate, minWidth: 200, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: studentFormatters.formDate, minWidth: 200, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('ui/aktion')), field: 'dms_id', formatter: this.formAction, widthGrow: 1, tooltip: false, minWidth: 80, maxWidth: 85},
					{title: this.$capitalize(this.$p.t('global/begruendungAnw')), field: 'notiz', tooltip:false, minWidth: 150}
				],
				persistence: {
					sort: false,
					filter: true,
					headerFilter: false,
					group: true,
					page: true,
					columns: true,
				},
				persistenceID: "studentEntschuldigungenTable"
			},
			entschuldigungsViewTabulatorEventHandlers: [{
				event: "tableBuilt",
				handler: async () => {
					await this.$entryParams.phrasenPromise

					this.tableBuiltResolve()
				}
			}],
			filterTitle: ""
		};
	},
	methods: {
		calcMinDate(){
			// calc max reach offset into workdays
			let d = new Date();
			for (let x = this.$entryParams.permissions.entschuldigungMaxReach; x > 0; x--) {
				// step 3 times on monday, else step once per counter
				d.setDate(d.getDate() - (d.getDay() === 1 ? 3 : 1));
			}

			return d
		},
		entschuldigungstatusFormatter(cell) {
			let data = cell.getValue()
			if (data == null) {
				cell.getElement().style.color = "#17a2b8"
				return this.$p.t('global/entschuldigungOffen')
			} else if (data === true) {
				cell.getElement().style.color = "#28a745";
				return this.$p.t('global/entschuldigungAkzeptiert')
			} else if (data === false) {
				cell.getElement().style.color = "#dc3545";
				return this.$p.t('global/entschuldigungAbgelehnt')
			}
		},
		triggerUpload() {
			if (!this.validate())
			{
				return false;
			}
			const formData = new FormData();
			for (let i = 0; i < this.entschuldigung.files.length; i++) {
				formData.append('files', this.entschuldigung.files[i]);
			}
			formData.append('von', this.entschuldigung.von);
			formData.append('bis', this.entschuldigung.bis);

			const person_id = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id

			formData.append('person_id', person_id);



			this.$fhcApi.factory.Anwesenheiten.Profil.addEntschuldigung(formData).then(res => {
				let rowData = res.data
				this.$refs.entschuldigungsTable.tabulator.addRow(
					{
						'dms_id': rowData.dms_id,
						'akzeptiert': null,
						'von': rowData.von,
						'bis': rowData.bis,
						'entschuldigung_id': rowData.entschuldigung_id
					}
					, true);
				this.$fhcAlert.alertSuccess(this.$p.t('global/entschuldigungUploaded'));
				this.resetFormData();

			})

			this.$refs.modalContainerEntschuldigungUpload.hide()
		},
		formAction: function(cell) {
			let download = document.createElement('div');
			download.className = "d-flex gap-3";

			let button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';

			button.innerHTML = '<i class="fa fa-download"></i>';
			button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
			button.title = this.$p.t('table/download');
			download.append(button);

			if (cell.getData().akzeptiert == null)
			{
				button = document.createElement('button');
				button.className = 'btn btn-outline-secondary';
				button.innerHTML = '<i class="fa fa-xmark"></i>';
				button.title = this.$p.t('global/entschuldigungLöschen');
				button.addEventListener('click', () => this.deleteEntschuldigung(cell, 'decline'));
				download.append(button);
			}

			return download;
		},
		downloadEntschuldigung: function(dms_id)
		{
			window.location = CoreRESTClient._generateRouterURI('extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile?entschuldigung=' + dms_id);
		},
		async deleteEntschuldigung(cell) {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			let entschuldigung_id = cell.getData().entschuldigung_id;
			this.$fhcApi.factory.Anwesenheiten.Profil.deleteEntschuldigung(entschuldigung_id).then(response => {

				if (response.meta.status === "success")
				{
					cell.getRow().delete()
					this.$fhcAlert.alertSuccess(this.$p.t('global/entschuldigungLöschenErfolg'));
				}
			});
		},
		startUploadEntschuldigung(){
			this.$refs.modalContainerEntschuldigungUpload.show()
		},
		validate: function() {
			if(!this.entschuldigung.von) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterVonZeit'));
				return false
			}
			if(!this.entschuldigung.bis) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterBisZeit'));
				return false
			}
			if(!this.entschuldigung.files.length) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningChooseFile'));
				return false
			}
			if (!this.entschuldigung.von || !this.entschuldigung.bis || this.entschuldigung.files.length === 0)
			{
				return false
			}

			// javaScript Date objects are 0-indexed, subtract 1 from the month

			const vonParts = this.entschuldigung.von.split(/[ .:]/); // Split by dot, space, or colon
			const vonDate = new Date(vonParts[2], vonParts[1] - 1, vonParts[0], vonParts[3], vonParts[4]);

			const bisParts = this.entschuldigung.bis.split(/[ .:]/); // Split by dot, space, or colon
			const bisDate = new Date(bisParts[2], bisParts[1] - 1, bisParts[0], bisParts[3], bisParts[4]);

			if (bisDate < vonDate)
			{
				this.$fhcAlert.alertWarning(this.$p.t('global/errorValidateTimes'));
				return false
			}

			return true;
		},
		resetFormData: function()
		{
			this.entschuldigung = {
				von: Vue.ref({ hours: 0, minutes: 0 }),
				bis: Vue.ref({ hours: 23, minutes: 59 }),
				files: []
			};
		},
		reload(){
			const id = this.$entryParams.selected_student_info ? this.$entryParams.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id
			this.$fhcApi.factory.Anwesenheiten.Profil.getEntschuldigungenByPersonID(id).then(res => {
				this.$refs.entschuldigungsTable.tabulator.setData(res.data.retval)
			})
		},
		redrawTable() {
			if(this.$refs?.entschuldigungsTable?.tabulator) this.$refs.entschuldigungsTable.tabulator.redraw(true)
		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
		async setup() {
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise
			await this.tableBuiltPromise

			const cols = this.$refs.entschuldigungsTable.tabulator.getColumns()

			// phrasen bandaid

			cols.find(e => e.getField() === 'von').updateDefinition({title: this.$p.t('global/status')})
			cols.find(e => e.getField() === 'bis').updateDefinition({title: this.$capitalize(this.$p.t('ui/von'))})
			cols.find(e => e.getField() === 'student_status').updateDefinition({title: this.$capitalize(this.$p.t('global/bis'))})
			cols.find(e => e.getField() === 'von').updateDefinition({title: this.$p.t('ui/aktion')})
			cols.find(e => e.getField() === 'bis').updateDefinition({title: this.$p.t('global/notiz')})

			this.entschuldigungsViewTabulatorOptions.columns[0].title = this.$capitalize(this.$p.t('global/status'))
			this.entschuldigungsViewTabulatorOptions.columns[1].title = this.$capitalize(this.$p.t('ui/von'))
			this.entschuldigungsViewTabulatorOptions.columns[2].title = this.$capitalize(this.$p.t('global/bis'))
			this.entschuldigungsViewTabulatorOptions.columns[1].title = this.$capitalize(this.$p.t('ui/aktion'))
			this.entschuldigungsViewTabulatorOptions.columns[2].title = this.$capitalize(this.$p.t('global/notiz'))
		},
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		}
	},
	mounted() {
		this.minDate = new Date(this.minDate).setHours(0,0)
		this.tableBuiltPromise = new Promise(this.tableResolve)
		this.setup()

		const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
		const tableDataSet = document.getElementById('filterTableDataset' + tableID);
		if(!tableDataSet) return
		const rect = tableDataSet.getBoundingClientRect();

		const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight :  window.visualViewport.height
		this.$entryParams.tabHeights['studentEnt'].value = screenY - rect.top
	},
	watch: {
		'entschuldigung.files'(newVal) {
			if(newVal == [] || newVal === null || newVal === undefined) return

			// check filetype on input change
			const file = newVal[0]
			if(!file) return

			if(file.type && !file.name.includes('jfif') && (
				file.type.includes('jpg')
				|| file.type.includes('jpeg')
				|| file.type.includes('pdf')
				|| file.type.includes('png'))
			) {
				// all fine
			} else {
				// clear and alert for filetypes
				this.$fhcAlert.alertInfo(this.$p.t('global/allowedEntschuldigungFileTypes'))
				this.entschuldigung.files = []
			}

		}
	},
	computed: {
		getTooltipObj() {
			return {
				value: this.$p.t('global/tooltipStudentEntschuldigung', [this.$entryParams.permissions.entschuldigungMaxReach]),
				class: "custom-tooltip"
			}
		}
	},
	template: `

	<core-base-layout
		:title="filterTitle">
		<template #main>
			<bs-modal ref="modalContainerEntschuldigungUpload" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>
					<div v-tooltip.bottom="getTooltipObj">
						{{$p.t('global/addEntschuldigung')}}
						<i class="fa fa-circle-question"></i>
					</div>
				</template>
				<template v-slot:default>
					<div class="row mb-3 align-items-center">
						<div class="col-2 align-items-center"><label for="von" class="form-label">{{$capitalize($p.t('ui/von'))}}</label></div>
						<div class="col-10">
							<datepicker
								id="von"
								v-model="entschuldigung.von"
								clearable="false"
								auto-apply
								:enable-time-picker="true"
								:start-time="entschuldigung.von"
								format="dd.MM.yyyy HH:mm"
								model-type="dd.MM.yyyy HH:mm"
								:min-date="minDate"
								:start-date="minDate"
								:max-date="$entryParams.maxDate">
							</datepicker>
						</div>
					</div>
					<div class="row mb-3 align-items-center">
						<div class="col-2 align-items-center"><label for="von" class="form-label">{{$capitalize($p.t('global/bis'))}}</label></div>
						<div class="col-10">
							<datepicker
								id="bis"
								v-model="entschuldigung.bis"
								clearable="false"
								auto-apply
								:enable-time-picker="true"
								:start-time="entschuldigung.bis"
								format="dd.MM.yyyy HH:mm"
								model-type="dd.MM.yyyy HH:mm"
								:min-date="minDate"
								:start-date="minDate"
								:max-date="$entryParams.maxDate">
							</datepicker>
						</div>
					</div>
		
					
					<div class="row">
						<Upload ref="uploadComponent" accept=".jpg,.png,.pdf" v-model="entschuldigung.files"></Upload>
					</div>
				</template>
				<template v-slot:footer>
					<button class="btn btn-primary" @click="triggerUpload">{{$p.t('ui/hochladen')}}</button>
				</template>
			</bs-modal>
			<core-filter-cmpt
				ref="entschuldigungsTable"
				@uuidDefined="handleUuidDefined"
				:tabulator-options="entschuldigungsViewTabulatorOptions"
				:table-only=true
				:hideTopMenu=false
				newBtnShow=true
				:newBtnLabel="$p.t('global/entschuldigungHochladen')"
				@click:new=startUploadEntschuldigung
				:sideMenu=false
			></core-filter-cmpt>
		</template>
	</core-base-layout>
`
};