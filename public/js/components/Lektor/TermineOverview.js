export const TermineOverview = {
	name: 'TermineOverview',
	components: {
		Calendar: primevue.calendar,
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
		debugShow() {
			const ref = this.$refs.calendarRef
			debugger
		},
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
			debugger
			const formatted = this.$formatTime(new Date(slotProp.date.year, slotProp.date.month, slotProp.date.day).getTime(), '.', 'DD-MM-YYYY')
			const found = this.kontrollen.find(t => {
				return t.datum === formatted
			})

			return !!found
		}
	},
	created(){

	},
	mounted() {

	},
	updated(){

	},
	watch: {
		termine(newVal, oldVal) {
			console.log('watch termine')
			console.log(newVal)
		},
		kontrollen(newVal, oldVal) {
			console.log('watch kontrollen')

			console.log(newVal)
		},
		date(newVal) {
			console.log('watch date')

			console.log(newVal)
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
		}
	},
	template:`	
	
		<Calendar ref="calendarRef" @show="debugShow" v-model="date" dateFormat="YYYY-MM-DD" inline>
			<template #date="slotProps">
				<template v-if="isTermin(slotProps)">
					<a v-if="isKontrolle(slotProps)" style="color: red">K</a>
					{{ slotProps.date.day }} 
					<a v-if="isTermin(slotProps)" style="color: green">T</a>
				</template>
<!--				<strong v-if="isTermin(slotProps)" >{{ slotProps.date.day }} <a style="">.</a></strong>-->
<!--				<template v-else>{{ slotProps.date.day }}</template>-->
			</template>
		</Calendar>
	
	`
};