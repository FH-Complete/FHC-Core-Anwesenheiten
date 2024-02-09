import fhc_anwesenheitenapifactory from "../api/fhc-anwesenheitenapifactory.js";
import LektorComponent from "../components/Lektor/LektorComponent.js";
import FhcAlert from '../../../../js/plugin/FhcAlert.js';
import StudentByLvaComponent from "../components/Lektor/StudentByLvaComponent";
import StudentComponent from "../components/Student/StudentComponent";
import AssistenzComponent from "../components/Assistenz/AssistenzComponent";

Vue.$fhcapi = fhc_anwesenheitenapifactory;

const ciPath = FHC_JS_DATA_STORAGE_OBJECT.app_root.replace(/(https:|)(^|\/\/)(.*?\/)/g, '') + FHC_JS_DATA_STORAGE_OBJECT.ci_router;

const router = VueRouter.createRouter({
	history: VueRouter.createWebHistory(`/${ciPath}/extensions/FHC-Core-Anwesenheiten/`),
	routes: [
		{
			path: `/anwesenheitByStudent/:id/:lv_id/:sem_kz`,
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

