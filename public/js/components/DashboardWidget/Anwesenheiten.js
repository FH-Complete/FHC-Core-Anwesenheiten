import AbstractWidget from '../../../../../js/components/DashboardWidget/Abstract.js';
import anwesenheitenAPI from "../../api/fhcapifactory.js";
import ScanComponent from "../Student/ScanComponent.js";
import QuotasOverview from "../QuotasOverview.js";
import EntschuldigungOverview from "../EntschuldigungOverview.js";


export default {
	name: "WidgetsAnwesenheiten",
	components: {
		ScanComponent,
		QuotasOverview,
		EntschuldigungOverview,
		Accordion: primevue.accordion,
		AccordionTab: primevue.accordiontab
	},
	mixins: [AbstractWidget],
	inject: {
		viewData: {
			type: Object,
			default: {}
		},
		editModeIsActive: {
			type: Boolean,
			default: false
		}
	},
	data: () => ({
		quotas: null,
		entschuldigungen: null,
		tabPassthroughStyle: {
			content: {
				style: {
					padding: '0px'
				}
			}
		}
	}),
	methods: {
		getLink(path) {
			return (FHC_JS_DATA_STORAGE_OBJECT.app_root +
				FHC_JS_DATA_STORAGE_OBJECT.ci_router + path)
		},
		fetchData(){
			this.$fhcApi.factory.Anwesenheiten.Profil.getAllAnwQuotasForLvaByUID(null, this.viewData.uid, this.viewData.person_id)
				.then(res => {
					this.quotas = res.data
					this.quotas.forEach(q => {
						q.showDetails = false
						q.details = Vue.reactive([])
					})
				})

			this.$fhcApi.factory.Anwesenheiten.Profil.getEntschuldigungenByPersonID(this.viewData.person_id)
				.then(res => {
					this.entschuldigungen = res.data?.retval
				})
		}
	},
	computed: {
		css() {
			return ['dashboard-widget-default', this.config.css];
		}
	},
	async created() {
		if (!this.$fhcApi.factory.Anwesenheiten) this.$fhcApi.factory.addEndpoints({Anwesenheiten: anwesenheitenAPI.factory})
		if (!this.viewData.uid || !this.viewData.person_id) {
			await this.$fhcApi.factory.Anwesenheiten.Info.getViewDataStudent().then((res) => {
				this.viewData.uid = res.data.uid
				this.viewData.person_id = res.data.person_id
				
				this.fetchData()
			})
		} else {
			this.fetchData()
		}
		this.$emit('setConfig', false)
	},
	template: /*html*/ `
    <div class="widgets-anw w-100 h-100">
		<div style="height: 100%; overflow-y: auto">
			<Accordion ref="accordion" :multiple="true" :activeIndex="[0, 1, 2]">
				<AccordionTab :header="$p.t('global/zugangscode')" style="padding: 0px;" :pt="tabPassthroughStyle">
					<ScanComponent></ScanComponent>
				</AccordionTab>
				<AccordionTab :header="$p.t('global/anwesenheiten')" :pt="tabPassthroughStyle">
					<QuotasOverview :quotas="this.quotas" :uid="this.viewData.uid"></QuotasOverview>
				</AccordionTab>
				<AccordionTab :header="$p.t('global/entschuldigungen')" :pt="tabPassthroughStyle"> 
					<template #header>
						<div style="margin-left: auto; display: inline-block;">
							<a :href="getLink('/extensions/FHC-Core-Anwesenheiten/Profil/Entschuldigung')" class="ms-auto mb-2">
								<i class="fa fa-arrow-up-right-from-square me-1"></i>
							</a>
						</div>
					</template>
					<EntschuldigungOverview :entschuldigungen="this.entschuldigungen"></EntschuldigungOverview>
				</AccordionTab>
			</Accordion>
		</div>
    </div>`
};
