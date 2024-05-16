import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../mixins/formatters";
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
				layout: 'fitColumns',
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
				persistence:true,
				persistenceID: "studentAnwTable"
			},
			filterTitle: ""
		};
	},
	methods: {
		ssChangedHandler: function(studiensemester) {
			console.log('ssChangedHandler')
			this.studiensemester = studiensemester

			this.$fhcApi.get(
				'extensions/FHC-Core-Anwesenheiten/Api/studentGetAll',
				{studiensemester: this.studiensemester}
			).then(res => {
				console.log('Student.getAll(this.studiensemester)', res)
				if(res.meta.status !== "success") {
					this.$fhcAlert.alertError(this.$p.t('global/errorLoadingAnwesenheiten'))
				} else {
					this.$refs.uebersichtTable.tabulator.setData(res.data?.retval);
				}


			});
		},
	},
	mounted() {
		this.studiensemester = this.$entryParams.sem_kurzbz
	},
	template: `

	<core-base-layout
		:title="filterTitle">
		<template #main>
			<div class="row">
				<div class="col-8"><StudiensemesterDropdown @ssChanged="ssChangedHandler"></StudiensemesterDropdown></div>
			</div>
			<core-filter-cmpt
				ref="uebersichtTable"
				:tabulator-options="studentViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
				:sideMenu=false
			></core-filter-cmpt>
		</template>

	</core-base-layout>
`
};


