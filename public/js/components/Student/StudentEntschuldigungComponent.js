import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../formatters/formatters.js";
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import Upload from '../../../../../js/components/Form/Upload/Dms.js';
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import ApiProfil from '../../api/factory/profil.js'
export default {
	name: 'StudentEntschuldigungComponent',
	components: {
		CoreBaseLayout,
		CoreRESTClient,
		CoreFilterCmpt,
		BsModal,
		Upload,
		"datepicker": VueDatePicker,
		Checkbox: primevue.checkbox
	},
	data: function() {
		return {
			noFileUpload: false,
			editEntschuldigung: null,
			tabulatorUuid: Vue.ref(0),
			entschuldigung: this.initEntschuldigungForm(),
			minDate: this.calcMinDate(),
			tableBuiltPromise: null,
			entschuldigungsViewTabulatorOptions: {
				// data is fetched and set from outside (loadEntschuldigungen) instead of tabulator ajax options:
				// the ajax fetch fired on table build, before person_id was resolved, and tabulator
				// displayed a confusing error placeholder to students until the request chain settled
				height: this.$entryParams.tabHeights.studentEnt,
				placeholder: this.$p.t('global/noDataAvailable'),
				debugInvalidComponentFuncs:false,
				layout:"fitDataStretch",
				pagination: true,
				paginationSize: 100,
				columns: [
					{title: this.$capitalize(this.$p.t('global/status')), field: 'akzeptiert', formatter: this.entschuldigungstatusFormatter, minWidth: 200, tooltip: false, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: studentFormatters.formDate, minWidth: 200, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: studentFormatters.formDate, minWidth: 200, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('ui/aktion')), field: 'dms_id', formatter: this.formAction, widthGrow: 1, minWidth: 200, tooltip: false},
					{title: this.$capitalize(this.$p.t('global/begruendungAnw')), field: 'notiz', tooltip:false}
				],
				persistence: {
					sort: false,
					filter: true,
					headerFilter: false,
					group: true,
					page: true,
					columns: true,
				},
				persistenceID: this.$entryParams.patchdate + "-studentEntschuldigungenTable"
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
		initEntschuldigungForm() {
			return{
				von: new Date(new Date(Date.now()).getFullYear(), new Date(Date.now()).getMonth(), new Date(Date.now()).getDate(), 0, 0, 0, 0),
				bis: new Date(new Date(Date.now()).getFullYear(), new Date(Date.now()).getMonth(), new Date(Date.now()).getDate() + 1, 23, 59, 0, 0),
				files: []
			}
		},
		formatDate(dateParam) {
			const date = new Date(dateParam)
			// handle missing leading 0
			const padZero = (num) => String(num).padStart(2, '0');

			const month = padZero(date.getMonth() + 1); // Months are zero-based
			const day = padZero(date.getDate());
			const year = date.getFullYear();
			const hours = padZero(date.getHours());
			const minutes = padZero(date.getMinutes());

			return `${day}.${month}.${year} ${hours}:${minutes}`;
		},
		formatDateEntschuldigungEdit(date) {
			const padZero = (num) => String(num).padStart(2, '0');

			const month = padZero(date.getMonth() + 1);
			const day = padZero(date.getDate());
			const year = date.getFullYear();
			const hours = padZero(date.getHours());
			const minutes = padZero(date.getMinutes());

			return `${day}.${month}.${year} ${hours}:${minutes}`;
		},
		calcMinDate(){
			// step back entschuldigungMaxReach workdays, skipping weekends
			// (holidays are not considered, there is no data source for them here)
			const d = new Date();
			for (let x = this.$entryParams.permissions.entschuldigungMaxReach; x > 0; x--) {
				d.setDate(d.getDate() - 1);
				while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
			}

			return d
		},
		isValidDateObj(date) {
			return date instanceof Date && !isNaN(date.getTime());
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
		triggerEdit() {

			if(!this.entschuldigung.files.length) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningChooseFile'));
				return false
			}
			
			const formData = new FormData();
			
			for (let i = 0; i < this.entschuldigung.files.length; i++) {
				formData.append('files', this.entschuldigung.files[i]);
			}

			formData.append('von', this.isValidDateObj(this.editEntschuldigung.von) ? this.editEntschuldigung.von.toISOString() : this.editEntschuldigung.von);
			formData.append('bis', this.isValidDateObj(this.editEntschuldigung.bis) ? this.editEntschuldigung.bis.toISOString() : this.editEntschuldigung.bis);
			formData.append('entschuldigung_id', this.editEntschuldigung.entschuldigung_id)
			const person_id = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id

			formData.append('person_id', person_id);


			// only close the modal on success, on error the student can retry
			this.$api.call(ApiProfil.editEntschuldigung(formData))
				.then(response => {

				if (response.meta.status === "success")
				{
					const rows = this.$refs.entschuldigungsTable.tabulator.getRows()

					let targetRow = rows.find(row => row.getData().entschuldigung_id == response.data.entschuldigung_id);

					if (targetRow) {
						targetRow.update({dms_id: response.data.dms_id});
					}

					this.$fhcAlert.alertSuccess(this.$p.t('global/entschuldigungUploaded'));
					this.$refs.modalContainerEntschuldigungEdit.hide()
				}
			});

		},
		triggerUpload() {
			if (!this.validate())
			{
				return false;
			}
			const formData = new FormData();
			if(!this.noFileUpload) {
				for (let i = 0; i < this.entschuldigung.files.length; i++) {
					formData.append('files', this.entschuldigung.files[i]);
				}
			} else {
				formData.append('noFileUpload', this.noFileUpload)
			}
			
			formData.append('von', this.entschuldigung.von.toISOString());
			formData.append('bis', this.entschuldigung.bis.toISOString());

			const person_id = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id

			formData.append('person_id', person_id);

			// only close the modal once the upload actually succeeded, on error the
			// student keeps the filled form and can retry
			this.$api.call(ApiProfil.addEntschuldigung(formData))
				.then(res => {
					if (res.meta.status !== 'success' || !res.data) return

					const rowData = res.data
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
					this.entschuldigung = this.initEntschuldigungForm();
					this.$refs.modalContainerEntschuldigungUpload.hide()
				})
		},
		formAction: function(cell) {
			let download = document.createElement('div');
			download.className = "d-flex gap-3";

			let button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			const minwidth = '40px';
			
			if(cell.getData().dms_id) {
				button.innerHTML = '<i class="fa fa-download"></i>';
				button.style.minWidth = minwidth;
				button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
				button.title = this.$p.t('global/download');
				download.append(button);
			} else {
				button.innerHTML = '<i class="fa fa-upload"></i>';
				button.style.minWidth = minwidth;
				button.addEventListener('click', () => this.addEntschuldigungFile(cell.getData()));
				button.title = this.$p.t('global/upload');
				download.append(button);
			}

			if (cell.getData().akzeptiert == null)
			{
				button = document.createElement('button');
				button.className = 'btn btn-outline-secondary';
				button.style.minWidth = minwidth;
				button.innerHTML = '<i class="fa fa-xmark"></i>';
				button.title = this.$p.t('global/entschuldigungLöschen');
				button.addEventListener('click', () => this.deleteEntschuldigung(cell));
				download.append(button);
			}

			return download;
		},
		addEntschuldigungFile(entschuldigung) {
			this.editEntschuldigung = entschuldigung
			this.$refs.modalContainerEntschuldigungEdit.show()
		},
		downloadEntschuldigung: function(dms_id)
		{
			window.location = CoreRESTClient._generateRouterURI('extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile?entschuldigung=' + dms_id);
		},
		async deleteEntschuldigung(cell) {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			let entschuldigung_id = cell.getData().entschuldigung_id;
			this.$api.call(ApiProfil.deleteEntschuldigung(entschuldigung_id, this.$entryParams.selected_student_info?.person_id))
				.then(response => {

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
			// text input can produce invalid dates, treat them like missing input
			if(!this.entschuldigung.von || !this.isValidDateObj(this.entschuldigung.von)) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterVonZeit'));
				return false
			}
			if(!this.entschuldigung.bis || !this.isValidDateObj(this.entschuldigung.bis)) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterBisZeit'));
				return false
			}
			if(!this.entschuldigung.files.length && !this.noFileUpload) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningChooseFile'));
				return false
			}
			
			if (this.entschuldigung.bis < this.entschuldigung.von)
			{
				this.$fhcAlert.alertWarning(this.$p.t('global/errorValidateTimes'));
				return false
			}

			return true;
		},
		async loadEntschuldigungen() {
			// wait until the profile viewData (person_id) is resolved, then fetch and set the data
			await this.$entryParams.profileViewDataPromise

			const person_id = this.$entryParams.selected_student_info ? this.$entryParams.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id
			if (!person_id) return

			this.$api.call(ApiProfil.getEntschuldigungenByPersonID(person_id))
				.then(res => {
					this.$refs.entschuldigungsTable?.tabulator?.setData(res.data.retval ?? [])
				})
		},
		reload(){
			this.loadEntschuldigungen()
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

			// columns were defined in data() where phrasen might not have been resolved yet,
			// re-apply the titles by field once the phrasen are guaranteed to be loaded
			const titleKeys = {
				akzeptiert: 'global/status',
				von: 'ui/von',
				bis: 'global/bis',
				dms_id: 'ui/aktion',
				notiz: 'global/begruendungAnw'
			}
			this.$refs.entschuldigungsTable.tabulator.getColumns().forEach(col => {
				const key = titleKeys[col.getField()]
				if (key) col.updateDefinition({title: this.$capitalize(this.$p.t(key))})
			})

			this.loadEntschuldigungen()
		},
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		},
		calculateTableHeight() {

			const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
			const tableDataSet = document.getElementById('filterTableDataset' + tableID);
			if(!tableDataSet) return
			const rect = tableDataSet.getBoundingClientRect();

			const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight :  window.visualViewport.height
			this.$entryParams.tabHeights['studentEnt'].value = screenY - rect.top - this.$contentBottomOffset()

			if(this.$refs.entschuldigungsTable.tabulator) this.$refs.entschuldigungsTable.tabulator.redraw(true)

		}
	},
	mounted() {
		this.minDate = new Date(this.minDate).setHours(0,0)
		this.tableBuiltPromise = new Promise(this.tableResolve)
		this.setup()

		this.calculateTableHeight()
		window.addEventListener('resize', this.calculateTableHeight)
		window.addEventListener('orientationchange', this.calculateTableHeight)
	},
	unmounted() {
		window.removeEventListener('resize', this.calculateTableHeight)
		window.removeEventListener('orientationchange', this.calculateTableHeight)
	},
	watch: {
		'entschuldigung.files'(newVal) {
			if(!newVal || !newVal.length) return

			// check filetype of EVERY chosen file on input change. jfif files sneak through
			// with mime type image/jpeg, so they are excluded by filename
			const isAllowed = file => file.type && !file.name?.toLowerCase().includes('jfif') && (
				file.type.includes('jpeg')
				|| file.type.includes('pdf')
				|| file.type.includes('png'))

			if (![...newVal].every(isAllowed)) {
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
								:clearable="false"
								auto-apply
								:enable-time-picker="true"
								:start-time="entschuldigung.von"
								:format="formatDate"
								:min-date="new Date(minDate)"
								:start-date="new Date(minDate)"
								:text-input="true"
								>
							</datepicker>
						</div>
					</div>
					<div class="row mb-3 align-items-center">
						<div class="col-2 align-items-center"><label for="von" class="form-label">{{$capitalize($p.t('global/bis'))}}</label></div>
						<div class="col-10">
							<datepicker
								id="bis"
								v-model="entschuldigung.bis"
								:clearable="false"
								auto-apply
								:enable-time-picker="true"
								:start-time="entschuldigung.bis"
								:format="formatDate"
								:min-date="new Date(minDate)"
								:start-date="new Date(minDate)"
								:text-input="true"
								>
							</datepicker>
						</div>
					</div>
		
					
					<div class="row">
						<div class="col-8">
							<Upload :disabled="noFileUpload" accept=".jpg,.png,.pdf" v-model="entschuldigung.files"></Upload>
						</div>
						<div class="col-4">
							<div class="row">
								<div class="col-2"></div>
								<div class="col-2"><Checkbox v-model="noFileUpload" :binary="true"></Checkbox></div>
								<div class="col-8"><span>{{$p.t('global/excuseUploadNoFile')}}</span></div>
							</div>
						</div>
					</div>
				</template>
				<template v-slot:footer>
					<button class="btn btn-primary" @click="triggerUpload">{{$p.t('ui/hochladen')}}</button>
				</template>
			</bs-modal>
			
			<bs-modal ref="modalContainerEntschuldigungEdit" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>
					<div v-tooltip.bottom="getTooltipObj">
						{{$p.t('global/editEntschuldigung')}}
						<i class="fa fa-circle-question"></i>
					</div>
				</template>
				<template v-slot:default v-if="editEntschuldigung">
					<div class="row mb-3 align-items-center" >
						<div class="col-2 align-items-center"><label for="von" class="form-label">{{$capitalize($p.t('ui/von'))}}</label></div>
						<div class="col-10">
							<datepicker
								id="vonEdit"
								v-model="editEntschuldigung.von"
								:clearable="false"
								:format="formatDateEntschuldigungEdit"
								auto-apply
								:disabled="true">
							</datepicker>
						</div>
					</div>
					<div class="row mb-3 align-items-center">
						<div class="col-2 align-items-center"><label for="von" class="form-label">{{$capitalize($p.t('global/bis'))}}</label></div>
						<div class="col-10">
							<datepicker
								id="bisEdit"
								v-model="editEntschuldigung.bis"
								:clearable="false"
								:format="formatDateEntschuldigungEdit"
								auto-apply
								:disabled="true"
								>
							</datepicker>
						</div>
					</div>
		
					
					<div class="row">
						<div class="col-12">
							<Upload accept=".jpg,.png,.pdf" v-model="entschuldigung.files"></Upload>
						</div>
					</div>
				</template>
				<template v-slot:footer>
					<button class="btn btn-primary" @click="triggerEdit">{{$p.t('ui/hochladen')}}</button>
				</template>
			</bs-modal>
			
			<core-filter-cmpt
				ref="entschuldigungsTable"
				@uuidDefined="handleUuidDefined"
				:tabulator-options="entschuldigungsViewTabulatorOptions"
				:isUsingPresets="true"
				presetsId="anwesenheitenStudentEntschuldigungTable"
				:table-only="true"
				:newBtnShow="true"
				:newBtnLabel="$p.t('global/entschuldigungHochladen')"
				@click:new="startUploadEntschuldigung"
				:sideMenu="false"
			></core-filter-cmpt>
		</template>
	</core-base-layout>
`
};