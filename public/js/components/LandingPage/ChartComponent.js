import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreFilterCmpt} from '../../../../../js/components/filter/Filter.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';

export default {
	name: 'ChartComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreFilterCmpt,
		CoreRESTClient
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			isLektor: false,
			isStudent: false
		};
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		async setupLektorGraphs() {
			await this._.root.appContext.config.globalProperties.$entryParams.lePromise

			this.$fhcApi.post('extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByLva',
				{
					lv_id: this._.root.appContext.config.globalProperties.$entryParams.lv_id,
					le_ids: [this._.root.appContext.config.globalProperties.$entryParams.selected_le_id],
					sem_kurzbz: this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
				})
				.then(res => {
					console.log('lektorGetAllAnwesenheitenByLva', res)

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

				res.data[0].retval.forEach(entry => {
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

				Highcharts.chart('container', {
					chart: {
						type: 'pie'
					},
					title: {
						text: 'Anwesenheitsquote ' // TODO: maybe enter lva/le bezeichnung here
					},
					tooltip: {
						valueSuffix: '%'
					},
					plotOptions: {
						series: {
							allowPointSelect: true,
							// cursor: 'pointer',
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

			})

			this.$fhcApi.post('extensions/FHC-Core-Anwesenheiten/Api/lektorGetAllAnwesenheitenByStudiengang',
				{
					stg_kz: this._.root.appContext.config.globalProperties.$entryParams.stg_kz,
					sem_kurzbz: this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
				})
				.then(res => {
					console.log(res)
				})
		},
		setupStudentGraphs() {
			// TODO: maybe dont fetch/show all anwesenheiten and only for lva of current context?
			this.$fhcApi.get('extensions/FHC-Core-Anwesenheiten/Api/studentGetAll',
				{studiensemester: this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz}).then(res => {
				console.log('extensions/FHC-Core-Anwesenheiten/Api/studentGetAll',res)

				if(!res.data) return

				const anw = res.data.retval
				const anwesendData= []
				const abwesendData= []
				const entschuldigtData= []
				const categories = []

				anw.forEach(entry => {
					if(categories.indexOf(entry.bezeichnung) < 0) {
						categories.push(entry.bezeichnung)
						anwesendData.push(0)
						abwesendData.push(0)
						entschuldigtData.push(0)
					}

				})

				// TODO: remove hardcoded statuschecks
				anw.forEach(entry => {
					const categoryIndex = categories.indexOf(entry.bezeichnung)
					if(entry.student_status === "anwesend") {
						anwesendData[categoryIndex]++
					} else if (entry.student_status === "abwesend") {
						abwesendData[categoryIndex]++
					} else if (entry.student_status === "entschuldigt") {
						entschuldigtData[categoryIndex]++
					}
				})

				console.log('anwesendData', anwesendData)
				console.log('abwesendData', abwesendData)
				console.log('entschuldigtData', entschuldigtData)
				console.log('categories', categories)

				Highcharts.chart('container', {
					chart: {
						type: 'bar'
					},
					title: {
						text: 'Anwesenheiten'
					},
					xAxis: {
						categories: categories
					},
					yAxis: {
						title: {
							text: 'Stunden anwesend'
						}
					},
					series: [{
						name: 'Anwesend',
						data: anwesendData
					}, {
						name: 'Abwesend',
						data: abwesendData
					},
						{
							name: 'Entschuldigt',
							data: entschuldigtData
						}]
				})
			})
		}
	},
	props: {
		lva: null,
		sem_kurzbz: null,
		type: null
	},
	created() {
		this.isLektor = this._.root.appContext.config.globalProperties.$entryParams.permissions.lektor
		this.isStudent = this._.root.appContext.config.globalProperties.$entryParams.permissions.student

		console.log('this.isLektor', this.isLektor)
		console.log('this.isStudent', this.isStudent)
	},
	mounted() {
		// TODO: differentiate by permission what to show

		if(this.isStudent) {
			this.setupStudentGraphs()
		} else if (this.isLektor) {
			console.log('mounted chart component would attempt to fetch with le ids now')
			this.setupLektorGraphs()
		}

	},
	template: `
	<div id="container" ref="highchartWrapper">

	</div>
`
};


