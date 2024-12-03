import AbstractWidget from '../../../../../js/components/DashboardWidget/Abstract';
import anwesenheitenAPI from "../../api/fhcapifactory";
import ScanComponent from "../Student/ScanComponent";
import QuotasOverview from "../QuotasOverview";

export default {
	name: "WidgetsAnwesenheiten",
	components: {
		ScanComponent,
		QuotasOverview
	},
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
		quotas: null
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

		this.$fhcApi.factory.Anwesenheiten.Profil.getAllAnwQuotasForLvaByUID(null, this.viewData.uid, this.viewData.person_id)
			.then(res => this.quotas = res.data)
	},
	template: /*html*/ `
    <div class="widgets-anw w-100 h-100" style="padding: 1rem 1rem;">
		<ScanComponent></ScanComponent>
		<QuotasOverview :quotas="this.quotas"></QuotasOverview>
    </div>`,
};
