import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';

import {StudiensemesterDropdown} from './Studiensemester.js';
import Upload from '../../../../../js/components/Form/Upload/Dms.js';
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import { studentFormatters } from "../../mixins/formatters";
import { universalFormatter } from "../../mixins/formatters";

export default {
	name: 'StudentComponent',
	components: {
		CoreNavigationCmpt,
		CoreFilterCmpt,
		Studiensemester: StudiensemesterDropdown,
		Upload,
		Datepicker: VueDatePicker,
		CoreRESTClient
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			studentViewTabulatorOptions: {
				height: "90%",
				layout: 'fitColumns',
				selectable: false,
				placeholder: "Keine Daten verfügbar",
				columns: [
					{title: 'Lehrveranstaltung'},
					{title: 'Von', field: 'von', formatter: studentFormatters.formDate, widthGrow: 1},
					{title: 'Bis', field: 'bis', formatter: studentFormatters.formDate, widthGrow: 1},
					{title: 'Anwesend', field: 'status', formatter: studentFormatters.formAnwesenheit, widthGrow: 1},
				],
				groupBy: ['bezeichnung'],
				groupStartOpen:false,
				rowFormatter: studentFormatters.anwesenheitRowFormatter,
				groupHeader: studentFormatters.customGroupHeader
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
			studiensemester: [],
			entschuldigung: {
				von: null,
				bis: null,
				files: []
			},
			startTime: Vue.ref({ hours: 0, minutes: 0 })
		};
	},
	watch: {
		'entschuldigung.von'(newValue) {
			if (this.entschuldigung.bis === null)
				this.entschuldigung.bis = newValue;
		},
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		ssChangedHandler: function(studiensemester) {
			this.studiensemester = studiensemester
			Vue.$fhcapi.Student.getAll(this.studiensemester).then(response => {

				if (CoreRESTClient.isSuccess(response.data))
				{
					this.$refs.uebersichtTable.tabulator.setData(CoreRESTClient.getData(response.data).retval);
				}
			});
			this.loadEntschuldigungen();
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
				if (CoreRESTClient.isSuccess(response.data))
				{
					let rowData = CoreRESTClient.getData(response.data);
					this.$refs.entschuldigungsTable.tabulator.addRow(
						{
							'dms_id': rowData.dms_id,
							'akzeptiert': null,
							'von': rowData.von,
							'bis': rowData.bis,
							'entschuldigung_id': rowData.entschuldigung_id
						}
					, true);
					this.ssChangedHandler(this.studiensemester);
					this.$fhcAlert.alertSuccess('Entschuldigung hochgeladen');
					this.resetFormData();
				}
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
			window.location = CoreRESTClient._generateRouterURI('/extensions/FHC-Core-Anwesenheiten/student/download?entschuldigung=' + dms_id);
		},
		deleteEntschuldigung: function(cell) {
			let entschuldigung_id = cell.getData().entschuldigung_id;
			Vue.$fhcapi.Student.deleteEntschuldigung(entschuldigung_id).then(response => {
				if (CoreRESTClient.isSuccess(response.data))
				{
					cell.getRow().delete()
					this.ssChangedHandler(this.studiensemester);
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
		routeToCodeScan() {
			this.$router.push({
				name: 'Scan'
			})
		},
		loadEntschuldigungen: function()
		{
			Vue.$fhcapi.Student.getEntschuldigungenByPerson().then(response => {
				console.log(response);
				if (CoreRESTClient.isSuccess(response.data))
				{
					this.$refs.entschuldigungsTable.tabulator.setData(CoreRESTClient.getData(response.data).retval);
				}
			});
		}
	},
	mounted() {
		this.loadEntschuldigungen();
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries">
	</core-navigation-cmpt>

	<div id="content">
		<div class="row">
			<div class="col-md-6">
				<label for="studiensemester">Studiensemester</label>
				<Studiensemester @ssChanged="ssChangedHandler" id="studiensemester"></Studiensemester>
			</div>
			<div class="col-md-6">
				<div class="row mb-3 align-items-center">
					<label for="text" class="form-label col-sm-4 col-md-3">Entschuldigung hochladen</label>
					<label for="von" class="form-label col-sm-1">Von</label>
					<div class="col-sm-3">
						<datepicker
							id="von"
							v-model="entschuldigung.von"
							clearable="false"
							auto-apply
							:enable-time-picker="true"
							:start-time="startTime"
							format="dd.MM.yyyy HH:mm"
							model-type="dd.MM.yyyy HH:mm"></datepicker>
					</div>
					<label for="von" class="form-label col-sm-1">Bis</label>
					<div class="col-sm-3">
						<datepicker
							id="bis"
							v-model="entschuldigung.bis"
							clearable="false"
							auto-apply
							:enable-time-picker="true"
							:start-time="startTime"
							format="dd.MM.yyyy HH:mm"
							model-type="dd.MM.yyyy HH:mm"></datepicker>
					</div>
				</div>
			</div>
			<div class="col-md-6">
				<button type="button" class="btn btn-primary" @click="routeToCodeScan">Code eingeben</button>

			</div>
			<div class="col-sm-6 col-md-6">
					<div class="row">
					  <div class="col-sm-6 col-md-6">
						<Upload ref="uploadComponent" v-model="entschuldigung.files"></Upload>
					  </div>
					  <div class="col-sm-3 col-md-4"> 
						<button class="btn btn-primary" @click="triggerUpload">Upload</button>
					  </div>
					</div>
			</div>
		</div>
		<core-filter-cmpt
				ref="entschuldigungsTable"
				:tabulator-options="entschuldigungsViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
		></core-filter-cmpt>
		<core-filter-cmpt
				ref="uebersichtTable"
				:tabulator-options="studentViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
		></core-filter-cmpt>
		
	</div>
		
`
};


