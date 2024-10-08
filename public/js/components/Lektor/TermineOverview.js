import {Kontrolle} from "./Kontrolle";
import {Termin} from "./Termin";


export const TermineOverview = {
	name: 'TermineOverview',
	components: {
		Calendar: primevue.calendar,
		Panel: primevue.panel,
		Badge: primevue.badge,
		Kontrolle,
		Termin
	},
	data() {
		return {
			// date: '2024-09-05'
		}
	},
	props: {
		termine: null,
		kontrollen: null,
		date: null
	},
	methods: {
		isDate(slotProp) {

			if(this.date === null) return false

			return this.dateDay === slotProp.date.day && this.dateMonth === slotProp.date.month && this.dateYear === slotProp.date.year

		},
		isTermin(slotProp) {
			if(this.date === null || this.termine === null || !this.termine.length || !slotProp.date) return false

			const formatted = this.$formatTime(new Date(slotProp.date.year, slotProp.date.month, slotProp.date.day).getTime())
			const found = this.termine.find(t => {
				return t.datum === formatted
			})

			return !!found
		},
		isKontrolle(slotProp) {
			if(this.date === null || this.kontrollen === null || !this.kontrollen.length || !slotProp.date) return false

			const formatted = this.$formatTime(new Date(slotProp.date.year, slotProp.date.month, slotProp.date.day).getTime(), '.', 'DD-MM-YYYY')
			const found = this.kontrollen.find(t => {
				return t.datum === formatted
			})

			return !!found
		},
		handleDateSelect(e) {
			// console.log('handleDateSelect', e)
		},
		getKontrolleForTermin(termin) {
			// console.log('getKontrolleForTermin', termin)
			const kontrolleFound = this.kontrollen.find((k) => {
				return k.datum=== termin.datumFrontend
			})

			return kontrolleFound ?? null
		},
		kontrolleHasTermin(kontrolle) {
			// console.log('kontrolleHasTermin', kontrolle)

			const terminFound = this.termine.find((t) => {
				return t.datumFrontend === kontrolle.datum
			})

			return !!terminFound
		},
		linkTermineWithKontrollen() {
			this.termine.forEach(t => {
				const k = this.getKontrolleForTermin(t)
				t.kontrolle = k
			})
		}
	},
	created(){

	},
	mounted() {

	},
	updated(){

	},
	watch: {
		termine() {
			// console.log('watch termine')
			// console.log(newVal)
		},
		kontrollen() {
			// console.log('watch kontrollen')

			// console.log(newVal)
			// todo: maybe call somewhere else?
			this.linkTermineWithKontrollen()
		},
		date() {
			// console.log('watch date')

			// console.log(newVal)
		}
	},
	computed: {
		dateDay() {
			return this.date.getDate()
		},
		dateMonth() {
			return this.date.getMonth()
		},
		dateYear() {
			return this.date.getFullYear()
		},
		kontrollenOhneTermine() {
			const arr = []

			this.kontrollen.forEach(k => {
				if(!this.kontrolleHasTermin(k)) {
					arr.push(k)
				}
			})

			return arr
		}
	},
	template:`	
		<Panel header="Kalender Übersicht" toggleable collapsed>

			<Calendar ref="calendarRef" :style="{'width': '100%'}" @date-select="handleDateSelect" v-model="date" dateFormat="YYYY-MM-DD" inline>
				<template #date="slotProps">
					<template v-if="isTermin(slotProps)">
						<Badge v-if="isKontrolle(slotProps)" size="large" severity="danger" value="K"></Badge>
						{{ slotProps.date.day }} 
						<Badge v-if="isTermin(slotProps)" size="large" severity="success" value="T"></Badge>
					</template>
				</template>
			</Calendar>
		
		</Panel>
		
		<Panel header="Stundenplan Terminliste" toggleable collapsed>
			<a>Termine</a>
			<div v-for="termin in termine" :key="termin.datum">
				<Panel :header="termin.datumFrontend" toggleable collapsed>
					<template #icons>
						<div v-if="termin.kontrolle" :style="{'display': 'initial'}">
							<a> {{termin.kontrolle.anw}} / {{termin.kontrolle.sumAnw}} </a>
							<i  class="fa fa-circle-check text-success"></i>
						</div>
						
					</template>
					<Termin :value="termin"></Termin>
					<Kontrolle :value="getKontrolleForTermin(termin)"></Kontrolle>
				</Panel>
			</div>
			<div v-if="kontrollenOhneTermine.length" style="margin-top: 12px;">
				<a> Kontrollen ohne Termin</a>
				<div v-for="kontrolle in kontrollenOhneTermine" :key="kontrolle.datum">
					<Panel :header="kontrolle.datum" toggleable collapsed>
						<Kontrolle :value="kontrolle"></Kontrolle>
					</Panel>
				</div>
			</div>
			
		</Panel>
		
	
	`
};