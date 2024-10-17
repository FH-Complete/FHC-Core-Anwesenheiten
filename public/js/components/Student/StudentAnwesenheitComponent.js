import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import {lektorFormatters, studentFormatters} from "../../formatters/formatters";
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
			tabulatorUuid: Vue.ref(0),
			studiensemester: [],
			tableBuiltPromise: null,
			studentViewTabulatorOptions: {
				layout: 'fitDataStretch',
				selectable: false,
				height: this.$entryParams.tabHeights.studentAnw,
				renderVerticalBuffer: 2000,
				placeholder: this.$p.t('global/noDataAvailable'),
				columns: [
					{title: 'Lehrveranstaltung', visible: false},
					{title: this.$capitalize(this.$p.t('global/datum')), field: 'datum', formatter: lektorFormatters.formDateOnly, tooltip:false, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('ui/von')), field: 'von', formatter: lektorFormatters.dateOnlyTimeFormatter, tooltip:false, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/bis')), field: 'bis', formatter: lektorFormatters.dateOnlyTimeFormatter, tooltip:false, widthGrow: 1, minWidth: 150},
					{title: this.$capitalize(this.$p.t('global/einheiten')), field: 'dauer', formatter: this.einheitenFormatter, tooltip:false, widthGrow: 1, minWidth: 250},
					{title: this.$capitalize(this.$p.t('global/anteilAnw')), field: 'anteil', bottomCalcParams: this.bottomCalcParamLookup, tooltip:false, bottomCalc: this.anwCalc, formatter: lektorFormatters.percentFormatter},
					{title: this.$capitalize(this.$p.t('global/anwesend')), field: 'student_status', formatter: this.formAnwesenheit, tooltip:false, minWidth: 150},
				],
				groupBy: ['bezeichnung'],
				groupStartOpen:false,
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
			sums: {},
			filterTitle: ""
		};
	},
	methods: {
		bottomCalcParamLookup (values, data) {
			const first = data[0]
			return first ? first.anwesenheit + ' %' : ''
		},
		einheitenFormatter: function (cell) {
			const valInMin = Number(cell.getValue())
			let valInEh = (cell.getValue() / 60 / this.$entryParams.permissions.einheitDauer)
			const rest = valInEh % 1
			if(rest > 0) valInEh = valInEh.toFixed(2).replace('.', ',')

			return '<div style="display: flex; justify-content: center; align-items: center; height: 100%">'
				+valInMin+' '+this.$p.t('global/minuten')+' / '+valInEh+' '+this.$p.t('global/einheiten')+
				'</div>'
		},
		formAnwesenheit: function(cell)
		{
			let data = cell.getValue();
			if (data === this.$entryParams.permissions.anwesend_status || data === this.$entryParams.permissions.entschuldigt_status)
			{
				cell.getElement().style.color = "#28a745";
				let returnValue = '';
				if (data === this.$entryParams.permissions.entschuldigt_status)
					returnValue = ' ' + this.$p.t('global/entschuldigungAkzeptiert');
				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%;"><i class="fa fa-check" style="margin-right: 4px;"></i> ' + returnValue + '</div>';
			}
			else if (data === this.$entryParams.permissions.abwesend_status)
			{
				let returnValue = '';
				cell.getElement().style.color = "#dc3545";

				if (cell.getData().hasOffene)
					returnValue =  ' ' + this.$p.t('global/entschuldigungOffen');
				else if (cell.getData().hasAbgelehnte)
					returnValue = ' ' + this.$p.t('global/entschuldigungAbgelehnt');

				return '<div style="display: flex; justify-content: center; align-items: center; height: 100%;"><i class="fa fa-xmark" style="margin-right: 4px;"></i> ' + returnValue + '</div>';

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
			const person_id = this.$entryParams.selected_student_info ? this.$entryParams?.selected_student_info.person_id : this.$entryParams.viewDataStudent.person_id

			if(!uid) return
			this.$fhcApi.factory.Profil.getAllAnwByUID(this.studiensemester, uid, person_id).then(res => {
				if(res.meta.status !== "success") {
					this.$fhcAlert.alertError(this.$p.t('global/errorLoadingAnwesenheiten'))
				} else {
					const processedAnw = this.processAnw(res.data)

					this.$refs.uebersichtTable.tabulator.setData(processedAnw);
				}
			});
		},
		anwCalc(values, data, percentage) {
			return percentage
		},
		processAnw(data) {
			const anw = data[0].retval

			// calc sum for each lva to display percentage
			anw.forEach(entry => {
				if(!this.sums[entry.lehrveranstaltung_id]) {
					this.sums[entry.lehrveranstaltung_id] = entry.dauer
				} else {
					this.sums[entry.lehrveranstaltung_id] += entry.dauer
				}
			})

			anw.forEach(a => {
				a.vonDate = new Date(a.von)
				a.bisDate = new Date(a.bis)
				a.anteil = (a.dauer / this.sums[a.lehrveranstaltung_id] * 100).toFixed(2)
			})

			if(this.$entryParams.permissions.entschuldigungen_enabled) {
				const ent = data[1].retval
				ent.forEach(e => {
					e.vonDate = new Date(e.von)
					e.bisDate = new Date(e.bis)
				})

				// filter entschuldigungen into offene and abgelehnte (entschuldigt status already in anw_user)
				const offene = ent.filter(e => e.akzeptiert === null)
				const abgelehnte = ent.filter(e => e.akzeptiert === false)

				// for every offene set anw_user entry property to true for every eligible date & abgelehnt combo
				offene.forEach(o => {
					const anwInDateRange = anw.filter(a => a.vonDate >= o.vonDate && a.bisDate <= o.bisDate && a.student_status === this.$entryParams.permissions.abwesend_status)
					anwInDateRange.forEach(a => a.hasOffene = true)
				})

				// for every abgelehnte set anw_user entry property to true for every eligible date & abgelehnt combo
				abgelehnte.forEach(abg => {
					const anwInRange = anw.filter(a => a.vonDate >= abg.vonDate && a.bisDate <= abg.bisDate && a.student_status === this.$entryParams.permissions.abwesend_status)
					anwInRange.forEach(a => a.hasAbgelehnte = true)
				})
			}

			return anw
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

		},
		tableResolve(resolve) {
			this.tableBuiltResolve = resolve
		},
		handleUuidDefined(uuid) {
			this.tabulatorUuid = uuid
		}
	},
	mounted() {
		this.tableBuiltPromise = new Promise(this.tableResolve)
		this.setup()

		const tableID = this.tabulatorUuid ? ('-' + this.tabulatorUuid) : ''
		const tableDataSet = document.getElementById('filterTableDataset' + tableID);
		// TODO: test collapsables behaviour in nested tabs and without by 2030
		const collapsables = document.getElementById('filterCollapsables' + tableID);
		const rect = tableDataSet.getBoundingClientRect();
		const screenY = this.$entryParams.isInFrame ? window.frameElement.clientHeight :  window.visualViewport.height
		this.$entryParams.tabHeights['studentAnw'].value = screenY - rect.top - collapsables.clientHeight
	},
	computed: {
		getTooltipObj() {
			return {
				value: `Hier sehen Sie sämtliche digitale Anwesenheiten zugeordnet nach Lehrveranstaltung. Sie können eine positive Anwesenheit erreichen, indem Sie den während einer laufenden Anwesenheitskontrolle gültigen Zugangscode eintragen. Sie können hierfür den angezeigten QR Code scannen, welcher Sie entsprechend weiterleitet oder Sie können den Code manuell eingeben.
				
				Sollte es Ihnen technisch nicht möglich sein einen Zugangscode einzugeben, können Sie die unterrichtende Person bitten Ihre digitale Anwesenheit zu setzen.`,
				class: "custom-tooltip"
			}
		}
	},
	template: `
	<core-base-layout
		:title="filterTitle">
		<template #main>
			<div ref="studentAnwContentHeader" class="row" style="justify-content: flex-end;">
				
					<div style="max-width: 50px; align-content: center;" v-tooltip.bottom="getTooltipObj">
						<h5><i class="fa fa-circle-question"></i></h5>
					</div>
					
				<div class="col-2">
					<StudiensemesterDropdown @ssChanged="ssChangedHandler"></StudiensemesterDropdown>
				</div>
			</div>
			<core-filter-cmpt
				ref="uebersichtTable"
				@uuidDefined="handleUuidDefined"
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