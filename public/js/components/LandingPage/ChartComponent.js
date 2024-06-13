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
		};
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		countAnwesenheitDataPie (statusArrParam, mode = 'byEntry') {
			const statusArr = statusArrParam ?? []

			const anw = Vue.computed(()=> this.$capitalize(this.$p.t('global/anwesend')) )
			const abw = Vue.computed(()=> this.$capitalize(this.$p.t('global/abwesend')) )
			const ent = Vue.computed(()=> this.$capitalize(this.$p.t('global/entschuldigt')) )
			const anwesenheitenData = [{
				name: anw.value,
				color: '#02c016',
				y: 0
			},
			{
				name: abw.value,
				color: '#e60606',
				y: 0
			},
			{
				name:  ent.value,
				color: '#1841fe',
				y: 0
			}]

			if(mode === 'byEntry') {
				let anwCounter = 0
				let abwCounter = 0
				let entCounter = 0

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
			} else if (mode === 'byTime') {
				let anwTime = 0
				let abwTime = 0
				let entTime = 0

				statusArr.forEach(entry => {
					if(!entry.status) return

					const entryVonDate = new Date(entry.von)
					const entryBisDate = new Date(entry.bis)
					const diff = entryBisDate.getTime() - entryVonDate.getTime()
					switch(entry.status) {
						case 'abwesend':
							abwTime += diff
							break;
						case 'anwesend':
							anwTime += diff
							break;
						case 'entschuldigt':
							entTime += diff
							break;
					}
				})

				anwesenheitenData[0].y = Number((anwTime / (abwTime + anwTime + entTime) * 100).toFixed(2))
				anwesenheitenData[1].y = Number((abwTime / (abwTime + anwTime + entTime) * 100).toFixed(2))
				anwesenheitenData[2].y = Number((entTime / (abwTime + anwTime + entTime) * 100).toFixed(2))
			}


			return anwesenheitenData
		},
		addPieChartToWrapper (anwesenheitenData, elementID, title) {
			Highcharts.chart(elementID, {
				chart: {
					type: 'pie',
					height: 250,
					width: 250
				},
				title: {
					text: title,
					size: '12px'
				},
				tooltip: {
					valueSuffix: '%'
				},
				plotOptions: {
					series: {
						allowPointSelect: true,
						dataLabels: [{
							enabled: true,
							distance: 10
						}, {
							enabled: true,
							distance: -20,
							format: '{point.percentage:.1f}%',
							style: {
								fontSize: '0.6em',
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
		async setupLektorGraphs() {
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise
			if(!this.$entryParams.selected_le_id) return

			const wrapperDiv = document.getElementById('highchartWrapper')
			if(!wrapperDiv) return
			// this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLvaAssigned(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz, this.$entryParams.selected_le_id).then(res => {
			// 	console.log('lektorGetAllAnwesenheitenByLvaAssigned', res)
			// 	if(!res.data) return
			// 	const anwesenheitenData = this.countAnwesenheitDataPie(res.data[1])
			//
			// 	const containerByLvaLektor = document.createElement('div')
			// 	const id = 'containerByLvaLektor'
			// 	containerByLvaLektor.id = id
			// 	wrapperDiv.appendChild(containerByLvaLektor)
			//
			// 	this.addPieChartToWrapper(anwesenheitenData, id, this.$p.t('global/anwByLe', {le: this.$entryParams.selected_le_info.infoString}))
			// })
			//
			//


			// this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByStudiengang(this.$entryParams.stg_kz, this.$entryParams.sem_kurzbz).then(res => {
			// 	console.log('lektorGetAllAnwesenheitenByStudiengang', res)
			//
			// 	if(!res.data) return
			// 	const anwesenheitenData = this.countAnwesenheitDataPie(res.data)
			//
			// 	const containerByStg = document.createElement('div')
			// 	const id = 'containerByStg'
			// 	containerByStg.id = id
			// 	wrapperDiv.appendChild(containerByStg)
			//
			// 	this.addPieChartToWrapper(anwesenheitenData, id, this.$p.t('global/anwByStg', {stg: this.$entryParams.selected_le_info.kurzbzlang}))
			// })

			this.$fhcApi.factory.Kontrolle.getAllAnwesenheitenByLva(this.$entryParams.lv_id, this.$entryParams.sem_kurzbz).then(res => {
					console.log('lektorGetAllAnwesenheitenByLva', res)

					if(!res.data) return
					const anwesenheitenData = this.countAnwesenheitDataPie(res.data.retval)

					const containerByLva = document.createElement('div')
					const id = 'containerByLva'
					containerByLva.id = id
					wrapperDiv.appendChild(containerByLva)

					this.addPieChartToWrapper(anwesenheitenData, id, this.$p.t('global/anwByLva', {lva: this.$entryParams.selected_le_info.kurzbz}))
				})

		},
		async setupStudentGraphs() {
			console.log(this.$entryParams)
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise
			// TODO: maybe dont fetch/show all anwesenheiten and only for lva of current context?
			const wrapperDiv = document.getElementById('highchartWrapper')
			if(!wrapperDiv) return

			this.$fhcApi.factory.Profil.getAllAnw(this.$entryParams.sem_kurzbz).then(res => {
				console.log('extensions/FHC-Core-Anwesenheiten/Api/studentGetAll',res)

				if(!res.data.retval) return

				const anw = res.data.retval
				const categories = []
				anw.forEach(entry => {
					const cat = categories.find(el => el.bezeichnung === entry.bezeichnung)
					if (!cat) {
						categories.push({bezeichnung: entry.bezeichnung, data: [{status: entry.student_status, von: entry.von, bis: entry.bis}]})
					} else {
						cat.data.push({status: entry.student_status, von: entry.von, bis: entry.bis})
					}
				})

				categories.forEach(category => {
					const anwesenheitenDataByTime = this.countAnwesenheitDataPie(category.data, 'byTime')

					const containerCategoryByTime = document.createElement('div')
					const idByTime = category.bezeichnung + ' byTime'
					containerCategoryByTime.id = idByTime

					containerCategoryByTime.style.flex = '1 0 300px';
					containerCategoryByTime.style.margin = '10px';
					// containerCategory.style.maxWidth = '250px';
					// containerCategory.style.maxHeight = '250px';
					wrapperDiv.appendChild(containerCategoryByTime)

					this.addPieChartToWrapper(anwesenheitenDataByTime, idByTime, category.bezeichnung)

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

	},
	mounted() {

		if(this.$entryParams.permissions.student) {
			this.setupStudentGraphs()
		} else if (this.$entryParams.permissions.lektor || this.$entryParams.permissions.admin) {
			this.setupLektorGraphs()
		}

	},
	template: `
	<div id="highchartWrapper" style="display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: center;">

	</div>
`
};


