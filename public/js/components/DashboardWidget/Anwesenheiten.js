import AbstractWidget from '../../../../../js/components/DashboardWidget/Abstract';
import anwesenheitenAPI from "../../api/fhcapifactory";

export default {
	name: "WidgetsAnwesenheiten",
	mixins: [AbstractWidget],
	inject: {
		viewData: {
			type: Object,
			default: null
		},
		editModeIsActive: {
			type: Boolean,
			default: false
		}
	},
	data: () => ({

	}),
	methods: {


	},
	computed: {
		css() {
			return ['dashboard-widget-default', this.config.css];
		}
	},
	created() {
		if(!this.$fhcApi.factory.Anwesenheiten) this.$fhcApi.factory.bindKeys({Anwesenheiten: anwesenheitenAPI.factory}, this.$fhcApi.factory)
		
		this.$emit('setConfig', false)
	},
	mounted() {
		this.$fhcApi.factory.Anwesenheiten.Profil.getAllAnwByUID(null, this.viewData.uid, this.viewData.person_id)	
	},
	template: /*html*/ `
    <div class="widgets-anw w-100 h-100" style="padding: 1rem 1rem;">
		uid: {{ viewData?.uid }}, person_id {{ viewData?.person_id}}
    </div>`,
};
