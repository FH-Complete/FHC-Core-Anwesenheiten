import {FhcChart} from '../../../../../js/components/Chart/FhcChart.js';

export const StatsComponent = {
	name: 'StatsComponent',
	components: {
		MultiSelect: primevue.multiselect,
		Accordion: primevue.accordion,
		FhcChart
	},
	data: function() {
		
		return {
			chartOptions: Vue.reactive({
				chart: {
					type: 'pie'
				},
				title: {
					text: ''
				},
				tooltip: {
					valueSuffix: '%'
				},
				yAxis: {
					title: {
						text: 'Anwesenheitsquote'
					}
				},
				xAxis: {
					categories: [
						'Anwesend', 'Abwesend', 'Entschuldigt'
					]	
				},
				plotOptions: {
					series: {
						allowPointSelect: true,
						dataLabels: [{
							enabled: true,
							distance: 20
						}, {
							enabled: true,
							distance: -40,
							format: '{point.percentage:.1f}%',
							style: {
								fontSize: '1.2em',
								textOutline: 'none',
								opacity: 0.7
							},
							filter: {
								operator: '>',
								property: 'percentage',
								value: 10
							}
						}]
					}
				},
				series: [
					{
						name: 'Quote',
						colorByPoint: true,
						data: []
					}
				]
			}),
			chartLabel: '',
			options: Vue.reactive({
				semester: [],
				stg: []
			}),
			stgSelected: Vue.ref([]),
			semesterSelected: Vue.ref([]),
			lvaSelected: Vue.ref([]),
			lv_id: null,
			sem_kurzbz: null,
			le_id: null,
			ma_uid: null,
			sem: null
		};
	},
	methods: {
		initDefaultsFromEntryParams() {
			this.lv_id = this.$entryParams.lv_id
			this.sem_kurzbz = this.$entryParams.sem_kurzbz
			this.le_id = this.$entryParams.selected_le_id
			this.ma_uid = this.$entryParams.selected_maUID
			this.sem = this.$entryParams.sem
			this.stg = this.$entryParams.stg_kz
		},
		fetchStatsOptions() {
			return new Promise(resolve => {
				this.$fhcApi.factory.Anwesenheiten.Stats.fetchStatsOptions()
					.then(res => {
						console.log(res)
						this.initDefaultsFromEntryParams()
						
						res.data.stg.forEach(stg => {
							stg.label = stg.bezeichnung + ' ' + stg.orgform_kurzbz + ' - (' + stg.kurzbzlang + '/' + stg.studiengang_kz + ')'
							// if(!stg.lva) {return}
							stg.lva?.forEach(lva => {
								lva.label = lva.bezeichnung + '(' + lva.kurzbz + '-' + lva.semester + '/' + lva.orgform_kurzbz + '/' + lva.lehrform_kurzbz + ')'
								
							})
						})

						this.options.stg = res.data.stg
						
						if(this.stg) this.stgSelected.push(res.data.stg.find(stg => stg.studiengang_kz == this.stg))
						this.options.semester = res.data.semester[0]
						this.semesterSelected.push(this.sem_kurzbz ? this.options.semester.find(s => s.studiensemester_kurzbz == this.sem_kurzbz) : res.data.semester[1][0])
					}).finally(()=> resolve())
			})
		},
		constructChartLabel() {
			this.chartLabel = this.stgSelected.length ? this.stgSelected.map(stg => `${stg.kurzbzlang}`).join(', ') : ' '
			this.chartLabel += this.lvaSelected.length ? ('(' + this.lvaSelected.map(lva => `${lva.kurzbz}`).join(', ') + ')') : ' ';
			this.chartLabel += this.semesterSelected.length ? this.semesterSelected.map(sem => `${sem.studiensemester_kurzbz}`).join(', ') : '';

			if(!this.stgSelected.length && !this.lvaSelected.length && !this.semesterSelected.length) {
				this.chartLabel = 'Alle'
			}

			this.chartOptions.title.text = this.chartLabel
		},
		fetchStatsData() {
			const selectedLvaIds = this.lvaSelected.map(lva => lva.lehrveranstaltung_id)
			
			this.$fhcApi.factory.Anwesenheiten.Stats.fetchStatsData(
				selectedLvaIds, this.getSemesterSelectedIds
			).then(res => {
				if(!res?.data?.retval?.length) {
					this.$fhcAlert.alertError(this.$p.t('global/noDataAvailable'))
				}
				this.setupGraphs(res.data.retval)
			})
		},
		countAnwesenheitDataPie (statusArr) {
			let anwCounter = 0
			let abwCounter = 0
			let entCounter = 0
			const anwesenheitenData = [{
				name: this.$capitalize(this.$p.t('global/anwesend')),
				color: '#02c016',
				y: 0
			},
			{
				name: this.$capitalize(this.$p.t('global/abwesend')),
				color: '#e60606',
				y: 0
			},
			{
				name: this.$capitalize(this.$p.t('global/entschuldigt')),
				color: '#1841fe',
				y: 0
			}]

			statusArr.forEach(entry => {
				if(!entry.status) return
				switch(entry.status) {
					case 'abwesend':
						abwCounter++
						break;
					case 'anwesend':
						anwCounter++
						break;
					case 'entschuldigt':
						entCounter++
						break;
				}
			})

			anwesenheitenData[0].y = Number((anwCounter / (abwCounter + anwCounter + entCounter) * 100).toFixed(2))
			anwesenheitenData[1].y = Number((abwCounter / (abwCounter + anwCounter + entCounter) * 100).toFixed(2))
			anwesenheitenData[2].y = Number((entCounter / (abwCounter + anwCounter + entCounter) * 100).toFixed(2))

			return {name: this.$p.t('global/anteilAnw'), colorByPoint: true, data: anwesenheitenData}
		},
		setupGraphs(data) {
			this.constructChartLabel()
			const series = this.countAnwesenheitDataPie(data)
			this.chartOptions.series[0].data = series.data
		}
	},
	computed: {
		getSemesterSelectedIds(){
			const ids = []
			this.semesterSelected.forEach(sem => ids.push(sem.studiensemester_kurzbz))
			return ids
		},
	},
	watch: {
		type(newVal, oldVal) {
			this.chartOptions.chart.type = newVal	
		},
		
	},
	created(){
		this.fetchStatsOptions().then(() => this.fetchStatsData())
	},
	mounted() {

	},
	template: `
	<div>
		<div class="row flex-wrap: wrap" style="max-width: 100%">
			<div class="col-auto" style="margin-top: 4px;">
				<MultiSelect v-model="semesterSelected" maxSelectedLabels="3" display="chip" :options="options.semester"
				 optionLabel="studiensemester_kurzbz" placeholder="Select Semesters" class="w-20rem" />
				</div>
			<div class="col-auto" style="margin-top: 4px;">
				<MultiSelect 
				v-model="stgSelected" :style="{'max-width': '70vw'}" display="chip" :options="options.stg"
				 optionLabel="label" placeholder="Select Stg" class="w-20rem" :filter="true"
				 />
			</div>
		</div>
		<div class="row flex-wrap: wrap" style="max-width: 100%">
			<div class="col-12" style="margin-top: 4px;">
<!--			https://github.com/primefaces/primevue/issues/5224-->
<!--				needs further optimization and/or limitation-->
				<MultiSelect v-model="lvaSelected"
				:style="{'max-width': '70vw', 'min-width': '500px'}"
				scrollHeight="600px"
				:virtualScroll="true"
				:virtualScrollerOptions="{itemSize: 40, autoSize: true}"
				:filter="true"
				:showToggleAll="false"
				 display="chip"
				 optionGroupLabel="label"
				 :options="stgSelected" 
				 optionLabel="label"
				 optionGroupChildren="lva"
				 placeholder="Select LVA"
				 class="w-20rem">
					 <template #optiongroup="slotProps">
							{{ slotProps.option.label }}
					</template>
				<MultiSelect/>
    		</div>
		</div>
		
		<Button  style="margin-top: 4px;" @click="fetchStatsData" role="button" class="btn btn-primary align-self-center">Query</Button>
		<div class="card mt-3">
			<div class="card-header">
				<h5 class="mb-0">{{$p.t('global/digiAnwEval')}}</h5>
			</div>
			
			<div class="card-body" style="text-align:center">
				<div style="width:100%;height:100%;overflow:auto">
					<FhcChart ref="fhcChartRef" :chartOptions="chartOptions"/>
				</div>
			</div>
		</div>
	</div>
`
};

export default StatsComponent