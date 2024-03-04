import fhc_anwesenheitenapifactory from "../api/fhc-anwesenheitenapifactory.js";
import LektorComponent from "../components/Lektor/LektorComponent.js";
import FhcAlert from '../../../../js/plugin/FhcAlert.js';
import StudentByLvaComponent from "../components/Lektor/StudentByLvaComponent";
import StudentComponent from "../components/Student/StudentComponent";
import ScanComponent from "../components/Student/ScanComponent";
import AssistenzComponent from "../components/Assistenz/AssistenzComponent";

Vue.$fhcapi = fhc_anwesenheitenapifactory;

const ciPath = FHC_JS_DATA_STORAGE_OBJECT.app_root.replace(/(https:|)(^|\/\/)(.*?\/)/g, '') + FHC_JS_DATA_STORAGE_OBJECT.ci_router;


// TODO default routing for landing page! currently defaults only working after /Lektor/ or /Student/
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
			path: '/Student/:catchAll(.*)',
			redirect: { name: 'Student'}
		},
		{
			path: '/Lektor/:catchAll(.*)',
			redirect: { name: 'Lektor'}
		},
		{
			path: '/:catchAll(.*)',
			redirect: { name: 'Lektor'}
		}
	]
})

const anwesenheitApp = Vue.createApp({
	components: {
		LektorComponent,
		StudentByLvaComponent,
		StudentComponent
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

	},
	updated(){

	},
});
anwesenheitApp
	.use(router)
	.use(primevue.config.default, {zIndex: {overlay: 9999}})
	.use(FhcAlert)
	.mount("#main");

