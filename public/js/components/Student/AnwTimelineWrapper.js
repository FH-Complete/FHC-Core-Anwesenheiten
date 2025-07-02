
import AnwTimeline from '../Assistenz/AnwTimeline.js';
import ApiAdmin from "../../api/factory/administration.js";

export const AnwTimelineWrapper = {
	name: 'AnwTimelineWrapper',
	components: {
		AnwTimeline
	},
	data: function() {
		return {
			selectedEntschuldigung: null,
			selectedAnwArray: null,
			selectedEntArray: null
		};
	},

	methods: {
		async reload() {
			this.loadTimeline()
		},
		loadTimeline(){
			this.$api.call(ApiAdmin.getTimeline(this.$entryParams.selected_student_info.person_id))
				.then(
					(res) => {
						this.selectedAnwArray = res.data[0].retval
						this.selectedEntArray = res.data[1].retval
						this.selectedEntschuldigung = this.selectedEntArray.length ? this.selectedEntArray[0] : null
					}
				)
		}
	},
	computed: {

	},
	created() {
	},
	mounted() {
		this.loadTimeline()
	},
	template: `
<!-- max-width so faulty cis4 css doesnt mess up beautiful timeline -->
	<div class="anw-timeline-wrapper" style="max-width: 80vw">
		<AnwTimeline v-model="selectedEntschuldigung" :anwArray="selectedAnwArray" :entArray="selectedEntArray"></AnwTimeline>
	</div>
		
`
};

export default AnwTimelineWrapper