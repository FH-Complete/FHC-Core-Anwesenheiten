import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import {universalFormatter} from "../../mixins/formatters";
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';

export default {
	name: 'AssistenzComponent',
	components: {
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
				layout: 'fitColumns',
				selectable: false,
				placeholder: "Keine Daten verfügbar",
				rowFormatter: universalFormatter.entschuldigungRowFormatter,
				columns: [
					{title: 'Vorname', field: 'vorname'},
					{title: 'Nachname', field: 'nachname'},
					{title: 'Status', field: 'akzeptiert', formatter: universalFormatter.entschuldigungstatusFormatter},
					{title: 'Von', field: 'von'},
					{title: 'Bis', field: 'bis'},
					{title: 'Action', field: 'entschuldigung_id', formatter: this.formAction},
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
				if (CoreRESTClient.isSuccess(response.data))
				{
					cell.getRow().update({'akzeptiert': status});
					this.$fhcAlert.success('Erfolgreich akzeptiert');
				}
			});
		},
		downloadEntschuldigung: function(dms_id)
		{
			//TODO fixen damit es die assistenz runterladen kann
			window.location = CoreRESTClient._generateRouterURI('/extensions/FHC-Core-Anwesenheiten/student/download?entschuldigung=' + dms_id);
		},
		formAction: function(cell)
		{
			let download = document.createElement('div');
			download.className = "d-flex gap-3";

			let button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';

			button.innerHTML = '<i class="fa fa-download"></i>';
			button.addEventListener('click', () => this.downloadEntschuldigung(cell.getData().dms_id));
			download.append(button);

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.innerHTML = '<i class="fa fa-check"></i>';

			button.addEventListener('click', () => this.updateEntschuldigung(cell, true));
			download.append(button);

			button = document.createElement('button');
			button.className = 'btn btn-outline-secondary';
			button.innerHTML = '<i class="fa fa-xmark"></i>';

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
		Vue.$fhcapi.Assistenz.getEntschuldigungen().then(response => {
			if (CoreRESTClient.isSuccess(response.data))
			{
				this.$refs.assistenzTable.tabulator.setData(CoreRESTClient.getData(response.data).retval);
			}
		});
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries">
	</core-navigation-cmpt>

	<div id="content">
		<div class="row">
			<div class="col-md-7">
				<div class="row mb-3 align-items-center">
					<label for="von" class="form-label col-sm-1">Von</label>
					<div class="col-sm-3">
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
					<label for="von" class="form-label col-sm-1">Bis</label>
					<div class="col-sm-3">
						<datepicker
							v-model="zeitraum.bis"
							clearable="false"
							auto-apply
							:enable-time-picker="false"
							format="dd.MM.yyyy"
							model-type="yyyy-MM-dd"
						></datepicker>
					</div>
					<div class="col-sm-1">
					<button class="btn btn-secondary" @click="filtern">Filtern</button>
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

	</div>
`
};


