import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters, universalFormatter} from "../../mixins/formatters";
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import {StudiengangDropdown} from "../Student/StudiengangDropdown";
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';


export default {
	name: 'AssistenzComponent',
	components: {
		BsModal,
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
			permissionsLoaded: false,
			assistenzViewTabulatorOptions: {
				ajaxURL: FHC_JS_DATA_STORAGE_OBJECT.app_root + FHC_JS_DATA_STORAGE_OBJECT.ci_router+'/extensions/FHC-Core-Anwesenheiten/api/AdministrationApi/getEntschuldigungen',
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
							stg_kz_arr: this.$entryParams.permissions.studiengaengeAssistenz
						})
					}
				},
				layout: 'fitColumns',
				selectable: false,
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: this.$p.t('person/vorname'), field: 'vorname'},
					{title: this.$p.t('person/nachname'), field: 'nachname'} ,
					{title: this.$p.t('global/status'), field: 'akzeptiert', formatter: universalFormatter.entschuldigungstatusFormatter, tooltip:false},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', minWidth: 150, formatter: studentFormatters.formDate},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', minWidth: 150, formatter: studentFormatters.formDate},
					{title: this.$p.t('lehre/studiengang'), field: 'studiengang_kz', formatter: studentFormatters.formStudiengangKz, tooltip:false},
					{title: this.$p.t('ui/aktion'), field: 'entschuldigung_id', formatter: this.formAction, tooltip:false, minWidth: 150},
					{title: this.$p.t('global/notiz'), field: 'notiz', tooltip:false, minWidth: 150}
				],
				persistence:true,
				persistenceID: "assistenzTable"
			},
			notiz: '',
			entschuldigung_id: null,
			studiengang: null,
			titleText: ''
		};
	},
	props: {
		permissions: []
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		updateEntschuldigung: function(cell, status, notizParam = '')
		{

			const entschuldigung_id = cell.getData().entschuldigung_id
			const existingNotiz = cell.getData().notiz
			const notiz = notizParam !== '' ? notizParam : (existingNotiz !== null && existingNotiz !== undefined) ? existingNotiz : ''
			this.$fhcApi.factory.Administration.updateEntschuldigung(String(entschuldigung_id), status, notiz).then(res => {
				console.log('updateEntschuldigung', res)

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
			let download = document.createElement('div');
			download.className = "d-flex gap-3";

			let button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';

			button.innerHTML = '<i class="fa fa-download"></i>';
			button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
			button.title = this.$p.t('table/download');
			download.append(button);

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.innerHTML = '<i class="fa fa-check"></i>';
			button.title = this.$p.t('global/entschuldigungAkzeptieren');
			button.addEventListener('click', () => this.updateEntschuldigung(cell, true));
			download.append(button);

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.innerHTML = '<i class="fa fa-xmark"></i>';
			button.title = this.$p.t('global/entschuldigungAblehnen');
			button.addEventListener('click', () => this.openRejectionModal(cell));
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
		handleInputNotiz(e) {
			this.notiz = e.target.value;
		},
		rejectEntschuldigung() {
			this.updateEntschuldigung(this.rejectCell, false, this.notiz)
			this.rejectCell = null
			this.notiz = ''

			this.$refs.modalContainerRejectionReason.hide()
		},
		openRejectionModal(cell) {
			this.rejectCell = cell

			this.notiz = cell.getData().notiz
			this.$refs.modalContainerRejectionReason.show()
		},
		sgChangedHandler: function(e) {
			console.log('sgChangedHandler', e)
			this.studiengang = e.value ? e.value.studiengang_kz : null
		},
		routeToLandingPage(){
			this.$router.push({
				name: 'LandingPage'
			})
		},
		checkEntryParamPermissions() {
			if(this.$entryParams.permissions === undefined) { // routed into app inner component skipping init in landing page
				this.$entryParams.permissions = JSON.parse(this.permissions)
			}

			this.permissionsLoaded = true
		}
	},
	mounted() {
		this.checkEntryParamPermissions()
	},
	watch: {
		'zeitraum.von'() {
			this.filtern()
		},
		'zeitraum.bis'() {
			this.filtern()
		},
		studiengang() {
			this.filtern()
		}
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>


	<core-base-layout>
		<template #main>
			<bs-modal ref="modalContainerRejectionReason" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>{{ $p.t('global/entschuldigungNotizAblehnen') }}</template>
				<template v-slot:default>
					<div>
						<div class="mt-2">
							<input maxlength=255 class="form-control" :value="notiz" @input="handleInputNotiz" :placeholder="$p.t('global/begruendungAnw')">
						</div>
					</div>
					
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-primary" :disabled="!notiz" @click="rejectEntschuldigung">{{ $p.t('global/reject') }}</button>
				</template>
			</bs-modal>
		
			<div class="row">
				<div class="col-6"></div>
				<div class="col-2">
					<div class="row mb-3 align-items-center">
						<StudiengangDropdown
							:allowedStg="$entryParams?.permissions?.studiengaengeAssistenz" @sgChanged="sgChangedHandler">
						</StudiengangDropdown>
					</div>
				</div>
				<div class="col-2">
					<div class="row mb-3 align-items-center">
						<datepicker
							v-model="zeitraum.von"
							:placeholder="$capitalize($p.t('ui/von'))"
							clearable="false"
							auto-apply
							:enable-time-picker="false"
							format="dd.MM.yyyy"
							model-type="yyyy-MM-dd"
						></datepicker>
					</div>
				</div>
				<div class="col-2 mr-4">
					<div class="row mb-3 align-items-center">
						<datepicker
							v-model="zeitraum.bis"
							:placeholder="$capitalize($p.t('global/bis'))"
							clearable="false"
							auto-apply
							:enable-time-picker="false"
							format="dd.MM.yyyy"
							model-type="yyyy-MM-dd"
						></datepicker>
					</div>
				</div>
				
				
			</div>
			<core-filter-cmpt
				ref="assistenzTable"
				:tabulator-options="assistenzViewTabulatorOptions"
				:tabulator-events="assistenzViewTabulatorEvents"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
			></core-filter-cmpt>
		</template>
	</core-base-layout>
`
};


