import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters, universalFormatter} from "../../mixins/formatters";
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';

export default {
	name: 'AssistenzComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreFilterCmpt,
		CoreRESTClient,
		Datepicker: VueDatePicker,
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			zeitraum: {
				von: null,
				bis: null
			},
			assistenzViewTabulatorOptions: {
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+'/extensions/FHC-Core-Anwesenheiten/Api/assistenzGetEntschuldigungen',
				ajaxResponse: (url, params, response) => {
					console.log('getEntschuldigungen', response)
					return response.data.retval
				},
				layout: 'fitColumns',
				selectable: false,
				placeholder: "Keine Daten verfügbar",
				rowFormatter: universalFormatter.entschuldigungRowFormatter,
				columns: [
					{title: 'Vorname', field: 'vorname'},
					{title: 'Nachname', field: 'nachname'},
					{title: 'Status', field: 'akzeptiert', formatter: universalFormatter.entschuldigungstatusFormatter},
					{title: 'Von', field: 'von', formatter: studentFormatters.formDate, minWidth: 150},
					{title: 'Bis', field: 'bis', formatter: studentFormatters.formDate, minWidth: 150},
					{title: 'Action', field: 'entschuldigung_id', formatter: this.formAction, minWidth: 150, tooltip:false},
				],
			}
		};
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		updateEntschuldigung: function(cell, status)
		{
			let entschuldigung_id = cell.getData().entschuldigung_id;
			Vue.$fhcapi.Assistenz.updateEntschuldigung(entschuldigung_id, status).then(response => {
				console.log('updateEntschuldigung', response)

				// TODO(johann): check status/error and/or refactor for fhcapi plugin
				if (response.status === 200)
				{
					cell.getRow().update({'akzeptiert': status});
					//  TODO(johann): differentiate between accept and deny!
					this.$fhcAlert.alertSuccess('Erfolgreich gespeichert');
				}
			});
		},
		downloadEntschuldigung: function(dms_id)
		{
			//TODO fixen damit es die assistenz runterladen kann
			window.location = CoreRESTClient._generateRouterURI('/extensions/FHC-Core-Anwesenheiten/Api/studentDownload?entschuldigung=' + dms_id);
		},
		formAction: function(cell)
		{
			let download = document.createElement('div');
			download.className = "d-flex gap-3";

			let button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';

			button.innerHTML = '<i class="fa fa-download"></i>';
			button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
			button.title = 'Download';
			download.append(button);

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.innerHTML = '<i class="fa fa-check"></i>';
			button.title = 'Entschuldigung akzeptieren';
			button.addEventListener('click', () => this.updateEntschuldigung(cell, true));
			download.append(button);

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.innerHTML = '<i class="fa fa-xmark"></i>';
			button.title = 'Entschuldigung ablehnen';
			button.addEventListener('click', () => this.updateEntschuldigung(cell, false));
			download.append(button);

			return download;
		},
		filtern: function()
		{
			if (this.zeitraum.von === null || this.zeitraum.bis === null)
				return true;

			this.$refs.assistenzTable.tabulator.setFilter([
					{
						field: "von",
						type: ">=",
						value: this.zeitraum.von
					},
					{
						field: "bis",
						type: "<=",
						value: this.zeitraum.bis
					}
				]);
		}
	},
	mounted() {
		// Vue.$fhcapi.Assistenz.getEntschuldigungen().then(response => {
		//
		// 	// TODO(johann): check status/error and/or refactor for fhcapi plugin
		// 	if(this.$refs.assistenzTable) {
		// 		this.$refs.assistenzTable.tabulator.setData(response.data.data.retval);
		// 	} else {
		// 		console.log('no tabulator instanz =(((((')
		// 	}
		//
		//
		// });
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true>
	</core-navigation-cmpt>

	<core-base-layout
		title="Entschuldigungsmanagement Studiengangsassistenz">
		<template #main>
			<div class="row mb-3 align-items-center">
				
				<div class="col-1"><label for="von" class="form-label col-sm-1">Von</label></div>
				<div class="col-3">
					<datepicker
						v-model="zeitraum.von"
						clearable="false"
						auto-apply
						:enable-time-picker="false"
						format="dd.MM.yyyy"
						model-type="yyyy-MM-dd"
					></datepicker>
					<!--viewMode="months"
					month-picker-->
				</div>
			</div>
			<div class="row mb-3 align-items-center">
				
				<div class="col-1"><label for="von" class="form-label col-sm-1">Bis</label></div>
				<div class="col-3">
					<datepicker
						v-model="zeitraum.bis"
						clearable="false"
						auto-apply
						:enable-time-picker="false"
						format="dd.MM.yyyy"
						model-type="yyyy-MM-dd"
					></datepicker>
				</div>
			</div>
			<div class="row mb-3 align-content-center">
				<div class="col-4 d-flex justify-content-end">
					<button class="btn btn-secondary" @click="filtern">Filtern</button>
				</div>
			</div>			
			<core-filter-cmpt
				ref="assistenzTable"
				:tabulator-options="assistenzViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
			></core-filter-cmpt>
		</template>
	</core-base-layout>
`
};


