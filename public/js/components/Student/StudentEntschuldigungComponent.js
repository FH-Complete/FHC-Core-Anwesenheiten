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
					return response.data.retval
				},
				selectable: false,
				placeholder: this._.root.appContext.config.globalProperties.$p.t('global/noDataAvailable'),
				layout:"fitColumns",
				rowFormatter: universalFormatter.entschuldigungRowFormatter,
				columns: [
					{title: this.$p.t('global/status'), field: 'akzeptiert', formatter: universalFormatter.entschuldigungstatusFormatter, minWidth: 150, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: studentFormatters.formDate, minWidth: 150, widthGrow: 1},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: studentFormatters.formDate, minWidth: 150, widthGrow: 1},
					{title: this.$p.t('ui/aktion'), field: 'dms_id', formatter: this.formAction, widthGrow: 1, tooltip: false},
				],
				persistence:true,
				persistenceID: "studentEntschuldigungenTable"
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
			if(!this.entschuldigung.von) this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterVonZeit'));
			if(!this.entschuldigung.bis) this.$fhcAlert.alertWarning(this.$p.t('global/warningEnterBisZeit'));
			if(!this.entschuldigung.files.length) this.$fhcAlert.alertWarning(this.$p.t('global/warningChooseFile'));

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
				this.$fhcAlert.alertSuccess(this.$p.t('global/entschuldigungUploaded'));
				this.resetFormData();

			}).catch(err => {
				this.$fhcAlert.alertError(this.$p.t('global/errorEntschuldigungUpload'));
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
			window.location = CoreRESTClient._generateRouterURI('extensions/FHC-Core-Anwesenheiten/Info/studentDownload?entschuldigung=' + dms_id);
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
					this.$fhcAlert.alertSuccess(this.$p.t('global/entschuldigungLöschenErfolg'));
				}
			});
		},
		startUploadEntschuldigung(){
			this.$refs.modalContainerEntschuldigungUpload.show()
		},
		validate: function() {
			// javaScript Date objects are 0-indexed, subtract 1 from the month

			const vonParts = this.entschuldigung.von.split(/[ .:]/); // Split by dot, space, or colon
			const vonDate = new Date(vonParts[2], vonParts[1] - 1, vonParts[0], vonParts[3], vonParts[4]);

			const bisParts = this.entschuldigung.bis.split(/[ .:]/); // Split by dot, space, or colon
			const bisDate = new Date(bisParts[2], bisParts[1] - 1, bisParts[0], bisParts[3], bisParts[4]);

			if (bisDate < vonDate)
			{
				this.$fhcAlert.alertError(this.$p.t('global/errorValidateTimes'));
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
	},
	mounted() {

	},
	template: `

	<core-base-layout
		:title="filterTitle">
		<template #main>
			<bs-modal ref="modalContainerEntschuldigungUpload" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>{{$p.t('global/addEntschuldigung')}}</template>
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
								model-type="dd.MM.yyyy HH:mm">
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
								model-type="dd.MM.yyyy HH:mm">
							</datepicker>
						</div>
					</div>
		
					
					<div class="row">
						<Upload ref="uploadComponent" v-model="entschuldigung.files"></Upload>
					</div>
				</template>
				<template v-slot:footer>
					<button class="btn btn-primary" @click="triggerUpload">{{$p.t('ui/hochladen')}}</button>
				</template>
			</bs-modal>
			<core-filter-cmpt
				ref="entschuldigungsTable"
				:tabulator-options="entschuldigungsViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
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


