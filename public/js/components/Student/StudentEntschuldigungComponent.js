import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters, universalFormatter} from "../../mixins/formatters";
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';

import Upload from '../../../../../js/components/Form/Upload/Dms.js';
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';

export default {
	name: 'StudentEntschuldigungComponent',
	components: {
		CoreBaseLayout,
		CoreRESTClient,
		CoreFilterCmpt,
		Upload,
		"datepicker": VueDatePicker
	},
	data: function() {
		return {
			entschuldigung: {
				von: null,
				bis: null,
				files: []
			},
			entschuldigungsViewTabulatorOptions: {
				selectable: false,
				placeholder: "Keine Daten verfügbar",
				maxHeight: "400px",
				layout:"fitColumns",
				rowFormatter: universalFormatter.entschuldigungRowFormatter,
				columns: [
					{title: 'Status', field: 'akzeptiert', formatter: universalFormatter.entschuldigungstatusFormatter, widthGrow: 1},
					{title: 'Von', field: 'von', formatter: studentFormatters.formDate, widthGrow: 1},
					{title: 'Bis', field: 'bis', formatter: studentFormatters.formDate, widthGrow: 1},
					{title: 'Action', field: 'dms_id', formatter: this.formAction, widthGrow: 1},
				],
			},
			startTime: Vue.ref({ hours: 0, minutes: 0 }),
			filterTitle: ""
		};
	},
	methods: {
		loadEntschuldigungen: function()
		{
			Vue.$fhcapi.Student.getEntschuldigungenByPerson().then(response => {
				console.log('getEntschuldigungenByPerson', response);
				// TODO(johann): rework status check once fhcapi plugin is installed

				this.$refs.entschuldigungsTable.tabulator.setData(response.data.data.retval);

			});
		},
		triggerUpload() {
			if (!this.entschuldigung.von || !this.entschuldigung.bis || this.entschuldigung.files.length === 0)
			{
				return this.$fhcAlert.alertWarning('Bitte alle Felder ausfüllen');
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
			Vue.$fhcapi.Student.addEntschuldigung(formData).then(response => {
				console.log('addEntschuldigung', response)

				// TODO(johann): rework status check once fhcapi plugin is installed
				let rowData = response.data.data
				this.$refs.entschuldigungsTable.tabulator.addRow(
					{
						'dms_id': rowData.dms_id,
						'akzeptiert': null,
						'von': rowData.von,
						'bis': rowData.bis,
						'entschuldigung_id': rowData.entschuldigung_id
					}
					, true);
				// this.ssChangedHandler(this.studiensemester);
				this.$fhcAlert.alertSuccess('Entschuldigung hochgeladen');
				this.resetFormData();

			});
		},
		formAction: function(cell) {
			let download = document.createElement('div');
			download.className = "d-flex gap-3";

			let button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';

			button.innerHTML = '<i class="fa fa-download"></i>';
			button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
			download.append(button);

			if (cell.getData().akzeptiert == null)
			{
				button = document.createElement('button');
				button.className = 'btn btn-outline-secondary';
				button.innerHTML = '<i class="fa fa-xmark"></i>';

				button.addEventListener('click', () => this.deleteEntschuldigung(cell, 'decline'));
				download.append(button);
			}

			return download;
		},
		downloadEntschuldigung: function(dms_id)
		{
			window.location = CoreRESTClient._generateRouterURI('/extensions/FHC-Core-Anwesenheiten/Api/studentDownload?entschuldigung=' + dms_id);
		},
		deleteEntschuldigung: function(cell) {
			let entschuldigung_id = cell.getData().entschuldigung_id;
			Vue.$fhcapi.Student.deleteEntschuldigung(entschuldigung_id).then(response => {
				console.log('deleteEntschuldigung', response)

				// TODO(johann): rework status check once fhcapi plugin is installed
				if (response.status === 200)
				{
					cell.getRow().delete()
					// this.ssChangedHandler(this.studiensemester);
					this.$fhcAlert.alertSuccess('Entschuldigung erfolgreich gelöscht');
				}
			});
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
				von: null,
				bis: null,
				files: []
			};
		},
	},
	mounted() {
		this.loadEntschuldigungen();
	},
	watch: {
		'entschuldigung.von'(newValue) {
			if (this.entschuldigung.bis === null)
				this.entschuldigung.bis = newValue;
		},
	},
	template: `

	<core-base-layout
		:title="filterTitle"
		mainCols="8"
		asideCols="4">
		<template #main>
			<core-filter-cmpt
				ref="entschuldigungsTable"
				:tabulator-options="entschuldigungsViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
				:sideMenu=false
			></core-filter-cmpt>
		</template>
		<template #aside>
			<div class="row mb-3 align-items-center">
				<label for="text" class="form-label">Entschuldigung hochladen</label>
			</div>
			<div class="row mb-3 align-items-center">
				<div class="col-2 align-items-center"><label for="von" class="form-label">Von</label></div>
				<div class="col-10">
					<datepicker
						id="von"
						v-model="entschuldigung.von"
						clearable="false"
						auto-apply
						:enable-time-picker="true"
						:start-time="startTime"
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
						:start-time="startTime"
						format="dd.MM.yyyy HH:mm"
						model-type="dd.MM.yyyy HH:mm">
					</datepicker>
				</div>
			</div>

			
			<div class="row">
			  <div class="col-8">
				<Upload ref="uploadComponent" v-model="entschuldigung.files"></Upload>
			  </div>
			  <div class="col-4"> 
				<button class="btn btn-primary" @click="triggerUpload">Upload</button>
			  </div>
			</div>

		</template>
	</core-base-layout>
`
};


