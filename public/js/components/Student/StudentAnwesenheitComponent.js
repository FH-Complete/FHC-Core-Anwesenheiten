import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../formatters/formatters";
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';

import {StudiensemesterDropdown} from './StudiensemesterDropdown.js';

export default {
	name: 'StudentAnwesenheitComponent',
	components: {
		CoreBaseLayout,
		CoreFilterCmpt,
		CoreRESTClient,
		StudiensemesterDropdown
	},
	data: function() {
		return {
			studiensemester: [],
			tableBuiltPromise: null,
			studentViewTabulatorOptions: {
				layout: 'fitDataStretch',
				selectable: false,
				height: false,
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: 'Lehrveranstaltung', visible: false},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: studentFormatters.formDate, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: studentFormatters.formDate, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/anwesend')), field: 'student_status', formatter: this.formAnwesenheit, widthGrow: 1, minWidth: 150},
				],
				groupBy: ['bezeichnung'],
				groupStartOpen:false,
				rowFormatter: studentFormatters.anwesenheitRowFormatter,
				groupHeader: studentFormatters.customGroupHeader,
				groupToggleElement:"header",
				persistence: {
					sort: false,
					filter: true,
					headerFilter: false,
					group: true,
					page: true,
					columns: true,
				},
				persistenceID: "studentAnwTable"
			},
			studentViewTabulatorEventHandlers: [{
				event: "tableBuilt",
				handler: async () => {
					await this.$entryParams.phrasenPromise

					this.tableBuiltResolve()
				}
			}],
			filterTitle: ""
		};
	},
	methods: {
		formAnwesenheit: function(cell)
		{
			let data = cell.getValue();
			if (data === this.$entryParams.permissions.anwesend_status || data === this.$entryParams.permissions.entschuldigt_status)
			{
				cell.getElement().style.color = "#28a745";
				let returnValue = '';
				if (data === this.$entryParams.permissions.entschuldigt_status)
					returnValue = ' ' + this.$p.t('global/entschuldigungAkzeptiert');
				return '<i class="fa fa-check"></i>' + returnValue;
			}
			else if (data === this.$entryParams.permissions.abwesend_status)
			{
				let returnValue = '';
				cell.getElement().style.color = "#dc3545";
				if (cell.getData().exists_entschuldigung === 1)
				{
					if (cell.getData().status_entschuldigung === null)
						returnValue =  ' ' + this.$p.t('global/entschuldigungOffen');
					else if (cell.getData().status_entschuldigung === false)
						returnValue = ' ' + this.$p.t('global/entschuldigungAbgelehnt');
					else if (cell.getData().status_entschuldigung === true)
						returnValue = ' ' + this.$p.t('global/entschuldigungAkzeptiert');
				}
				return '<i class="fa fa-xmark"></i>' + returnValue;

			}
			else
				return '-'
		},
		ssChangedHandler: async function(studiensemester) {
			this.studiensemester = studiensemester
			this.loadAnwesenheitenByUID()
		},
		async loadAnwesenheitenByUID() {
			await this.$entryParams.profileViewDataPromise

			// toggle anwesenheiten loading procedure based on admin or student login
			const uid = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.uid : this.$entryParams.viewDataStudent.student_uid

			if(!uid) return
			this.$fhcApi.factory.Profil.getAllAnwByUID(this.studiensemester, uid).then(res => {
				if(res.meta.status !== "success") {
					this.$fhcAlert.alertError(this.$p.t('global/errorLoadingAnwesenheiten'))
				} else {
					this.$refs.uebersichtTable.tabulator.setData(res.data?.retval);
				}
			});
		},
		async reload() {
			this.loadAnwesenheitenByUID()
		},
		async setup(){
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise
			await this.tableBuiltPromise

			this.loadAnwesenheitenByUID()

			this.studiensemester = this.$entryParams.sem_kurzbz

			const cols = this.$refs.uebersichtTable.tabulator.getColumns()

			// phrasen bandaid

			cols.find(e => e.getField() === 'von').updateDefinition({title: this.$capitalize(this.$p.t('ui/von'))})
			cols.find(e => e.getField() === 'bis').updateDefinition({title: this.$capitalize(this.$p.t('global/bis'))})
			cols.find(e => e.getField() === 'student_status').updateDefinition({title: this.$capitalize(this.$p.t('global/anwesend'))})

			this.studentViewTabulatorOptions.columns[0].title = this.$capitalize(this.$p.t('ui/von'))
			this.studentViewTabulatorOptions.columns[1].title = this.$capitalize(this.$p.t('global/bis'))
			this.studentViewTabulatorOptions.columns[2].title = this.$capitalize(this.$p.t('global/anwesend'))

		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
	},
	mounted() {
		this.tableBuiltPromise = new Promise(this.tableResolve)
		this.setup()
	},
	template: `
	<core-base-layout
		:title="filterTitle">
		<template #main>
			<div class="row">
				<div class="col-9"></div>
				<div class="col-2"><StudiensemesterDropdown @ssChanged="ssChangedHandler"></StudiensemesterDropdown></div>
			</div>
			<core-filter-cmpt
				ref="uebersichtTable"
				:tabulator-options="studentViewTabulatorOptions"
				:tabulator-events="studentViewTabulatorEventHandlers"
				:table-only=true
				:hideTopMenu=false
				:sideMenu=false
			></core-filter-cmpt>
		</template>

	</core-base-layout>
`
};


