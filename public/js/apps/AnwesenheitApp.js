import LektorComponent from "../components/Lektor/LektorComponent.js";
import FhcApi from '../../../../js/plugin/FhcApi.js';
import Phrasen from "../../../../js/plugin/Phrasen.js";
import StudentByLvaComponent from "../components/Lektor/StudentByLvaComponent";
import StudentComponent from "../components/Student/StudentComponent";
import StudentAnwesenheitComponent from "../components/Student/StudentAnwesenheitComponent";
import StudentEntschuldigungComponent from "../components/Student/StudentEntschuldigungComponent";
import ScanComponent from "../components/Student/ScanComponent";
import AssistenzComponent from "../components/Assistenz/AssistenzComponent";
import LandingPageComponent from "../components/LandingPage/LandingPageComponent";
import fhcapifactory from "../api/fhcapifactory";

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
			name: 'LandingPage',
			component: LandingPageComponent,
		},
		{
			path: '/Profil/Scan/:zugangscode?',
			name: 'Scan',
			component: ScanComponent,
			props: true
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

	}
});
anwesenheitApp.config.globalProperties.$entryParams = {
	isInFrame: !!window.frameElement,
	isMobile: Math.min(window.screen.width, window.screen.height) < 768 || navigator.userAgent.indexOf("Mobi") > -1,
}

anwesenheitApp.config.globalProperties.$capitalize = (string) => {
	if(!string) return ''
	return string[0].toUpperCase() + string.slice(1);
}

anwesenheitApp
	.use(router)
	.use(FhcApi, fhcapifactory)
	.use(primevue.config.default, {
		zIndex: {overlay: 9999},
	})
	.use(Phrasen)
	.mount("#main");

