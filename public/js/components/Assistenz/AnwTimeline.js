import VueDatePicker from '../../../../../js/components/vueDatepicker.js.php';
import Range from './Range.js';
export const AnwTimeline = {
	name: "AnwTimeline",
	components: {
		Datepicker: VueDatePicker,
		Timeline: primevue.timeline,
		Range
	},
	data () {
		return {
			timelineStart: new Date(new Date(Date.now()).getFullYear(), 0, 1, 0, 0, 0, 0),
			timelineEnd: new Date(new Date(Date.now()).getFullYear(), 12, 31, 0, 0, 0, 0),
			hourWidth: 20,
			selectedRange: null // when clicking anw or ent assign this and show their fields
		};
	},
	props: {
		modelValue: null,
		anwArray: null,
		entArray: null
	},
	methods: {
		formatDateTimelineStart(date) {
			const day = date.getDate();
			const month = date.getMonth() + 1;
			const year = date.getFullYear();

			return `Timeline Start: ${day}.${month}.${year}`;
		},
		formatDateTimelineEnd(date) {
			const day = date.getDate();
			const month = date.getMonth() + 1;
			const year = date.getFullYear();

			return `Timeline End: ${day}.${month}.${year}`;
		},
		formatEntTime(ent) {
			return this.formatDate(ent.von) + ' - ' + this.formatDate(ent.bis)
		},
		highlightEntschuldigung(ent) {
			// check if date is in current range, if not expand range and then scrollIntoView nextTick
			
			const id = 'entRange-' + ent.entschuldigung_id
			const el = document.getElementById(id)
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' })
			}
		},
		showRangeDetails(range) {
			this.selectedRange = range	
		},
		dateToPercentage(dateStr) {
			const date = new Date(Date.parse(dateStr))
			const days = this.getDaysBetweenDates(date, this.timelineStart)
			const totalDays = this.getDaysBetweenDates(this.timelineStart, this.timelineEnd)
			return (days / totalDays) * 100
		},
		getRangeColor(akzeptiert) {
			if (akzeptiert === true) return 'rgba(0, 123, 255, 0.2)' // blue
			if (akzeptiert === false) return 'rgba(220, 53, 69, 0.2)' // red
			return 'rgba(32, 201, 151, 0.2)' // teal
		},
		getRangeColorAnw(anw) {
			if (anw.status === "anwesend") return 'rgba(182,252,0,0.66)' // blue
			if (anw.status === "abwesend") return 'rgba(255,4,4,0.68)' // red
			if (anw.status === "entschuldigt") return 'rgba(3,53,245,0.91)' // teal
		},
		getOverlayStyleEnt(range) {
			const start = new Date(range.von)
			const end = new Date(range.bis)
			const color = this.getRangeColor(range.akzeptiert)
			const offsetDays = this.getDaysBetweenDates(start, this.timelineStart)
			const rangeLength = this.getDaysBetweenDates(start, end)
			const rangeTime =  (end.getHours() + (end.getMinutes() / 60)) - (start.getHours() + (start.getMinutes() / 60))
			const offsetHours = start.getHours() + (start.getMinutes() / 60)
				
			const zOffset = Math.round(10000 / (rangeLength * 24 + rangeTime))
			
			return {
				position: 'absolute',
				top: '0',
				left: `${offsetDays * this.dayWidth + offsetHours * this.hourWidth}px`,
				width: `${rangeLength * this.dayWidth + rangeTime * this.hourWidth}px`,
				height: '100%',
				transform: 'translateY(-20px)',
				backgroundColor: color,
				zIndex: 9999 + zOffset,
				borderRadius: '6px'
			}
		},
		getOverlayStyleAnw(range) {
			const start = new Date(range.von)
			const end = new Date(range.bis)
			const color = this.getRangeColorAnw(range)
			const offsetDays = this.getDaysBetweenDates(start, this.timelineStart)
			const rangeLength = this.getDaysBetweenDates(start, end)
			const rangeTime =  (end.getHours() + (end.getMinutes() / 60)) - (start.getHours() + (start.getMinutes() / 60))
			const offsetHours = start.getHours() + (start.getMinutes() / 60)
			
			const zOffset = Math.round(10000 / (rangeLength * 24 + rangeTime))
			
			return {
				position: 'absolute',
				top: '0',
				left: `${offsetDays * this.dayWidth + offsetHours * this.hourWidth}px`,
				width: `${rangeLength * this.dayWidth + rangeTime * this.hourWidth}px`,
				height: '100%',
				transform: 'translateY(20px)',
				backgroundColor: color,
				zIndex: 9999 + zOffset,
				borderRadius: '6px'
			}
		},
		getDaysBetweenDates(date1, date2) {
			const diffTime = Math.abs(date1 - date2); // ms
			return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // convert to days
		},
		formatDate(dateParam) {
			const date = new Date(dateParam)
			// handle missing leading 0
			const padZero = (num) => String(num).padStart(2, '0');

			const month = padZero(date.getMonth() + 1); // Months are zero-based
			const day = padZero(date.getDate());
			const year = date.getFullYear();
			const hours = padZero(date.getHours());
			const minutes = padZero(date.getMinutes());

			return `${day}.${month}.${year} ${hours}:${minutes}`;
		},
		getTimelineEventStyle() {
			return {
				width: `${this.dayWidth}px`,
				transform: `translateX(-${this.dayWidth / 2}px)`,
				minHeight: '420px'
			}
		},
		handleScrollTimeline(e) {
			if(e.wheelDelta > 0) {
				this.hourWidth *= 1.2
			} else if (e.wheelDelta < 0) {
				this.hourWidth = this.hourWidth / 120 * 100
			}
		}
	},
	watch:{
		modelValue: {
			handler(newVal) {
				setTimeout(() => {
					const id = 'entRange-' + newVal.entschuldigung_id
					const el = document.getElementById(id)
					if (el) {
						el.scrollIntoView({ behavior: 'smooth', block: 'center' })
					}
				}, 200)
			},
			deep: true
		},
		anwArray: {
			handler(newVal) {

			},
			deep: true
		}
	},
	computed: {
		dayWidth() {
			return this.hourWidth * 24	
		},
		timelineWidth() {
			return this.getDaysBetweenDates(this.timelineStart, this.timelineEnd) * this.dayWidth	
		},
		getStatusLabel() {
			if(this.modelValue.akzeptiert === null) {
				return 'Entschuldigung Status offen'
			} else if (this.modelValue.akzeptiert === true) {
				return 'Entschuldigung akzeptiert'
			} else {
				return 'Entschuldigung abgelehnt'
			}
		},
		entTimeRanges() {
			if(!this.entArray) return []
			return this.entArray.filter(ent => new Date(ent.von) >= this.timelineStart && new Date(ent.bis) <= this.timelineEnd)
		},
		anwTimeRanges() {
			if(!this.anwArray) return []
			return this.anwArray.filter(anw => new Date(anw.von) >= this.timelineStart && new Date(anw.bis) <= this.timelineEnd)
		},
		events() {
			const startDate = new Date(this.timelineStart)
			const days = []
			let current = startDate

			while (current <= this.timelineEnd) {
				const year = current.getFullYear()
				const month = String(current.getMonth() + 1).padStart(2, '0')
				const day = String(current.getDate()).padStart(2, '0')
				const formattedDate = `${year}-${month}-${day}`

				days.push({
					title: `${month}/${day}`,
					date: formattedDate
				})

				current.setDate(current.getDate() + 1)
			}

			return days
			
		},
		getTimelineStyle() {
			return { 
				minWidth: this.timelineWidth + 'px',
				'--timeline-event-width': this.dayWidth + 'px'
			}
		}
	},
	template: `
	<div v-if="modelValue && anwArray && entArray" class="row" style="padding: 0px; margin: 0px;">
		<div class="col-3"> 
			<div class="max-height: 400px;" style="overflow: auto;">
				<template v-for="ent in entArray" :key="'menu-'+ent.entschuldigung_id">
					<div class="position-relative" >
						<button type="button" class="btn btn-light" @click="highlightEntschuldigung(ent)"><span>{{ent.entschuldigung_id}}: {{formatEntTime(ent)}}</span></button>
					</div>
				</template>
			</div>
		</div>
		<div class="col-9">
			<div class="row">
				<Range v-model="selectedRange">
			</div>
			<div class="row mt-2">
				<div class="col-6">
					<datepicker
						id="timelineStart"
						v-model="timelineStart"
						:clearable="false"
						:format="formatDateTimelineStart"
						auto-apply
						:time-picker="false">
					</datepicker>
				</div>
				<div class="col-6">
					<datepicker
						id="timelineEnd"
						v-model="timelineEnd"
						:clearable="false"
						:format="formatDateTimelineEnd"
						auto-apply
						:time-picker="false">
					</datepicker>
				</div>
			</div>
		</div>
		<div class="row" style="padding: 0px; margin: 0px;">
			<div @wheel.prevent="handleScrollTimeline" class="custom-timeline-scroll-wrapper p-5" style="margin-left: 12px; margin-right:12px;">
				<div class="timeline-container position-relative" :style="getTimelineStyle">
					<!-- Ent Range Overlays -->
					<div
					  v-for="(range, index) in entTimeRanges"
					  :key="'entRange-' + index"
					  :id="'entRange-' + range.entschuldigung_id"
					  class="timeline-overlay"
					  :style="getOverlayStyleEnt(range)"
					  @click="showRangeDetails(range)"
					>
						<div class="time-marker start">{{ formatDate(range.von) }}</div>
						<div class="time-marker end" style="transform: translateY(20px)">{{ formatDate(range.bis) }}</div>
					</div>
					
					<!-- Anw Overlays -->
					<div
					  v-for="(range, index) in anwTimeRanges"
					  :key="'anwRange-' + index"
					  :id="'anwRange-' + range.anwesenheit_user_id"
					  class="timeline-overlay"
					  :style="getOverlayStyleAnw(range)"
					  @click="showRangeDetails(range)"
					>
						<div class="time-marker start">{{ formatDate(range.von) }}</div>
						<div class="time-marker end" style="transform: translateY(20px)">{{ formatDate(range.bis) }}</div>
					</div>
				
					<!-- Timeline -->
					<Timeline :value="events" layout="horizontal" :unstyled="true">
						<template #content="slotProps">
							<div
							class="event-card text-center p-2"
							:style="getTimelineEventStyle(slotProps.item)"
							>
								<h6>{{ slotProps.item.title }}</h6>
							</div>
						</template>
					</Timeline>
				</div>	
			</div>
		</div>
	</div>
	<div v-else class="text-center">
		<i class="fa-solid fa-spinner fa-pulse fa-3x"></i>
	</div>
	`
}

export default AnwTimeline;