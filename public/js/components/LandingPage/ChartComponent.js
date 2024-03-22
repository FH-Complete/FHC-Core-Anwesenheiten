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

	},
	props: {
		lva: null,
		sem_kurzbz: null,
		type: null
	},
	mounted() {
		// TODO: differentiate by permission what to show

		Vue.$fhcapi.Student.getAll(this.sem_kurzbz).then(res => {
			console.log(res)

			if(!res.data.data) return

			const anw = res.data.data.retval
			const anwesendData= [0]
			const abwesendData= [0]
			const entschuldigtData= [0]
			const categories = []

			anw.forEach(entry => {
				if(categories.indexOf(entry.bezeichnung) < 0) categories.push(entry.bezeichnung)

				if(entry.student_status === "anwesend") {
					anwesendData[0]++
				} else if (entry.student_status === "abwesend") {
					abwesendData[0]++
				} else if (entry.student_status === "entschuldigt") {
					entschuldigtData[0]++
				}
			})

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
	},
	template: `
	<div id="container" ref="highchartWrapper">

	</div>
`
};


