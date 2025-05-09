import LektorComponent from "../components/Lektor/LektorComponent.js";
import FhcApi from '../../../../js/plugin/FhcApi.js';
import Phrasen from "../../../../js/plugin/Phrasen.js";
import {StudentByLvaComponent} from "../components/Lektor/StudentByLvaComponent.js";
import StudentComponent from "../components/Student/StudentComponent.js";
import StudentAnwesenheitComponent from "../components/Student/StudentAnwesenheitComponent.js";
import StudentEntschuldigungComponent from "../components/Student/StudentEntschuldigungComponent.js";
import ScanComponent from "../components/Student/ScanComponent.js";
import LandingPageComponent from "../components/LandingPage/LandingPageComponent.js";
import fhcapifactory from "../../../../js/api/fhcapifactory.js";
import anwesenheitenAPI from "../api/fhcapifactory.js";

const ciPath = FHC_JS_DATA_STORAGE_OBJECT.app_root.replace(/(https:|)(^|\/\/)(.*?\/)/g, '') + FHC_JS_DATA_STORAGE_OBJECT.ci_router;

const router = VueRouter.createRouter({
	history: VueRouter.createWebHistory(`/${ciPath}/extensions/FHC-Core-Anwesenheiten/`),
	routes: [
		{
			path: `/Kontrolle/anwesenheitByStudent/:id/:lv_id/:sem_kz`,
			name: 'StudentByLva',
			component: StudentByLvaComponent,
			props: true
		},
		{
			path: `/Administration`,
			name: 'Administration',
			component: LandingPageComponent,
		},
		{
			path: '/Profil/Scan/:zugangscode?',
			name: 'Scan',
			component: ScanComponent,
			props: true
		},
		{
			path: '/Profil/Entschuldigung',
			name: 'Profil',
			component: LandingPageComponent,
			props: { activetabstudent: 'entschuldigungen'}
		},

		{
			path: `/`,
			name: 'LandingPage',
			component: LandingPageComponent
		},
		{
			path: '/:catchAll(.*)',
			redirect: { name: 'LandingPage'},
			props: true
		}
	]
})

const anwesenheitApp = Vue.createApp({
	components: {
		LektorComponent,
		StudentByLvaComponent,
		StudentComponent,
		StudentAnwesenheitComponent,
		StudentEntschuldigungComponent
	},
	data() {
		return {
			title: "AnwesenheitApp",
		}
	},
	props: {

	},
	methods: {
	},
	created(){

	},
	mounted() {
		if(!this.$fhcApi.factory.Anwesenheiten && this.$fhcApi.factory.addEndpoints) this.$fhcApi.factory.addEndpoints({Anwesenheiten: anwesenheitenAPI.factory})
	}
});
anwesenheitApp.config.globalProperties.$entryParams = {
	isInFrame: !!window.frameElement,
	isMobile: Math.min(window.screen.width, window.screen.height) < 768 || navigator.userAgent.indexOf("Mobi") > -1,
	available_le_ids: Vue.ref([]),
	available_le_info: Vue.ref([]),
	selected_le_id: Vue.ref(),
	selected_le_info: Vue.ref(),
	available_maUID: Vue.ref([]),
	selected_maUID: Vue.ref(),
	available_termine: Vue.ref(),
	selected_termin: Vue.ref()
}

anwesenheitApp.config.globalProperties.$capitalize = (string) => {
	if(!string) return ''
	return string[0].toUpperCase() + string.slice(1);
}

anwesenheitApp.config.globalProperties.$formatTime = (timeStamp, delimiter = '-', format = 'YYYY-MM-DD') => {
	const date = new Date(timeStamp)
	switch (format) {
		case 'YYYY-MM-DD':
			return date.getFullYear() + delimiter + String(date.getMonth() + 1).padStart(2, '0') + delimiter + String(date.getDate()).padStart(2, '0');
		case 'DD-MM-YYYY':
			return String(date.getDate()).padStart(2, '0') + delimiter + String(date.getMonth() + 1).padStart(2, '0') + delimiter + date.getFullYear();
	}
}

anwesenheitApp.use(router)

const checkForCis4Tag = () =>  {
	const container = document.getElementById('main')
	return container?.getAttribute('cis4') === 'true'
}

const isCis4 = checkForCis4Tag()
if(isCis4) {
	anwesenheitApp.use(FhcApi, fhcapifactory) // Cis4
} else {
	anwesenheitApp.use(FhcApi, {
		factory:
			{
				Anwesenheiten: {
					"Kontrolle": anwesenheitenAPI.factory.Kontrolle,
					"Profil": anwesenheitenAPI.factory.Profil,
					"Info": anwesenheitenAPI.factory.Info,
					"Administration": anwesenheitenAPI.factory.Administration
				}
			}
	})
}

anwesenheitApp.use(primevue.config.default, {
		// TODO: set primevue locale with language
		zIndex: {
			overlay: 9000,
			tooltip: 8000
		}
	})
anwesenheitApp.use(Phrasen)

function getTarget(el) {

	return primevue.utils.DomHandler.hasClass(el, "p-inputwrapper")
		? primevue.utils.DomHandler.findSingle(el, "input")
		: el;
}

anwesenheitApp.directive("tooltip", {

	mounted(el) {
		const target = getTarget(el);
		target.$_ptooltipZIndex ??=
			anwesenheitApp.config.globalProperties.$primevue.config.zIndex.tooltip;
	},
	...primevue.tooltip,
});

anwesenheitApp.mount("#main");