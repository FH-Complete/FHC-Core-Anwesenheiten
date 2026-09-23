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
			uploading: false,
			editEntschuldigung: null,
			tabulatorUuid: Vue.ref(0),
			entschuldigung: this.initEntschuldigungForm(),
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
			// calc max reach offset into workdays
			let d = new Date();
			for (let x = this.$entryParams.permissions.entschuldigungMaxReach; x > 0; x--) {
				// step 3 times on monday, else step once per counter
				d.setDate(d.getDate() - (d.getDay() === 1 ? 3 : 1));
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

			this.uploading = true
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
			}).catch(this.handleUploadRequestError)
			.finally(()=> {
				// the modal stays open after an error, so the user can choose another file right away
				this.uploading = false
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

			this.uploading = true
			this.$api.call(ApiProfil.addEntschuldigung(formData))
				.then(res => {
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
				this.entschuldigung = this.initEntschuldigungForm();
				this.$refs.modalContainerEntschuldigungUpload.hide()
			}).catch(this.handleUploadRequestError)
			.finally(() => {
				// the modal stays open after an error, so the user can choose another file right away
				this.uploading = false
			})
		},
		handleUploadRequestError(error) {
			// the api plugin already shows the backend message. A web server in front of PHP rejects a too large
			// request with status 413 and without a json body, the api plugin then shows nothing.
			if (error?.response?.status === 413)
				this.$fhcAlert.alertError(this.$p.t('global/filesizeExceeded'))
			else if (!error?.handled)
				throw error
		},
		validateFile(file) {
			if (!this.allowedFiletypes.includes(this.getFileExtension(file.name)))
				return this.$p.t('global/errorEntUploadFiletype', {file: file.name, filetypes: this.filetypesLabel})

			if (file.size === 0)
				return this.$p.t('global/errorEntUploadEmptyFile', {file: file.name})

			const maxFileSize = this.$entryParams.permissions.entschuldigungMaxFileSize
			if (maxFileSize > 0 && file.size > maxFileSize)
				return this.$p.t('global/errorEntUploadFileTooLarge', {
					// round the file size up and the limit down, so a file above the limit never shows the same number
					size: this.formatMegabytes(file.size, true),
					max: this.formatMegabytes(maxFileSize, false)
				})

			return null
		},
		getFileExtension(fileName) {
			// same rule as the backend upload: the text after the last dot in lower case
			const parts = fileName.split('.')
			return parts.length > 1 ? parts.pop().toLowerCase() : ''
		},
		formatMegabytes(bytes, roundUp) {
			const tenths = bytes / 1048576 * 10
			const megabytes = String((roundUp ? Math.ceil(tenths) : Math.floor(tenths)) / 10)
			return this.$p.user_language.value === 'German' ? megabytes.replace('.', ',') : megabytes
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
			} else if (cell.getData().akzeptiert == null) {
				// the backend accepts a document only while the entschuldigung is open
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
				button.addEventListener('click', () => this.deleteEntschuldigung(cell, 'decline'));
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
			// todo: check for von/bis input never toched => von still exists as initialized hours minutes object
			if(!this.entschuldigung.von) {
				this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterVonZeit'));
				return false
			}
			if(!this.entschuldigung.bis) {
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
		reload(){
			const id = this.$entryParams.selected_student_info ? this.$entryParams.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id
			this.$api.call(ApiProfil.getEntschuldigungenByPersonID(id))
				.then(res => {
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
		},
		calculateTableHeight() {

			const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
			const tableDataSet = document.getElementById('filterTableDataset' + tableID);
			if(!tableDataSet) return
			const rect = tableDataSet.getBoundingClientRect();

			const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight :  window.visualViewport.height
			this.$entryParams.tabHeights['studentEnt'].value = screenY - rect.top

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
			const file = newVal?.[0]
			if(!file) return

			// check the file on selection, so the user does not wait for an upload the server rejects
			const error = this.validateFile(file)
			if(error) {
				this.$fhcAlert.alertWarning(error)
				this.entschuldigung.files = []
			}
		}
	},
	computed: {
		allowedFiletypes() {
			return this.$entryParams.permissions.entschuldigungFiletypes
		},
		filetypesLabel() {
			return this.allowedFiletypes.map(type => type.toUpperCase()).join(', ')
		},
		acceptedFiletypes() {
			return this.allowedFiletypes.map(type => '.' + type).join(',')
		},
		uploadHint() {
			const hint = [this.$p.t('global/entUploadAllowedFiletypes', {filetypes: this.filetypesLabel})]

			const maxFileSize = this.$entryParams.permissions.entschuldigungMaxFileSize
			if (maxFileSize > 0)
				hint.push(this.$p.t('global/entUploadMaxFilesize', {max: this.formatMegabytes(maxFileSize, false)}))

			return hint.join(' ')
		},
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
							<Upload :disabled="noFileUpload" :accept="acceptedFiletypes" v-model="entschuldigung.files"></Upload>
							<div class="form-text">{{ uploadHint }}</div>
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
					<button class="btn btn-primary" :disabled="uploading" @click="triggerUpload">
						<i v-if="uploading" class="fa fa-spinner fa-spin me-1"></i>{{$p.t('ui/hochladen')}}
					</button>
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
							<Upload :accept="acceptedFiletypes" v-model="entschuldigung.files"></Upload>
							<div class="form-text">{{ uploadHint }}</div>
						</div>
					</div>
				</template>
				<template v-slot:footer>
					<button class="btn btn-primary" :disabled="uploading" @click="triggerEdit">
						<i v-if="uploading" class="fa fa-spinner fa-spin me-1"></i>{{$p.t('ui/hochladen')}}
					</button>
				</template>
			</bs-modal>
			
			<core-filter-cmpt
				ref="entschuldigungsTable"
				@uuidDefined="handleUuidDefined"
				:tabulator-options="entschuldigungsViewTabulatorOptions"
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