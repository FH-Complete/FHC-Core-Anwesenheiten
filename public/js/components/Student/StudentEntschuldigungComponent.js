import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../formatters/formatters.js";
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import Upload from '../../../../../js/components/Form/Upload/Dms.js';
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import AnwHelp from '../AnwHelp.js';
import NarrowScreen from '../../mixins/NarrowScreen.js';
import ApiProfil from '../../api/factory/profil.js'
export default {
	name: 'StudentEntschuldigungComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		BsModal,
		Upload,
		AnwHelp,
		"datepicker": VueDatePicker
	},
	mixins: [NarrowScreen],
	data: function() {
		return {
			noFileUpload: false,
			uploading: false,
			editEntschuldigung: null,
			tabulatorUuid: Vue.ref(0),
			entschuldigung: this.initEntschuldigungForm(),
			minDate: this.calcMinDate(),
			tableBuiltPromise: null,
			// the rows of the table, the list below md shows the same rows
			entschuldigungen: null,
			entschuldigungsViewTabulatorOptions: {
				// data is fetched and set from outside (loadEntschuldigungen) instead of tabulator ajax options:
				// the ajax fetch fired on table build, before person_id was resolved, and tabulator
				// displayed a confusing error placeholder to students until the request chain settled
				height: this.$entryParams.tabHeights.studentEnt,
				placeholder: this.$p.t('global/noDataAvailable'),
				debugInvalidComponentFuncs:false,
				// fitColumns keeps the table inside its container, the begruendung takes the free space
				layout:"fitColumns",
				pagination: true,
				paginationSize: 100,
				columns: [
					{title: this.$capitalize(this.$p.t('global/status')), field: 'akzeptiert', formatter: this.entschuldigungstatusFormatter, minWidth: 150, tooltip: false, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: studentFormatters.formDate, minWidth: 140, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: studentFormatters.formDate, minWidth: 140, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('ui/aktion')), field: 'dms_id', formatter: this.formAction, widthGrow: 1, minWidth: 110, tooltip: false},
					// the textarea formatter wraps a long begruendung instead of cutting it off
					{title: this.$capitalize(this.$p.t('global/begruendungAnw')), field: 'notiz', formatter: 'textarea', tooltip:false, minWidth: 200, widthGrow: 3}
				],
				persistence: {
					sort: false,
					filter: true,
					headerFilter: false,
					group: true,
					page: true,
					// visibility and order only. fitColumns computes the widths from the container,
					// a stored width became a fixed width and did not fit the next window size
					columns: ['visible'],
				},
				persistenceID: this.$entryParams.patchdate + "-studentEntschuldigungenTable"
			},
			entschuldigungsViewTabulatorEventHandlers: [{
				event: "tableBuilt",
				handler: async () => {
					await this.$entryParams.phrasenPromise

					this.tableBuiltResolve()
				}
			}, {
				event: "renderComplete",
				handler: () => this.fitToScrollbar()
			}],
			scrollbarWidth: 0,
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
		// older safari versions only parse the iso form '2026-03-01T08:00:00' of a postgres timestamp
		formatTimestamp(value) {
			let date = new Date(value)
			if (isNaN(date)) date = new Date(String(value).replace(' ', 'T'))
			if (isNaN(date)) return value

			return this.formatDate(date)
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
		// status of an entschuldigung as the table and the list show it
		entStatus(akzeptiert) {
			if (akzeptiert === true)
				return {tone: 'accepted', icon: 'fa-circle-check', label: this.$p.t('global/entschuldigungStatusAkzeptiert')}
			if (akzeptiert === false)
				return {tone: 'rejected', icon: 'fa-circle-xmark', label: this.$p.t('global/entschuldigungStatusAbgelehnt')}

			return {tone: 'open', icon: 'fa-hourglass-half', label: this.$p.t('global/entschuldigungStatusOffen')}
		},
		entschuldigungstatusFormatter(cell) {
			const status = this.entStatus(cell.getValue())

			const pill = document.createElement('span')
			pill.className = 'anw-pill anw-pill--' + status.tone
			pill.innerHTML = '<i class="fa-solid ' + status.icon + '" aria-hidden="true"></i>'
			pill.append(status.label)

			return pill
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

			// only close the modal on success, on error the student can retry
			this.$api.call(ApiProfil.editEntschuldigung(formData))
				.then(response => {

				if (response.meta.status === "success")
				{
					const entschuldigung_id = response.data.entschuldigung_id

					// the list and the table share the row objects, the update through the reactive
					// list item also changes the table data. The table still needs the row update to render
					const listItem = this.entschuldigungen?.find(ent => ent.entschuldigung_id == entschuldigung_id)
					if (listItem) listItem.dms_id = response.data.dms_id

					const targetRow = this.findTableRow(entschuldigung_id)
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

			// only close the modal once the upload actually succeeded, on error the
			// student keeps the filled form and can retry
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
		findTableRow(entschuldigung_id) {
			return this.$refs.entschuldigungsTable?.tabulator?.getRows()
				.find(row => row.getData().entschuldigung_id == entschuldigung_id)
		},
		createActionButton(icon, title, variant, onClick) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'btn btn-sm anw-action-btn ' + variant;
			button.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
			button.title = title;
			button.setAttribute('aria-label', title);
			button.addEventListener('click', onClick);

			return button;
		},
		formAction: function(cell) {
			const data = cell.getData()
			const actions = document.createElement('div');
			actions.className = "d-flex gap-2";

			if(data.dms_id) {
				actions.append(this.createActionButton('fa-download', this.$p.t('global/download'), 'btn-outline-secondary',
					() => this.downloadEntschuldigung(data.dms_id)));
			} else {
				actions.append(this.createActionButton('fa-upload', this.$p.t('global/upload'), 'btn-outline-primary',
					() => this.addEntschuldigungFile(data)));
			}

			if (data.akzeptiert == null)
			{
				// the dark theme of cis4 turns btn-outline-danger into white text on light red, so only the icon is red
				actions.append(this.createActionButton('fa-trash-can text-danger', this.$p.t('global/entschuldigungLöschen'), 'btn-outline-secondary',
					() => this.deleteEntschuldigung(data)));
			}

			return actions;
		},
		addEntschuldigungFile(entschuldigung) {
			this.editEntschuldigung = entschuldigung
			this.$refs.modalContainerEntschuldigungEdit.show()
		},
		downloadEntschuldigung: function(dms_id)
		{
			window.location = CoreRESTClient._generateRouterURI('extensions/FHC-Core-Anwesenheiten/Profil/getEntschuldigungFile?entschuldigung=' + dms_id);
		},
		async deleteEntschuldigung(entschuldigung) {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			const entschuldigung_id = entschuldigung.entschuldigung_id;
			this.$api.call(ApiProfil.deleteEntschuldigung(entschuldigung_id, this.$entryParams.selected_student_info?.person_id))
				.then(response => {

				if (response.meta.status === "success")
				{
					if (this.entschuldigungen)
						this.entschuldigungen = this.entschuldigungen.filter(ent => ent.entschuldigung_id != entschuldigung_id)
					this.findTableRow(entschuldigung_id)?.delete()
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
					const rows = res.data.retval ?? []

					this.entschuldigungen = rows
					this.$refs.entschuldigungsTable?.tabulator?.setData(rows)
				})
		},
		reload(){
			this.loadEntschuldigungen()
		},
		redrawTable() {
			if(this.isNarrow) return
			if(this.$refs?.entschuldigungsTable?.tabulator) this.$refs.entschuldigungsTable.tabulator.redraw(true)
		},
		// fitColumns sizes the columns when the table lays out. A vertical scrollbar that shows up
		// later (more rows) pushes the columns behind it, so they need a new layout
		fitToScrollbar() {
			const tabulator = this.$refs.entschuldigungsTable?.tabulator
			const holder = tabulator?.element.querySelector('.tabulator-tableholder')
			if(!holder) return

			const scrollbarWidth = holder.offsetWidth - holder.clientWidth
			if(scrollbarWidth === this.scrollbarWidth) return

			this.scrollbarWidth = scrollbarWidth
			tabulator.redraw()
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
			// below md the list replaces the hidden table
			if(this.isNarrow) return

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
			const file = newVal?.[0]
			if(!file) return

			// check the file on selection, so the user does not wait for an upload the server rejects
			const error = this.validateFile(file)
			if(error) {
				this.$fhcAlert.alertWarning(error)
				this.entschuldigung.files = []
			}

		},
		// the table was hidden, it measures its height again once it shows
		isNarrow(narrow) {
			if (!narrow) this.$nextTick(this.calculateTableHeight)
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
		},
		helpText() {
			return this.$p.t('global/tooltipStudentEntschuldigung', [this.$entryParams.permissions.entschuldigungMaxReach])
		},
		// the entschuldigungen as the list shows them
		listItems() {
			return (this.entschuldigungen ?? []).map(ent => ({
				ent,
				status: this.entStatus(ent.akzeptiert),
				von: this.formatTimestamp(ent.von),
				bis: this.formatTimestamp(ent.bis)
			}))
		}
	},
	template: `

	<core-base-layout
		:title="filterTitle">
		<template #main>
			<bs-modal ref="modalContainerEntschuldigungUpload" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>
					<span class="d-inline-flex align-items-center gap-2">
						{{$p.t('global/addEntschuldigung')}}
						<anw-help button-class="fs-5" :text="helpText"></anw-help>
					</span>
				</template>
				<template v-slot:default>
					<div class="row g-3">
						<div class="col-12 col-sm-6">
							<label for="von" class="form-label">{{$capitalize($p.t('ui/von'))}}</label>
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
						<div class="col-12 col-sm-6">
							<label for="bis" class="form-label">{{$capitalize($p.t('global/bis'))}}</label>
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
					<span class="d-inline-flex align-items-center gap-2">
						{{$p.t('global/editEntschuldigung')}}
						<anw-help button-class="fs-5" :text="helpText"></anw-help>
					</span>
				</template>
				<template v-slot:default v-if="editEntschuldigung">
					<div class="row g-3">
						<div class="col-12 col-sm-6">
							<label for="vonEdit" class="form-label">{{$capitalize($p.t('ui/von'))}}</label>
							<datepicker
								id="vonEdit"
								v-model="editEntschuldigung.von"
								:clearable="false"
								:format="formatDateEntschuldigungEdit"
								auto-apply
								:disabled="true">
							</datepicker>
						</div>
						<div class="col-12 col-sm-6">
							<label for="bisEdit" class="form-label">{{$capitalize($p.t('global/bis'))}}</label>
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

			<div v-show="!isNarrow">
				<core-filter-cmpt
					ref="entschuldigungsTable"
					@uuidDefined="handleUuidDefined"
					:tabulator-options="entschuldigungsViewTabulatorOptions"
					:tabulator-events="entschuldigungsViewTabulatorEventHandlers"
					:isUsingPresets="true"
					presetsId="anwesenheitenStudentEntschuldigungTable"
					:table-only="true"
					:newBtnShow="true"
					:newBtnLabel="$p.t('global/entschuldigungHochladen')"
					@click:new="startUploadEntschuldigung"
					:sideMenu="false"
				></core-filter-cmpt>
			</div>

			<div v-if="isNarrow" class="anw-list">
				<button type="button" class="btn btn-primary w-100" @click="startUploadEntschuldigung">
					<i class="fa-solid fa-plus me-2" aria-hidden="true"></i>{{ $p.t('global/entschuldigungHochladen') }}
				</button>

				<div v-if="entschuldigungen === null" class="anw-list-empty">
					<i class="fa-solid fa-spinner fa-pulse fa-2x" aria-hidden="true"></i>
				</div>
				<div v-else-if="!listItems.length" class="anw-list-empty">{{ $p.t('global/noDataAvailable') }}</div>

				<div v-for="item in listItems" :key="item.ent.entschuldigung_id" class="anw-card anw-ent">
					<div class="anw-ent-head">
						<span class="anw-pill" :class="'anw-pill--' + item.status.tone">
							<i class="fa-solid" :class="item.status.icon" aria-hidden="true"></i>{{ item.status.label }}
						</span>
					</div>
					<dl class="anw-ent-range">
						<div>
							<dt>{{ $capitalize($p.t('ui/von')) }}</dt>
							<dd>{{ item.von }}</dd>
						</div>
						<div>
							<dt>{{ $capitalize($p.t('global/bis')) }}</dt>
							<dd>{{ item.bis }}</dd>
						</div>
					</dl>
					<div v-if="item.ent.notiz" class="anw-ent-note">
						<div class="anw-ent-label">{{ $capitalize($p.t('global/begruendungAnw')) }}</div>
						<div class="anw-ent-note-text">{{ item.ent.notiz }}</div>
					</div>
					<div class="anw-ent-actions">
						<button v-if="item.ent.dms_id" type="button" class="btn btn-sm btn-outline-secondary" @click="downloadEntschuldigung(item.ent.dms_id)">
							<i class="fa-solid fa-download me-2" aria-hidden="true"></i>{{ $p.t('global/download') }}
						</button>
						<button v-else type="button" class="btn btn-sm btn-outline-primary" @click="addEntschuldigungFile(item.ent)">
							<i class="fa-solid fa-upload me-2" aria-hidden="true"></i>{{ $p.t('global/upload') }}
						</button>
						<button v-if="item.ent.akzeptiert == null" type="button" class="btn btn-sm btn-outline-secondary" @click="deleteEntschuldigung(item.ent)">
							<i class="fa-solid fa-trash-can text-danger me-2" aria-hidden="true"></i>{{ $p.t('global/loeschen') }}
						</button>
					</div>
				</div>
			</div>
		</template>
	</core-base-layout>
`
};
