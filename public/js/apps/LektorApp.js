import fhc_anwesenheitenapifactory from "../api/fhc-anwesenheitenapifactory.js";
import LektorComponent from "../components/LektorComponent.js";
import FhcAlert from '../../../../js/plugin/FhcAlert.js';
import StudentByLvaComponent from "../components/StudentByLvaComponent";

Vue.$fhcapi = fhc_anwesenheitenapifactory;

const ciPath = FHC_JS_DATA_STORAGE_OBJECT.app_root.replace(/(https:|)(^|\/\/)(.*?\/)/g, '') + FHC_JS_DATA_STORAGE_OBJECT.ci_router;
const change = 'a'
const router = VueRouter.createRouter({
	history: VueRouter.createWebHistory(`/${ciPath}/extensions/FHC-Core-Anwesenheiten/Lektor`),
	routes: [
		{
			path: `/anwesenheitByStudent/:id/:lv_id/:sem_kz`,
			name: 'StudentByLva',
			component: StudentByLvaComponent,
			props: true
		},
		{
			path: `/`,
			name: 'Lektor',
			component: LektorComponent,
			children: [

			]
		},
		{
			path: '/:catchAll(.*)',
			redirect: { name: 'Lektor'}
		}
	]
})

const lektorApp = Vue.createApp({
	
	components: {
		LektorComponent,
		StudentByLvaComponent
	},
	data() {
		return {
			title: "Lektor Anwesenheitskontrolle App",

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
lektorApp
	.use(router)
	.use(primevue.config.default, {zIndex: {overlay: 9999}})
	.use(FhcAlert)
	.mount("#main");

