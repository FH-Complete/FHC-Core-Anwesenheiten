import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {studentFormatters} from "../../mixins/formatters";
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';

import {StudiensemesterDropdown} from './Studiensemester.js';

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
				height: "90%",
				layout: 'fitColumns',
				selectable: false,
				placeholder: "Keine Daten verfügbar",
				columns: [
					{title: 'Lehrveranstaltung', visible: false},
					{title: 'Von', field: 'von', formatter: studentFormatters.formDate, widthGrow: 1},
					{title: 'Bis', field: 'bis', formatter: studentFormatters.formDate, widthGrow: 1},
					{title: 'Anwesend', field: 'status', formatter: studentFormatters.formAnwesenheit, widthGrow: 1},
				],
				groupBy: ['bezeichnung'],
				groupStartOpen:false,
				rowFormatter: studentFormatters.anwesenheitRowFormatter,
				groupHeader: studentFormatters.customGroupHeader
			},
			filterTitle: ""
		};
	},
	methods: {
		ssChangedHandler: function(studiensemester) {
			this.studiensemester = studiensemester
			Vue.$fhcapi.Student.getAll(this.studiensemester).then(response => {
				// TODO(johann): rework status check once fhcapi plugin is installed
				console.log('Student.getAll(this.studiensemester)', response)

				this.$refs.uebersichtTable.tabulator.setData(response.data.data.retval);

			});
		},
	},
	mounted() {

	},
	template: `

	<core-base-layout
		:title="filterTitle"
		mainCols="8"
		asideCols="4">
		<template #main>
			<core-filter-cmpt
				ref="uebersichtTable"
				:tabulator-options="studentViewTabulatorOptions"
				@nw-new-entry="newSideMenuEntryHandler"
				:table-only=true
				:hideTopMenu=false
				:sideMenu=false
			></core-filter-cmpt>
		</template>
		<template #aside>
			<div class="row">
				<label for="studiensemester">Studiensemester</label>
				<StudiensemesterDropdown @ssChanged="ssChangedHandler" id="studiensemester"></StudiensemesterDropdown>
			</div>
		</template>
	</core-base-layout>
`
};


