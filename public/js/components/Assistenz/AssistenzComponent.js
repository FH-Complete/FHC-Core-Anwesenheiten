import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters, universalFormatter} from "../../mixins/formatters";
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import {StudiengangDropdown} from "../Student/StudiengangDropdown";
import {DateTime} from '../../luxon.js'
window.DateTime = DateTime

export default {
	name: 'AssistenzComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreFilterCmpt,
		CoreRESTClient,
		Datepicker: VueDatePicker,
		StudiengangDropdown
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
				ajaxConfig: "POST",
				ajaxContentType:{
					headers:{
						'Content-Type': 'application/json'
					},
					body:(url,config,params)=>{
						return JSON.stringify({
							stg_kz_arr: this._.root.appContext.config.globalProperties.$entryParams.permissions.studiengaengeAssistenz
						})
					}
				},
				layout: 'fitColumns',
				selectable: false,
				placeholder: "Keine Daten verfügbar",
				columns: [
					{title: 'Vorname', field: 'vorname'},
					{title: 'Nachname', field: 'nachname'},
					{title: 'Status', field: 'akzeptiert', formatter: universalFormatter.entschuldigungstatusFormatter, tooltip:false},
					{title: 'Von', field: 'von', formatter: studentFormatters.formDate, minWidth: 150, sorter: "datetime",
						sorterParams: {format:"yyyy-MM-dd HH:mm:ss"}},
					{title: 'Bis', field: 'bis', formatter: studentFormatters.formDate, minWidth: 150, sorter: "datetime",
						sorterParams: {format:"yyyy-MM-dd HH:mm:ss"}
					},
					{title: 'Studiengang', field: 'studiengang_kz', formatter: studentFormatters.formStudiengangKz, minWidth: 150, tooltip:false},
					{title: 'Action', field: 'entschuldigung_id', formatter: this.formAction, minWidth: 150, tooltip:false},

				],
			},
			studiengang: null
		};
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		updateEntschuldigung: function(cell, status)
		{
			let entschuldigung_id = cell.getData().entschuldigung_id;
			this.$fhcApi.post(
				'extensions/FHC-Core-Anwesenheiten/Api/assistenzUpdateEntschuldigung',
				{entschuldigung_id, status}
			).then(res => {
				console.log('updateEntschuldigung', res)

				if (res.meta.status === "success")
				{
					cell.getRow().update({'akzeptiert': status});
					//  TODO(johann): differentiate between accept and deny!
					this.$fhcAlert.alertSuccess('Erfolgreich gespeichert');
				}
			});
		},
		downloadEntschuldigung: function(dms_id)
		{
			window.location = CoreRESTClient._generateRouterURI('extensions/FHC-Core-Anwesenheiten/Info/studentDownload?entschuldigung=' + dms_id);
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

			if (this.zeitraum.von) this.$refs.assistenzTable.tabulator.addFilter(this.vonFilter, {von: this.zeitraum.von})
			if (this.zeitraum.bis) this.$refs.assistenzTable.tabulator.addFilter(this.bisFilter, {bis: this.zeitraum.bis})
			if (this.studiengang) this.$refs.assistenzTable.tabulator.addFilter(this.studiengangFilter, {studiengang: this.studiengang})
		},
		sgChangedHandler: function(studiengang) {
			console.log('sgChangedHandler', studiengang)
			this.studiengang = studiengang
		}
	},
	mounted() {

	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>

	<core-base-layout
		title="Entschuldigungsmanagement Studiengangsassistenz">
		<template #main>
			<div class="row">
				<div class="col-4">
					<div class="row mb-3 align-items-center">
						<StudiengangDropdown
							@sgChanged="sgChangedHandler">
					
						</StudiengangDropdown>
					</div>
					<div class="row mb-3 align-items-center">
						
						<div class="col-2"><label for="von">Von</label></div>
						<div class="col-10">
							<datepicker
								v-model="zeitraum.von"
								clearable="false"
								auto-apply
								:enable-time-picker="false"
								format="dd.MM.yyyy"
								model-type="yyyy-MM-dd"
							></datepicker>
						</div>
					</div>
					<div class="row mb-3 align-items-center">
						
						<div class="col-2"><label for="von" class="form-label col-sm-1">Bis</label></div>
						<div class="col-10">
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
						<div class="col-12 d-flex justify-content-end">
							<button class="btn btn-secondary" @click="filtern">Filtern</button>
						</div>
					</div>		
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


