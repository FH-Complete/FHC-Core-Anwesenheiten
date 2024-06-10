import LektorComponent from "../components/Lektor/LektorComponent.js";
import FhcApi from '../../../../js/plugin/FhcApi.js';
import Phrasen from "../../../../js/plugin/Phrasen.js";
import StudentByLvaComponent from "../components/Lektor/StudentByLvaComponent";
import StudentComponent from "../components/Student/StudentComponent";
import StudentAnwesenheitComponent from "../components/Student/StudentAnwesenheitComponent";
import StudentEntschuldigungComponent from "../components/Student/StudentEntschuldigungComponent";
import ScanComponent from "../components/Student/ScanComponent";
import SetupComponent from "../components/Setup/SetupComponent";
import AssistenzComponent from "../components/Assistenz/AssistenzComponent";
import LandingPageComponent from "../components/LandingPage/LandingPageComponent";
import fhcapifactory from "../api/fhcapifactory";

const ciPath = FHC_JS_DATA_STORAGE_OBJECT.app_root.replace(/(https:|)(^|\/\/)(.*?\/)/g, '') + FHC_JS_DATA_STORAGE_OBJECT.ci_router;

const router = VueRouter.createRouter({
	history: VueRouter.createWebHistory(`/${ciPath}/extensions/FHC-Core-Anwesenheiten/`),
	routes: [
		{
			path: `/Lektor/anwesenheitByStudent/:id/:lv_id/:sem_kz`,
			name: 'StudentByLva',
			component: StudentByLvaComponent,
			props: true
		},
		{
			path: `/Lektor`,
			name: 'Lektor',
			component: LektorComponent,
		},
		{
			path: `/Student`,
			name: 'Student',
			component: StudentComponent
		},
		{
			path: '/Setup',
			name: 'Setup',
			component: SetupComponent
		},
		{
			path: `/Assistenz`,
			name: 'Assistenz',
			component: AssistenzComponent
		},
		{
			path: '/Student/Scan/:zugangscode?',
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
			path: '/Student/:catchAll(.*)',
			redirect: { name: 'Student'}
		},
		{
			path: '/Lektor/:catchAll(.*)',
			redirect: { name: 'Lektor'}
		},
		{
			path: '/Assistenz/:catchAll(.*)',
			redirect: { name: 'Assistenz'}
		},
		{
			path: '/Setup/:catchAll(.*)',
			redirect: { name: 'Setup'}
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
			isMobile: Math.min(window.screen.width, window.screen.height) < 768 || navigator.userAgent.indexOf("Mobi") > -1,

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
anwesenheitApp.config.globalProperties.$entryParams = {}

anwesenheitApp.config.globalProperties.$capitalize = (string) => {
	if(!string) return ''
	return string[0].toUpperCase() + string.slice(1);
}

anwesenheitApp
	.use(router)
	.use(FhcApi, fhcapifactory)
	.use(primevue.config.default, {zIndex: {overlay: 9999}})
	.use(Phrasen)
	.mount("#main");

// router.beforeEach((to, from) => {
// 		const eP = anwesenheitApp.config.globalProperties.$entryParams
//
// 		// skip landing page for assistenz since they got no content there
// 		if(eP.permissions.assistenz && to.name === "LandingPage") {
// 			return eP.phrasenPromise.then( () =>{
// 				return {name: "Assistenz"}
// 			})
// 		}
//
// 		return true
// })
