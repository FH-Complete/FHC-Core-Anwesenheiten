import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import CoreTabs from '../../../../../js/components/Tabs.js';

import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import StudentComponent from "../Student/StudentComponent.js"
import LektorComponent from "../Lektor/LektorComponent.js"
import AssistenzComponent from "../Assistenz/AssistenzComponent";

export default {
	name: 'LandingPageComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreRESTClient,
		CoreTabs,
		BsModal,
		StudentComponent,
		LektorComponent,
		AssistenzComponent
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			currentTab: 0,
			tabs: this.initTabs(),
			loaded: false,
			phrasenResolved: false,
			permissioncount: Vue.ref(0)
		};
	},
	props: {
		permissions: [],
		activetabstudent: null
	},
	methods: {
		initTabs() {
			const tabs = []
			const permissions = JSON.parse(this.permissions)

			this.$entryParams.activetabstudent = this.activetabstudent ?? null

			// check for missing url params here and block Kontrolle & Profil Tabs if they are not useable
			const queryString = window.location.search;
			const searchParams = new URLSearchParams(queryString)
			const lv_id = searchParams.get('lvid')
			const stg_kz = searchParams.get('stg_kz')
			const sem_kurzbz = searchParams.get('sem_kurzbz')
			const notMissingParams = (lv_id && stg_kz && sem_kurzbz) || this.$entryParams.notMissingParams

			if((permissions.lektor || permissions.admin) && notMissingParams) {
				tabs.push({key: 'Kontrolle', title: 'Kontrolle', component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Lektor/LektorComponent.js'})
			}

			if((permissions.student || permissions.admin) && notMissingParams)  {
				tabs.push({key: 'Profil', title: 'Profil', component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentComponent.js'})
			}

			if(permissions.admin || permissions.assistenz) {
				tabs.push({key: 'Admin', title: 'Admin', component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Assistenz/AssistenzComponent.js'})
			}

			const ret = {}
			tabs.forEach((tab, i) => {
				ret['tab'+i] = tab
			})

			this.setCurrentTab(permissions.controller, tabs)

			return ret
		},
		setCurrentTab (controller, tabs) {

			switch(controller) {
				case 'Admin':
					this.currentTab = tabs.findIndex(t => t.key === 'Admin')
					break;
				case 'Kontrolle':
					this.currentTab = tabs.findIndex(t => t.key === 'Kontrolle')
					break;
				case 'Profil':
					this.currentTab = tabs.findIndex(t => t.key === 'Profil')
					break;
				default:
					this.currentTab = 0
			}
		},
		async createdSetup () {
			await new Promise (resolve => {
				const queryString = window.location.search;
				const searchParams = new URLSearchParams(queryString)
				this.$entryParams.lv_id = searchParams.get('lvid')
				this.$entryParams.stg_kz = searchParams.get('stg_kz')
				this.$entryParams.sem_kurzbz = searchParams.get('sem_kurzbz')
				this.$entryParams.sem = searchParams.get('sem')


				this.$entryParams.notMissingParams = !!(this.$entryParams.lv_id && this.$entryParams.stg_kz && this.$entryParams.sem_kurzbz)

				this.setupViewDataRefs()

				if(this.$entryParams.lv_id) {
					this.loadLvViewData()
				}

				this.$entryParams.phrasenPromise = this.$p.loadCategory(['ui', 'person', 'lehre', 'table', 'filter', 'global'])
				this.$entryParams.phrasenPromise.then(()=> {this.phrasenResolved = true})
				const el = document.getElementById("main");
				this.$entryParams.permissions = JSON.parse(el.attributes.permissions.nodeValue)
				this.$entryParams.cis4 = JSON.parse(el.attributes.cis4.nodeValue)

				console.log('$entryParams', this.$entryParams)
				console.log('called controller: ', this.$entryParams.permissions.controller)

				el.removeAttribute('permissions')

				resolve()
			})
		},
		setupViewDataRefs(){
			this.$entryParams.viewDataLv = {}
			this.$entryParams.viewDataLv.benotung = Vue.ref('')
			this.$entryParams.viewDataLv.bezeichnung = Vue.ref('')
			this.$entryParams.viewDataLv.kurzbz = Vue.ref('')
			this.$entryParams.viewDataLv.lehrveranstaltung_id = Vue.ref('')
			this.$entryParams.viewDataLv.oe_kurzbz = Vue.ref('')
			this.$entryParams.viewDataLv.orgform_kurzbz = Vue.ref('')
			this.$entryParams.viewDataLv.raumtyp_kurzbz = Vue.ref('')

			this.$entryParams.viewDataStudent = {}
			this.$entryParams.viewDataStudent.vorname = Vue.ref('')
			this.$entryParams.viewDataStudent.nachname = Vue.ref('')
			this.$entryParams.viewDataStudent.uid = Vue.ref('')
			this.$entryParams.viewDataStudent.person_id = Vue.ref('')
			this.$entryParams.viewDataStudent.prestudent_id = Vue.ref('')
			this.$entryParams.viewDataStudent.gruppe = Vue.ref('')
			this.$entryParams.viewDataStudent.verband = Vue.ref('')
			this.$entryParams.viewDataStudent.semester = Vue.ref('')
		},
		loadLvViewData() {
			this.$fhcApi.factory.Info.getLvViewDataInfo(this.$entryParams.lv_id).then(res => {
				if(res?.data?.retval?.[0]) this.setLvViewData(res.data.retval[0])
			})
		},
		async handleSetup() {
			return new Promise(resolve => {
				const ma_uid = this.$entryParams.permissions.authID
				const sem_kurzbz = this.$entryParams.sem_kurzbz
				const lv_id = this.$entryParams.lv_id
				const le_ids = []

				const promises = []

				// load lektors teaching the lva aswell as students attending the lva in case of admin or assistenz rights
				if(this.$entryParams.permissions.admin && lv_id && sem_kurzbz && le_ids) {
					const maProm = this.handleMaSetup(lv_id, sem_kurzbz, ma_uid)

					maProm.then(()=> {
						debugger
						promises.push(this.handleLeSetup(lv_id, this.$entryParams.selected_maUID.mitarbeiter_uid, sem_kurzbz, le_ids))
						promises.push(this.handleStudentsSetup(lv_id, sem_kurzbz))
						Promise.all(promises).then(()=>{
							resolve()
						})
					})

					// load teaching units/lehreinheiten of provided lektor maUID in case of lektor rights
				} else if(lv_id && sem_kurzbz && le_ids) {
					this.handleLeSetup(lv_id, ma_uid, sem_kurzbz, le_ids).finally(()=>{
						resolve(true)
					})
				} else {
					resolve(true)
				}

			})
		},
		handleStudentsSetup(lv_id, sem_kurzbz) {
			return new Promise((resolve) => {
				this.$fhcApi.factory.Info.getStudentsForLvaInSemester(lv_id, sem_kurzbz).then(res => {
					this.$entryParams.availableStudents = []

					res?.data?.retval?.forEach(e => {
						const infoString = e.semester + e.verband + e.gruppe + ' ' + e.vorname + ' ' + e.nachname
						this.$entryParams.availableStudents.push({
							vorname: e.vorname, nachname: e.nachname,
							prestudent_id: e.prestudent_id, studiensemester_kurzbz: e.studiensemester_kurzbz,
							lehreinheit_id: e.lehreinheit_id, lehrveranstaltung_id: e.lehrveranstaltung_id,
							semester: e.semester, verband: e.verband, gruppe: e.gruppe,
							uid: e.uid, person_id: e.person_id,
							infoString
						})
					})


					this.$entryParams.selected_student_info = this.$entryParams.availableStudents.length ? this.$entryParams.availableStudents[0] : null

				}).finally(()=>{resolve()})
			})
		},
		handleMaSetup(lv_id, sem_kurzbz, ma_uid) {
			console.log('handleMaSetup')
			console.log('ma_uid', ma_uid)
			return new Promise(resolve => {
				this.$fhcApi.factory.Info.getLektorsForLvaInSemester(lv_id, sem_kurzbz).then(res => {
					this.$entryParams.available_maUID = []
					debugger
					const found = res.data?.retval?.find(lektor => lektor.mitarbeiter_uid === ma_uid)

					const lektor = found ?? res.data.retval[0]
					const infoString = lektor.anrede + ' ' + (lektor.titelpre ? lektor.titelpre + ' ' : '')
						+ lektor.vorname + (lektor.vornamen ? ' ' + lektor.vornamen : '') + ' ' + lektor.nachname
						+ (lektor.titelpost ? ' ' + lektor.titelpost : '')
					this.$entryParams.selected_maUID = lektor ?{mitarbeiter_uid: lektor.mitarbeiter_uid, infoString} : null


					res.data?.retval?.forEach(lektor => {
						const infoString = lektor.anrede + ' ' + (lektor.titelpre ? lektor.titelpre + ' ' : '')
							+ lektor.vorname + (lektor.vornamen ? ' ' + lektor.vornamen : '') + ' ' + lektor.nachname
							+ (lektor.titelpost ? ' ' + lektor.titelpost : '')

						this.$entryParams.available_maUID.push({
							mitarbeiter_uid: lektor.mitarbeiter_uid,
							infoString
						})
					})
					debugger
					// this.$refs.MADropdown.resetData()

				}).finally(()=> {
					resolve()
				})
			})
		},
		handleLeSetup(lv_id, ma_uid, sem_kurzbz, le_ids) {
			console.log('handleLeSetup')
			console.log('ma_uid', ma_uid)
			return new Promise(resolve => {
				this.$fhcApi.factory.Info.getLehreinheitenForLehrveranstaltungAndMaUid(lv_id, ma_uid, sem_kurzbz).then(res => {

					// merge entries with same LE
					const data = []

					res.data?.forEach(entry => {

						const existing = data.find(e => e.lehreinheit_id === entry.lehreinheit_id)
						if (existing) {
							// supplement info
							existing.infoString += ', '
							if (entry.gruppe_kurzbz !== null) {
								existing.infoString += entry.gruppe_kurzbz
							} else {
								existing.infoString += entry.kurzbzlang + '-' + entry.semester
									+ (entry.verband ? entry.verband : '')
									+ (entry.gruppe ? entry.gruppe : '')
							}
						} else {
							// entries are supposed to be fetched ordered by non null gruppe_kurzbz first
							// so a new entry will always start with those groups, others are appended afterwards
							entry.infoString = entry.kurzbz + ' - ' + entry.lehrform_kurzbz + ' - '
							if (entry.gruppe_kurzbz !== null) {
								entry.infoString += entry.gruppe_kurzbz
							} else {
								entry.infoString += entry.kurzbzlang + '-' + entry.semester
									+ (entry.verband ? entry.verband : '')
									+ (entry.gruppe ? entry.gruppe : '')
							}

							data.push(entry)
						}
					})

					this.$entryParams.selected_le_info = data.length ? data[0] : null
					this.$entryParams.available_le_info = [...data]
					data.forEach(leEntry => le_ids.push(leEntry.lehreinheit_id))

					this.$entryParams.selected_le_id = this.$entryParams.selected_le_info ? this.$entryParams.selected_le_info.lehreinheit_id : null
					this.$entryParams.available_le_ids = [...le_ids]


				}).finally(() => {
					resolve()
				})
			})
		},
		setLvViewData(data) {
			this.$entryParams.viewDataLv.benotung = data.benotung
			this.$entryParams.viewDataLv.bezeichnung = data.bezeichnung
			this.$entryParams.viewDataLv.kurzbz = data.kurzbz
			this.$entryParams.viewDataLv.lehrveranstaltung_id = data.lehrveranstaltung_id
			this.$entryParams.viewDataLv.oe_kurzbz = data.oe_kurzbz
			this.$entryParams.viewDataLv.orgform_kurzbz = data.orgform_kurzbz
			this.$entryParams.viewDataLv.raumtyp_kurzbz = data.raumtyp_kurzbz
		},
		async awaitPhrasen(){
			await this.$entryParams.phrasenPromise
		}
	},
	created(){
		if(!this.$entryParams.permissions) this.createdSetup()
	},
	mounted() {
		this.$entryParams.setupPromise = this.handleSetup().then(()=>{
			this.loaded = true

			this.$entryParams.phrasenPromise.then(()=> this.phrasenResolved = true)

		})
		if(this.$entryParams.permissions.lektor) this.permissioncount++
		if(this.$entryParams.permissions.student) this.permissioncount++
		if(this.$entryParams.permissions.assistenz) this.permissioncount = 3
		if(this.$entryParams.permissions.admin) this.permissioncount = 3 // default has max permissions


		if(!this.$entryParams.notMissingParams) this.permissioncount = 1 // only administration available -> only page working without params
		this.awaitPhrasen();
	},
	watch: {

	},
	computed: {
		getSubtitle(){
			if(this.$entryParams?.viewDataLv?.kurzbz?.value && this.$entryParams?.viewDataLv?.bezeichnung?.value) {
				return this.$entryParams.viewDataLv.kurzbz.value +' - '+ this.$entryParams.viewDataLv.bezeichnung.value
			} else return ''
		},
		getCurrentTab() {
			return 'tab' + this.currentTab
		}
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		hideTopMenu=true 
		:leftNavCssClasses=''>
	</core-navigation-cmpt>

	<core-base-layout>
		<template #main>
			<div style="position: relative; margin-top: 12px;">
				<template  v-if="permissioncount > 1">
					<core-tabs :default="getCurrentTab" :modelValue="currentTab" :config="tabs"></core-tabs>
				</template>
				<template v-else-if="permissioncount === 1 && phrasenResolved">
					<LektorComponent v-if="$entryParams?.permissions?.lektor"></LektorComponent>
					<StudentComponent v-if="$entryParams?.permissions?.student"></StudentComponent>
					<AssistenzComponent v-if="$entryParams?.permissions?.assistenz || $entryParams?.permissions?.admin"></AssistenzComponent>
				</template>
			</div>
			
		</template>
	</core-base-layout>
`
};