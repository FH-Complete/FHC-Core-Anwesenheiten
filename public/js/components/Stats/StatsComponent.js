export const StatsComponent = {
	name: 'StatsComponent',
	components: {

	},
	data: function() {
		return {
			datasets: ['anwesenheiten' , 'entschuldigungen'],
			dataset: 'anwesenheiten',
			types: ['bar', 'line', 'pie', 'doughnut', 'polarArea', 'radar'],
			type: 'bar',
			chartData: null,
			data: null,
			
			stg: 0,
			options: {
				
			},
			lv_id: 41869,
			sem_kurzbz: 'WS2024',
			le_id: 150922,
			ma_uid: 'ma0293',
			date: '2024-12-16'
		};
	},
	methods: {
		fetchStatsOptions() {
			this.$fhcApi.factory.Anwesenheiten.Stats.fetchStatsOptions()
				// .then(res => this.options = res.data.options)	
		},
		fetchStatsData() {
			this.$fhcApi.factory.Anwesenheiten.Kontrolle.getAllAnwesenheitenByLvaAssigned(
				this.lv_id, this.sem_kurzbz, this.le_id, this.ma_uid, this.date
			).then(res => {
				this.data = res.data
				console.log('data', this.data)
				this.setupGraphs()
			})
			
			// this.$fhcApi.factory.Anwesenheiten.Stats.fetchStatsData(
			// 	this.lv_id, this.sem_kurbz, this.le_id, this.ma_uid, this.date
			// ).then(res => this.data = res.data)
		},
		setTheThing(e, thing) {
			const selected = e.target.selectedOptions
			this[thing] = selected[0]._value
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

			return anwesenheitenData
		},
		setupGraphs() {
			const wrapperDiv = document.getElementById('highchartWrapper')
			
			const anwesenheitenData = this.countAnwesenheitDataPie(this.data[1])

			const containerCategory = document.createElement('div')
			const id = 'anw test'//category.bezeichnung
			containerCategory.id = id

			containerCategory.style.flex = '1 0 300px';
			containerCategory.style.margin = '10px';
			containerCategory.style.maxWidth = '500px';
			wrapperDiv.appendChild(containerCategory)

			
			this.addPieChartToWrapper(anwesenheitenData, id, id)
		},
		addPieChartToWrapper (anwesenheitenData, elementID, title) {
			
			Highcharts.chart(elementID, {
				chart: {
					type: 'pie'
				},
				title: {
					text: title
				},
				tooltip: {
					valueSuffix: '%'
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
						data: anwesenheitenData
					}
				]
			});
		},
	},
	computed: {

	},
	mounted() {
		this.fetchStatsOptions()
		this.fetchStatsData()
		
		console.log(this.$entryParams)
	},
	template: `
	<div>
		<h4>stats title</h4>
		<div class="row">
			<div class="col-2">
				<select id="datasetSelect" @change="(e)=> setTheThing(e, 'dataset')" class="form-control">
					<option v-for="dataset in datasets" :value="dataset" >
						<a> {{dataset}} </a>
					</option>
				</select>
			</div>
			<div class="col-2">
				<select id="typeSelect" @change="(e)=> setTheThing(e, 'type')" class="form-control">
					<option v-for="type in types" :value="type" >
						<a> {{type}} </a>
					</option>
				</select>
			</div>
<!--			<div class="col-2">-->
<!--				<select id="semesterSelect" @change="(e)=> setTheThing(e, 'sem_kurzbz')" class="form-control">-->
<!--					<option v-for="sem in semesters" :value="sem" >-->
<!--						<a> {{sem}} </a>-->
<!--					</option>-->
<!--				</select>-->
<!--			</div>-->
<!--			<div class="col-2">-->
<!--				<select id="studiengangSelect" @change="(e)=> setTheThing(e, 'stg')" class="form-control">-->
<!--					<option v-for="stg in studiengaenge" :value="stg" >-->
<!--						<a> {{stg}} </a>-->
<!--					</option>-->
<!--				</select>-->
<!--			</div>-->
<!--			="col-2">-->
<!--				<select id="semesterSelect" @change="(e)=> setTheThing(e, 'sem_kurzbz')" class="form-control">-->
<!--					<option v-for="sem in semesters" :value="sem" >-->
<!--						<a> {{sem}} </a>-->
<!--					</option>-->
<!--				</select>-->
<!--			</div>-->
<!--			<div class="col-2">-->
<!--				<select id="ma_uidSelect" @change="(e)=> setTheThing(e, 'ma_uid')" class="form-control">-->
<!--					<option v-for="stg in studiengaenge" :value="stg" >-->
<!--						<a> {{stg}} </a>-->
<!--					</option>-->
<!--				</select>-->
<!--			</div>-->
<!--			="col-2">-->
<!--				<select id="lvaSelect" @change="(e)=> setTheThing(e, 'sem_kurzbz')" class="form-control">-->
<!--					<option v-for="sem in semesters" :value="sem" >-->
<!--						<a> {{sem}} </a>-->
<!--					</option>-->
<!--				</select>-->
<!--			</div>-->
<!--			<div class="col-2">-->
<!--				<select id="leSelect" @change="(e)=> setTheThing(e, 'le')" class="form-control">-->
<!--					<option v-for="stg in studiengaenge" :value="stg" >-->
<!--						<a> {{stg}} </a>-->
<!--					</option>-->
<!--				</select>-->
<!--			</div>-->
		</div>
		<div class="card mt-3">
		<div class="card-header">
			<h5 class="mb-0">Gehalt</h5>
		</div>
		
		<div class="card-body" style="text-align:center">
			<div style="width:100%;height:100%;overflow:auto">
				<figure>
					<div id="highchartWrapper" style="display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: center;">

					</div>
				</figure>
			</div>
		</div><!-- card-body -->
	</div><!-- card -->

	</div>
`
};

export default StatsComponent