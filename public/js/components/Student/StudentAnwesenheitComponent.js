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
			studentViewTabulatorOptions: {
				layout: 'fitDataStretch',
				selectable: false,
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: 'Lehrveranstaltung', visible: false},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: studentFormatters.formDate, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: studentFormatters.formDate, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/anwesend')), field: 'student_status', formatter: studentFormatters.formAnwesenheit, widthGrow: 1, minWidth: 150},
				],
				groupBy: ['bezeichnung'],
				groupStartOpen:false,
				rowFormatter: studentFormatters.anwesenheitRowFormatter,
				groupHeader: studentFormatters.customGroupHeader,
				groupToggleElement:"header",
				persistence:true,
				persistenceID: "studentAnwTable"
			},
			studentViewTabulatorEventHandlers: {
				event: "tableBuilt",
				handler: async () => {
					await this.$entryParams.phrasenPromise

					const cols = this.$refs.uebersichtTable.tabulator.getColumns()

					// cols[0].updateDefinition({title: this.$capitalize(this.$p.t('ui/von')) })
					// cols[1].updateDefinition({title: this.$capitalize(this.$p.t('global/bis')) })
					// cols[2].updateDefinition({title: this.$capitalize(this.$p.t('global/anwesend')) })

				}
			},
			filterTitle: ""
		};
	},
	methods: {
		ssChangedHandler: function(studiensemester) {
			this.studiensemester = studiensemester

			// toggle anwesenheiten loading procedure based on admin or student login
			const uid = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.uid : this.$entryParams.viewDataStudent.student_uid

			// return on startup as admin

			this.$fhcApi.factory.Profil.getAllAnwByUID(this.studiensemester, uid).then(res => {
				if(res.meta.status !== "success") {
					this.$fhcAlert.alertError(this.$p.t('global/errorLoadingAnwesenheiten'))
				} else {
					this.$refs.uebersichtTable.tabulator.setData(res.data?.retval);
				}


			});
		},
		reload() {
			const uid = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.uid : this.$entryParams.viewDataStudent.student_uid

			this.$fhcApi.factory.Profil.getAllAnwByUID(this.studiensemester, uid).then(res => {
				if(res.meta.status !== "success") {
					this.$fhcAlert.alertError(this.$p.t('global/errorLoadingAnwesenheiten'))
				} else {
					this.$refs.uebersichtTable.tabulator.setData(res.data?.retval);
				}

			});
		},
		async setup(){
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise
			this.studiensemester = this.$entryParams.sem_kurzbz
		}
	},
	mounted() {
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
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
				:sideMenu=false
			></core-filter-cmpt>
		</template>

	</core-base-layout>
`
};


