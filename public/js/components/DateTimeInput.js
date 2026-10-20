import VueDatePicker from '../../../../js/components/vueDatepicker.js.php';

/**
 * One point in time as a date picker and a time picker, users found the combined date time picker hard to use.
 * v-model is a Date in the browser zone, like the combined picker had. It is null while one input is empty.
 * The date input has the id dp-input-<uid>, a label can point to it.
 */
export default {
	name: 'DateTimeInput',
	components: {
		Datepicker: VueDatePicker
	},
	emits: [
		'update:modelValue'
	],
	props: {
		modelValue: Date,
		uid: {
			type: String,
			required: true
		},
		// the start of the aria labels of both inputs, e.g. "Von"
		label: {
			type: String,
			default: ''
		},
		minDate: Date,
		disabled: Boolean
	},
	data() {
		return {
			date: null,
			time: null
		};
	},
	watch: {
		modelValue: {
			handler(value) {
				// null comes from an empty input, the other input keeps its value
				if (!(value instanceof Date) || isNaN(value)) return;

				const dateTime = luxon.DateTime.fromJSDate(value);
				this.date = dateTime.startOf('day').toJSDate();
				this.time = { hours: dateTime.hour, minutes: dateTime.minute };
			},
			immediate: true
		}
	},
	methods: {
		setDate(date) {
			this.date = date;
			this.emitValue();
		},
		setTime(time) {
			this.time = time;
			this.emitValue();
		},
		emitValue() {
			if (!this.date || !this.time)
				return this.$emit('update:modelValue', null);

			const dateTime = luxon.DateTime.fromJSDate(this.date)
				.set({ hour: this.time.hours, minute: this.time.minutes, second: 0, millisecond: 0 });
			this.$emit('update:modelValue', dateTime.toJSDate());
		},
		// tab from an input with an open menu went into the menu, the focus was lost when the menu closed.
		// close the menu and let the focus go on to the next field
		skipMenu(event) {
			if (event.target.tagName !== 'INPUT') return;

			this.$refs.date.closeMenu();
			this.$refs.time.closeMenu();
			// the closing menu stays in the dom until its transition ends
			this.$el.querySelectorAll('.dp__outer_menu_wrap').forEach(menu => menu.inert = true);
		}
	},
	template: `
	<div class="row g-2" @keydown.tab="skipMenu">
		<div class="col-7">
			<datepicker
				ref="date"
				:uid="uid"
				:model-value="date"
				@update:model-value="setDate"
				:clearable="false"
				auto-apply
				:enable-time-picker="false"
				format="dd.MM.yyyy"
				:text-input="true"
				:min-date="minDate"
				:disabled="disabled"
				:aria-labels="{ input: label + ' ' + $capitalize($p.t('global/datum')) }"
			></datepicker>
		</div>
		<div class="col-5">
			<datepicker
				ref="time"
				:uid="uid + '-time'"
				:model-value="time"
				@update:model-value="setTime"
				:clearable="false"
				auto-apply
				:time-picker="true"
				:text-input="true"
				:disabled="disabled"
				:aria-labels="{ input: label + ' ' + $capitalize($p.t('global/uhrzeit')) }"
			></datepicker>
		</div>
	</div>`
};
