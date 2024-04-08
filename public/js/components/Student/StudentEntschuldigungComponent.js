import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters, universalFormatter} from "../../mixins/formatters";
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
			entschuldigung: {
				von: Vue.ref({ hours: 0, minutes: 0 }),
				bis: Vue.ref({ hours: 23, minutes: 59 }),
				files: []
			},
			entschuldigungsViewTabulatorOptions: {
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+'/extensions/FHC-Core-Anwesenheiten/Api/studentGetEntschuldigungenByPerson',
				ajaxResponse: (url, params, response) => {
					console.log('getEntschuldigungenByPerson', response)
					// TODO(johann): rework status check once fhcapi plugin is installed
					return response.data.retval
				},
				selectable: false,
				placeholder: "Keine Daten verfügbar",
				layout:"fitColumns",
				rowFormatter: universalFormatter.entschuldigungRowFormatter,
				columns: [
					{title: 'Status', field: 'akzeptiert', formatter: universalFormatter.entschuldigungstatusFormatter, widthGrow: 1, minWidth: 150},
					{title: 'Von', field: 'von', formatter: studentFormatters.formDate, widthGrow: 1, minWidth: 150},
					{title: 'Bis', field: 'bis', formatter: studentFormatters.formDate, widthGrow: 1, minWidth: 150},
					{title: 'Action', field: 'dms_id', formatter: this.formAction, widthGrow: 1, minWidth: 150, tooltip: false},
				],
			},
			filterTitle: ""
		};
	},
	methods: {
		loadEntschuldigungen: function()
		{
			this.$fhcApi.get(
				'extensions/FHC-Core-Anwesenheiten/Api/studentGetEntschuldigungenByPerson',
			).then(res => {
				console.log('getEntschuldigungenByPerson', res);
				this.$refs.entschuldigungsTable.tabulator.setData(res.data);
			});
		},
		triggerUpload() {
			if(!this.entschuldigung.von) this.$fhcAlert.alertWarning('Bitte von Zeit eingeben');
			if(!this.entschuldigung.bis) this.$fhcAlert.alertWarning('Bitte bis Zeit eingeben');
			if(!this.entschuldigung.von) this.$fhcAlert.alertWarning('Bitte Datei auswählen');

			if (!this.entschuldigung.von || !this.entschuldigung.bis || this.entschuldigung.files.length === 0)
			{
				return
			}
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
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/studentAddEntschuldigung',
				formData,{Headers: { "Content-Type": "multipart/form-data" }}
			).then(res => {
				console.log('addEntschuldigung', res)
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
				this.$fhcAlert.alertSuccess('Entschuldigung hochgeladen');
				this.resetFormData();

			}).catch(err => {
				this.$fhcAlert.alertError('Fehler bei dem Versuch eine Entschuldigung hochzuladen!');
			});

			this.$refs.modalContainerEntschuldigungUpload.hide()
		},
		formAction: function(cell) {
			let download = document.createElement('div');
			download.className = "d-flex gap-3";

			let button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';

			button.innerHTML = '<i class="fa fa-download"></i>';
			button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
			button.title = 'Download';
			download.append(button);

			if (cell.getData().akzeptiert == null)
			{
				button = document.createElement('button');
				button.className = 'btn btn-outline-secondary';
				button.innerHTML = '<i class="fa fa-xmark"></i>';
				button.title = 'Entschuldigung löschen';
				button.addEventListener('click', () => this.deleteEntschuldigung(cell, 'decline'));
				download.append(button);
			}

			return download;
		},
		downloadEntschuldigung: function(dms_id)
		{
			window.location = CoreRESTClient._generateRouterURI('/extensions/FHC-Core-Anwesenheiten/Api/studentDownload?entschuldigung=' + dms_id);
		},
		async deleteEntschuldigung(cell) {
			if (await this.$fhcAlert.confirmDelete() === false)
				return;

			let entschuldigung_id = cell.getData().entschuldigung_id;
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/studentDeleteEntschuldigung',
				{entschuldigung_id}
			).then(response => {
				console.log('deleteEntschuldigung', response)

				if (response.meta.status === "success")
				{
					cell.getRow().delete()
					this.$fhcAlert.alertSuccess('Entschuldigung erfolgreich gelöscht');
				}
			});
		},
		startUploadEntschuldigung(){
			this.$refs.modalContainerEntschuldigungUpload.show()
		},
		validate: function() {
			const vonDate = this.entschuldigung.von;
			const bisDate = this.entschuldigung.bis;

			if (bisDate < vonDate)
			{
				this.$fhcAlert.alertError('Das Enddatum muss nach dem Startdatum liegen.');
				return false
			}

			/*const oneMonthLater = vonDate;
			oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
			if (bisDate > oneMonthLater)
			{
				return confirm('Der eingegebener Zeitraum ist auffallend hoch. Dennoch speichern?');
			}*/
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
	},
	mounted() {
		// this.loadEntschuldigungen();
	},
	template: `

	<core-base-layout
		:title="filterTitle">
		<template #main>
			<bs-modal ref="modalContainerEntschuldigungUpload" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>Entschuldigung hinzufügen</template>
				<template v-slot:default>
					<div class="row mb-3 align-items-center">
						<div class="col-2 align-items-center"><label for="von" class="form-label">Von</label></div>
						<div class="col-10">
							<datepicker
								id="von"
								v-model="entschuldigung.von"
								clearable="false"
								auto-apply
								:enable-time-picker="true"
								:start-time="entschuldigung.von"
								format="dd.MM.yyyy HH:mm"
								model-type="dd.MM.yyyy HH:mm">
							</datepicker>
						</div>
					</div>
					<div class="row mb-3 align-items-center">
						<div class="col-2 align-items-center"><label for="von" class="form-label">Bis</label></div>
						<div class="col-10">
							<datepicker
								id="bis"
								v-model="entschuldigung.bis"
								clearable="false"
								auto-apply
								:enable-time-picker="true"
								:start-time="entschuldigung.bis"
								format="dd.MM.yyyy HH:mm"
								model-type="dd.MM.yyyy HH:mm">
							</datepicker>
						</div>
					</div>
		
					
					<div class="row">
						<Upload ref="uploadComponent" v-model="entschuldigung.files"></Upload>
					</div>
				</template>
				<template v-slot:footer>
					<button class="btn btn-primary" @click="triggerUpload">Upload</button>
				</template>
			</bs-modal>
			<core-filter-cmpt
				ref="entschuldigungsTable"
				:tabulator-options="entschuldigungsViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
				newBtnShow=true
				newBtnLabel="Entschuldigung hochladen"
				@click:new=startUploadEntschuldigung
				:sideMenu=false
			></core-filter-cmpt>
		</template>
	</core-base-layout>
`
};


