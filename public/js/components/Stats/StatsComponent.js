import {FhcChart} from '../../../../../js/components/Chart/FhcChart.js';

// const mode = 'anw'
const mode = 'anw'

export const StatsComponent = {
	name: 'StatsComponent',
	components: {
		MultiSelect: primevue.multiselect,
		Accordion: primevue.accordion,
		FhcChart
	},
	data: function() {
		return {
			dataseries: Vue.reactive([]),
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
			chartData: null,
			data: [],
			studiengangSelect: '',
			stg: 0,
			options: Vue.reactive({
				semester: [],
				stg: []
			}),
			type: 'pie',
			types: ['pie', 'column', 'bubble', 'line', 'bar'],
			stgSelected: Vue.reactive([]),
			semesterSelected: Vue.reactive([]),
			lvaSelected: Vue.reactive([]),
			semNumSelected: Vue.reactive([]),
			semNumOptions: [],
			lv_id: null, //41869,
			sem_kurzbz: null, //'WS2024',
			le_id: null, //150922,
			ma_uid: null, //'ma0293',
			sem: null
		};
	},
	methods: {
		initDefaultsFromEntryParams() {
			console.log(this.$entryParams)
			this.lv_id = this.$entryParams.lv_id
			this.sem_kurzbz = this.$entryParams.sem_kurzbz
			this.le_id = this.$entryParams.selected_le_id
			this.ma_uid = this.$entryParams.selected_maUID
			this.sem = this.$entryParams.sem
			this.stg = this.$entryParams.stg_kz
			console.log('this.lv_id', this.lv_id)
			console.log('this.sem_kurzbz', this.sem_kurzbz)
			console.log('this.le_id', this.le_id)
			console.log('this.ma_uid', this.ma_uid)
			console.log('this.sem', this.sem)
			console.log('this.stg', this.stg)
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
			
			console.log('fetchStatsData')
			console.log('this.getSelectedLvaIds', this.getSelectedLvaIds)
			console.log('this.getSemesterSelectedIds', this.getSemesterSelectedIds)
			
			this.constructChartLabel()
			
			this.$fhcApi.factory.Anwesenheiten.Stats.fetchStatsData(
				this.getSelectedLvaIds, this.getSemesterSelectedIds, []
			).then(res => {
				this.data = res.data.retval
				console.log('data', this.data)
				this.setupGraphs()
			})
		},
		countAnwesenheitDataColumn(statusArr) {
			return []	
		},
		countAnwesenheitDataPie (statusArr) {
			let anwCounter = 0
			let abwCounter = 0
			let entCounter = 0
			const anwesenheitenData = [{
				name: 'Anwesend',
				color: '#02c016',
				y: 0
			},
			{
				name: 'Abwesend',
				color: '#e60606',
				y: 0
			},
			{
				name: 'Entschuldigt',
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

			return {name: 'Quote', colorByPoint: true, data: anwesenheitenData}
		},
		setupGraphs() {
			
			// TODO: in here prepare settings for properties series, xAxis, yAxis, plotOptions,
			//  tooltip as per setting/selection whatever
			
			const series = this.countAnwesenheitDataPie(this.data)
			this.chartOptions.series[0].data = series.data
			// this.$refs.fhcChartRef.createNewChart()
			
			
			// const wrapperDiv = document.getElementById('highchartWrapper')
			//
			// const anwesenheitenData = this.countAnwesenheitDataPie(this.data)
			//
			// const containerCategory = document.createElement('div')
			// const id = this.chartLabel//category.bezeichnung
			// containerCategory.id = id
			//
			// containerCategory.style.flex = '1 0 300px';
			// containerCategory.style.margin = '10px';
			// containerCategory.style.maxWidth = '500px';
			// wrapperDiv.appendChild(containerCategory)
			//
			// this.addPieChartToWrapper(anwesenheitenData, id, id)
		},
		setSemNumOptions() {
			console.log('setSemNumOptions')
			// calculate highest max Sem to select from, default all sem are selected

			this.semNumOptions = []
			let max_sem = 1

			this.stgSelected.forEach(stg => {
				if(stg.max_semester > max_sem) max_sem = stg.max_semester
			})
			// this.options.stg.forEach(stg => {
			// 	if(stg.max_semester > max_sem) max_sem = stg.max_semester 
			// })

			for(let i = 1; i <= max_sem; i++) {
				this.semNumOptions.push(String(i))
			}

			this.semNumSelected.length = 0
			this.semNumSelected.push(...this.semNumOptions)
		}
	},
	computed: {
		getLvaOptions() {
			// loop over every selected stg.lva array and merge it to one options array
			let lva = []
			this.stgSelected.forEach(stg => {
				
				const lvaOfSelectedSemNum = stg.lva?.filter(l => this.semNumSelected.find(semnum => semnum == l.semester))
				
				lva = lva.concat(lvaOfSelectedSemNum)
			})
			return lva
			
		},
		// nestedOptions: [
		// 	{
		// 		label: "Fruits",
		// 		items: [
		// 			{ name: "Apple" },
		// 			{
		// 				name: "Citrus",
		// 				items: [{ name: "Orange" }, { name: "Lemon" }],
		// 			},
		// 		],
		// 	},
		// 	{
		// 		label: "Vegetables",
		// 		items: [
		// 			{
		// 				name: "Leafy Greens",
		// 				items: [{ name: "Spinach" }, { name: "Kale" }],
		// 			},
		// 			{
		// 				name: "Root Vegetables",
		// 				items: [{ name: "Carrot" }, { name: "Beetroot" }],
		// 			},
		// 		],
		// 	},
		// ]
		getLvaOptionsGrouped() { // group lva by studiengang and inside studiengang by sem number
			const stgLvaGrouped = []
			this.stgSelected.forEach(stg => {
				const stgItem = {label: stg.label, items: stg.lva}
				stgLvaGrouped.push(stgItem)
				// const lvaOfSelectedSemNum = stg.lva?.filter(l => this.semNumSelected.find(semnum => semnum == l.semester))
				//
				// lva = lva.concat(lvaOfSelectedSemNum)
			})
			return stgLvaGrouped
		},
		getSelectedLvaIds(){
			const ids = []
			this.lvaSelected.forEach(lva => ids.push(lva.lehrveranstaltung_id))
			
			// return combined lva_ids of all selected stg if lva have not been selected
			if(this.lvaSelected.length === 0 && this.stgSelected.length) { 
				this.stgSelected.forEach(stg => stg.lva?.forEach(lva => ids.push(lva.lehrveranstaltung_id)))	
			}
			
			return ids
		},
		getSemesterSelectedIds(){
			const ids = []
			this.semesterSelected.forEach(sem => ids.push(sem.studiensemester_kurzbz))
			return ids
		},
		getPlotOptions() {
			if(mode === 'test') {
				return {
					column: {
						pointPadding: 0.2,
						borderWidth: 0
					}
				}
			} else if (mode === 'anw' && this.type === 'pie') {
				return {
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
				}
			}
			
		},
		getSeries() {
			if(mode === 'test') {
				return [{
					name: 'Tokyo',
					data: [49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4]

				}, {
					name: 'New York',
					data: [83.6, 78.8, 98.5, 93.4, 106.0, 84.5, 105.0, 104.3, 91.2, 83.5, 106.6, 92.3]

				}, {
					name: 'London',
					data: [48.9, 38.8, 39.3, 41.4, 47.0, 48.3, 59.0, 59.6, 52.4, 65.2, 59.3, 51.2]

				}, {
					name: 'Berlin',
					data: [42.4, 33.2, 34.5, 39.7, 52.6, 75.5, 57.4, 60.4, 47.6, 39.1, 46.8, 51.1]

				}]
			} else if (mode === 'anw' && this.data.length && this.type === 'pie') {
				return this.countAnwesenheitDataPie(this.data)
			} else if (mode === 'anw' && this.data.length && this.type === 'column') {
				return this.countAnwesenheitDataColumn(this.data)
			}
			
		},
		getXAxis() {
			if(mode === 'test') {
				return {
					categories: [
						'Jan',
						'Feb',
						'Mar',
						'Apr',
						'May',
						'Jun',
						'Jul',
						'Aug',
						'Sep',
						'Oct',
						'Nov',
						'Dec'
					],
					title: [''],
					labels: [''],
					crosshair: true
				}
			} else if (mode === 'anw' && this.type === 'column') {
				return {
					categories: [
						'anwesend',
						'abwesend',
						'entschuldigt'
					],
					crosshair: true
				}
			}
			
		},
		getYAxis() {
			if(mode === 'test') {
				return {
					min: 0,
					title: {
						text: 'Rainfall (mm)'
					}
				}
			} else if (mode === 'anw') {
				return {}
			}
			
		},
		getTooltip() {
			if(mode === 'test') {
				return {
					headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
					pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
						'<td style="padding:0"><b>{point.y:.1f} mm</b></td></tr>',
					footerFormat: '</table>',
					shared: true,
					useHTML: true
				}
			} else if (mode === 'anw') {
				return {}
			}
			
		}
	},
	watch: {
		type(newVal, oldVal) {
			console.log('new chart type: ' + newVal)
			this.chartOptions.chart.type = newVal	
		},
		stgSelected: {
			handler(newVal, oldVal) {
				console.log('stgSelected watcher')

				// recalc and set the available semNum options
				this.setSemNumOptions()
			},
			deep: true
		}
	},
	created(){
		this.fetchStatsOptions().then(() => this.fetchStatsData())
	},
	mounted() {

	},
	template: `
	<div>
		<h4>Statistische Auswertung</h4>
<!--		TODO: overflow/max_width solution or smth for high number of selections and thus chips in select-->
		<div class="row">
			<MultiSelect v-model="semesterSelected" display="chip" :options="options.semester" optionLabel="studiensemester_kurzbz" placeholder="Select Semesters"
    			 class="w-full md:w-20rem" />
    		<MultiSelect v-model="semNumSelected" display="chip" :options="semNumOptions" placeholder="Select SemNum"
    			 class="w-full md:w-20rem" />
    		<MultiSelect v-model="stgSelected" display="chip" :options="options.stg" optionLabel="label" placeholder="Select Stg"
    			 class="w-full md:w-20rem" />
    		<MultiSelect v-model="lvaSelected" display="chip" optionGroupLabel="label" :options="getLvaOptionsGrouped" optionLabel="label" optionGroupChildren="items" placeholder="Select LVA"
    			 class="w-full md:w-20rem" >
    			 
    			 <template #optiongroup="slotProps">
					<div class="flex align-items-center">
						<div>{{ slotProps.option.label }}</div>
					</div>
				</template>

    		<MultiSelect/>
		</div>
		
		<div class="mt-2">
			<label for="chartTypeSelect">Chart Typ</label>
			
			<select id="chartTypeSelect" @change="chartTypeChanged" class="form-control" v-model="type">
				<option v-for="t in types" :value="t">
					<a>{{t}}</a>
				</option>
			</select>
		</div>
		
		<Button @click="fetchStatsData">Query</Button>
		<div class="card mt-3">
			<div class="card-header">
				<h5 class="mb-0">Anwesenheiten Data</h5>
			</div>
			
			<div class="card-body" style="text-align:center">
				<div class="row">
					<Button :class="type === 'pie' ? 'active ' : '' + 'btn btn-outline-secondary'" style="width: 48px;" @click="type='pie'"><i class="fa-solid fa-chart-pie"></i></Button>
					<Button :class="type === 'bar' ? 'active ' : '' + 'btn btn-outline-secondary'" style="width: 48px;" @click="type='bar'"><i class="fa-solid fa-chart-bar"></i></Button>
					<Button :class="type === 'column' ? 'active ' : '' + 'btn btn-outline-secondary'" style="width: 48px;" @click="type='column'"><i class="fa-solid fa-chart-simple"></i></Button>
					<Button :class="type === 'line' ? 'active ' : '' + 'btn btn-outline-secondary'" style="width: 48px;" @click="type='line'"><i class="fa-solid fa-chart-line"></i></Button>
				</div>
				<div style="width:100%;height:100%;overflow:auto">
	<!--				<FhcChart ref="fhcChartRef" chart_id="123" :type="Bar" title="TestTitle" longtitle="LongTestTitle"-->
	<!--				:series="dataseries" :xAxis="getXAxis" :legend="getLegend"/>-->
<!--					<FhcChart ref="fhcChartRef" chart_id="123" :type="type" :title="chartLabel" longtitle="LongTestTitle"-->
<!--					:series="getSeries" :xAxis="getXAxis" :yAxis="getYAxis" :tooltip="getTooltip" :plotOptions="getPlotOptions"/>-->
					
					<figure>
						<highcharts class="chart" :options="chartOptions"></highcharts>
					</figure>
					
				</div>
			</div>
		</div>

	</div>
`
};

export default StatsComponent