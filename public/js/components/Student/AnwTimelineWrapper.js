
import AnwTimeline from '../Assistenz/AnwTimeline.js';
import ApiProfil from "../../api/factory/profil.js";

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
		async loadTimeline(){
			await this.$entryParams.profileViewDataPromise

			// students see their own timeline: no selected student => person_id null
			this.$api.call(ApiProfil.getTimeline(this.$entryParams.selected_student_info?.person_id ?? null))
				.then(
					(res) => {
						this.selectedAnwArray = Array.isArray(res.data?.[0]) ? res.data[0] : []
						this.selectedEntArray = Array.isArray(res.data?.[1]) ? res.data[1] : []
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
	<div class="anw-timeline-wrapper">
		<AnwTimeline v-model="selectedEntschuldigung" :anwArray="selectedAnwArray" :entArray="selectedEntArray"></AnwTimeline>
	</div>
		
`
};

export default AnwTimelineWrapper