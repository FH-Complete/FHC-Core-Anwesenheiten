import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';

import {studentViewTabulatorOptions} from './TabulatorSetup.js';
import {entschuldigungsViewTabulatorOptions} from './TabulatorSetup.js';
import {StudiensemesterDropdown} from '../Studiensemester.js';
import Upload from '../../../../../js/components/Form/Upload/Dms.js';
import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';

export const Student = {
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
			studentViewTabulatorOptions,
			entschuldigungsViewTabulatorOptions,
			studiensemester: [],
			entschuldigung: {
				von: [],
				bis: [],
				files: []
			}
		};
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		ssChangedHandler: function(studiensemester) {
			Vue.$fhcapi.Student.getAll(studiensemester).then(response => {
				this.$refs.uebersichtTable.tabulator.setData(response.retval);
			});
		},
		triggerUpload() {
			const formData = new FormData();
			for (let i = 0; i < this.entschuldigung.files.length; i++) {
				formData.append('files', this.entschuldigung.files[i]);
			}
			formData.append('von', this.entschuldigung.von);
			formData.append('bis', this.entschuldigung.bis);
			Vue.$fhcapi.Student.addEntschuldigung(formData).then(response => {
				if (CoreRESTClient.isSuccess(response.data))
				{
					this.$refs.entschuldigungsTable.tabulator.addRow(
						{
							'dms_id': 287654,
							'bezeichnung': 'Entschuldigung hochgeladen',
							'von': this.entschuldigung.von,
							'bis': this.entschuldigung.bis
						}
					);
					this.$fhcAlert.alertSuccess('Entschuldigung hochgeladen');
					this.resetFormData();
				}
			});
		},
		resetFormData: function()
		{
			this.entschuldigung = {
				von: [],
				bis: [],
				files: []
			};
		},
	},
	mounted() {
		Vue.$fhcapi.Student.getEntschuldigungen().then(response => {
			if (CoreRESTClient.isSuccess(response.data))
			{
				this.$refs.entschuldigungsTable.tabulator.setData(CoreRESTClient.getData(response.data).retval);
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
			<div class="col-md-6">
				<Studiensemester @ssChanged="ssChangedHandler"></Studiensemester>
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
							format="dd.MM.yyyy H:m"
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
							format="dd.MM.yyyy HH:mm"
							model-type="dd.MM.yyyy HH:mm"></datepicker>
					</div>
				</div>
			</div>
			<div class="col-md-6"></div>
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


