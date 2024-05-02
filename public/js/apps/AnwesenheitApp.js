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

		this._.root.appContext.config.globalProperties.$entryParams.phrasenPromise = this.$p.loadCategory(['ui', 'person', 'lehre', 'table', 'filter', 'global'])
		console.log(this._.root.appContext.config.globalProperties.$entryParams.phrasenPromise)
		this._.root.appContext.config.globalProperties.$capitalize = (string) => {
			if(!string) return ''
			return string[0].toUpperCase() + string.slice(1);
		}
	},
	mounted() {
		const el = document.getElementById("main");
		this._.root.appContext.config.globalProperties.$entryParams.permissions = JSON.parse(el.attributes.permissions.nodeValue)
		console.log('permissions', this._.root.appContext.config.globalProperties.$entryParams.permissions)

		el.removeAttribute('permissions')

		const ma_uid = this._.root.appContext.config.globalProperties.$entryParams.permissions.authID
		const sem_kurzbz = this._.root.appContext.config.globalProperties.$entryParams.sem_kurzbz
		const lv_id = this._.root.appContext.config.globalProperties.$entryParams.lv_id
		const le_ids = []

		// TODO: default select closest one from stundenplan AND SHOW THAT
		if(this._.root.appContext.config.globalProperties.$entryParams.permissions.lektor
			|| this._.root.appContext.config.globalProperties.$entryParams.permissions.admin) {

			console.log('fetching le ids')
			this._.root.appContext.config.globalProperties.$entryParams.lePromise = new Promise(resolve => {

				this._.root.appContext.config.globalProperties.$fhcApi.get(
					`extensions/FHC-Core-Anwesenheiten/Api/infoGetLehreinheitenForLehrveranstaltungAndMaUid?lva_id=${lv_id}&ma_uid=${ma_uid}&sem_kurzbz=${sem_kurzbz}`,
					null,null
				).then(res => {
					console.log('getLehreinheitenForLehrveranstaltung Res', res)

					// merge entries with same LE
					const data = []

					res.data?.forEach(entry => {

						const existing = data.find(e => e.lehreinheit_id === entry.lehreinheit_id)
						if(existing) {
							// supplement info
							existing.infoString += ', '
							if(entry.gruppe_kurzbz !== null) {
								existing.infoString +=  entry.gruppe_kurzbz
							} else {
								existing.infoString += entry.kurzbzlang + '-' + entry.semester
								+ (entry.verband ? entry.verband : '')
								+ (entry.gruppe ? entry.gruppe : '')
							}
						} else {
							// entries are supposed to be fetched ordered by non null gruppe_kurzbz first
							// so a new entry will always start with those groups, others are appended afterwards
							entry.infoString = entry.kurzbz + ' - ' + entry.lehrform_kurzbz + ' - '
							if(entry.gruppe_kurzbz !== null) {
								entry.infoString += entry.gruppe_kurzbz
							} else {
								entry.infoString += entry.kurzbzlang + '-' + entry.semester
								+ (entry.verband ? entry.verband : '')
								+ (entry.gruppe ? entry.gruppe : '')
							}

							data.push(entry)
						}
					})

					this._.root.appContext.config.globalProperties.$entryParams.selected_le_info = data.length ? data[0] : null
					this._.root.appContext.config.globalProperties.$entryParams.available_le_info = [...data]
					data.forEach(leEntry => le_ids.push(leEntry.lehreinheit_id))
				}).finally(() => {
					this._.root.appContext.config.globalProperties.$entryParams.selected_le_id = le_ids.length? le_ids[0] : null
					this._.root.appContext.config.globalProperties.$entryParams.available_le_ids = [...le_ids]

					console.log('globalProps', this._.root.appContext.config.globalProperties)
					resolve()
				})

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
		const eP = anwesenheitApp.config.globalProperties.$entryParams

		// skip landing page for assistenz since they got no content there
		if(eP.permissions.assistenz && to.name === "LandingPage") {
			return eP.phrasenPromise.then( () =>{
				return {name: "Assistenz"}
			})
		}

		return true
})
