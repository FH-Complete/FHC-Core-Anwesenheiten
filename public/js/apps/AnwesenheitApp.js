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
		const queryString = window.location.search;
		const searchParams = new URLSearchParams(queryString)
		this._.root.appContext.config.globalProperties.$entryParams = {}
		this._.root.appContext.config.globalProperties.$entryParams.lv_id = searchParams.get('lvid')
		this._.root.appContext.config.globalProperties.$entryParams.stg_kz = searchParams.get('stg_kz')
		this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz = searchParams.get('sem_kurzbz')
		this._.root.appContext.config.globalProperties.$entryParams.sem = searchParams.get('sem')
	},
	mounted() {
		console.log('app mounted')
		console.log(this)
		const el = document.getElementById("main");
		this._.root.appContext.config.globalProperties.$entryParams.permissions = JSON.parse(el.attributes.permissions.nodeValue)
		el.removeAttribute('permissions')

		const ma_uid = this._.root.appContext.config.globalProperties.$entryParams.permissions.authID
		const sem_kurzbz = this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
		const lv_id = this._.root.appContext.config.globalProperties.$entryParams.lv_id
		const le_ids = []

		// TODO: default select closest one from stundenplan AND SHOW THAT
		if(this._.root.appContext.config.globalProperties.$entryParams.permissions.lektor
			|| this._.root.appContext.config.globalProperties.$entryParams.permissions.admin) {
			this._.root.appContext.config.globalProperties.$fhcApi.get(
				`extensions/FHC-Core-Anwesenheiten/Api/infoGetLehreinheitenForLehrveranstaltungAndMaUid?lva_id=${lv_id}&ma_uid=${ma_uid}&sem_kurzbz=${sem_kurzbz}`,
				null,null
			).then(res => {
				console.log('getLehreinheitenForLehrveranstaltung Res', res)

				// merge entries with same LE since DB query uses distinct on gruppe, verband etc and entries can be messy

				const data = []

				res.data.forEach(entry => {
					const existing = data.find(e => e.lehreinheit_id === entry.lehreinheit_id)
					if(existing) {
						// supplement info
						if(!existing.gruppe_kurzbz && entry.gruppe_kurzbz) existing.gruppe_kurzbz = entry.gruppe_kurzbz
						if(!existing.gruppe || existing.gruppe === ' ' && entry.gruppe && entry.gruppe !== ' ') existing.gruppe = entry.gruppe
						if(!existing.verband || existing.verband === ' ' && entry.verband && entry.verband !== ' ') existing.verband = entry.verband
					} else {
						// enter entry
						data.push(entry)
					}
				})


				this._.root.appContext.config.globalProperties.$entryParams.le_info = data
				this._.root.appContext.config.globalProperties.$entryParams.available_le_info = [...data]
				data.forEach(leEntry => {
					if(!le_ids.find(el => el === leEntry.lehreinheit_id)) le_ids.push(leEntry.lehreinheit_id)
				})
			}).finally(() => {
				this._.root.appContext.config.globalProperties.$entryParams.le_ids = le_ids
				this._.root.appContext.config.globalProperties.$entryParams.available_le_ids = [...le_ids]
				console.log('le_ids', this._.root.appContext.config.globalProperties.$entryParams.le_ids)
			})
		}

	},
	updated(){

	},
});
anwesenheitApp
	.use(router)
	.use(FhcApi)
	.use(primevue.config.default, {zIndex: {overlay: 9999}})
	.use(Phrasen)
	.mount("#main");

router.beforeEach((to, from) => {
	// dont check for context when scanning or setting up app data
	if(to.name === "Scan" || to.name === "Setup") return true

	const eP = anwesenheitApp.config.globalProperties.$entryParams

	console.log('routerbeforeEach entryParams check', eP)

	// if we dont have necessary data get input from setup component
	if(!eP.lv_id ||!eP.stg_kz || !eP.sem || !eP.sem_kurzbz || eP.le_ids?.length < 1) {
		return {name: 'Setup'}
	} else { // route normally
		return true
	}
})
