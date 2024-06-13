import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import ChartComponent from '../LandingPage/ChartComponent.js'

import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown";
import {MaUIDDropdown} from "../Setup/MaUIDDropdown"
import {StudentDropdown} from "../Setup/StudentDropdown"

export default {
	name: 'LandingPageComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreRESTClient,
		ChartComponent,
		BsModal,
		LehreinheitenDropdown,
		MaUIDDropdown,
		StudentDropdown
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			loaded: false
		};
	},
	props: {

	},
	methods: {
		async createdSetup () {
			await new Promise (resolve => {
				const queryString = window.location.search;
				const searchParams = new URLSearchParams(queryString)

				this.$entryParams.lv_id = searchParams.get('lvid')
				this.$entryParams.stg_kz = searchParams.get('stg_kz')
				this.$entryParams.sem_kurzbz = searchParams.get('sem_kurzbz')
				this.$entryParams.sem = searchParams.get('sem')
				this.$entryParams.initRouted = false

				this.setupViewDataRefs()

				if(this.$entryParams.lv_id) {
					this.loadLvViewData()
				}

				this.$entryParams.phrasenPromise = this.$p.loadCategory(['ui', 'person', 'lehre', 'table', 'filter', 'global'])
				const el = document.getElementById("main");
				this.$entryParams.permissions = JSON.parse(el.attributes.permissions.nodeValue)
				console.log('permissions', this.$entryParams.permissions)

				el.removeAttribute('permissions')


				resolve()
			})
		},
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
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
		routeToStudent() {

			if(this.$entryParams.permissions.admin || this.$entryParams.permissions.assistenz) {
				this.$refs.modalContainerStudentSetup.show()
			} else {
				this.$router.push({
					name: 'Student'
				})
			}


		},
		routeToAssistenz() {
			this.$router.push({
				name: 'Assistenz'
			})
		},
		loadLvViewData() {
			this.$fhcApi.factory.Info.getLvViewDataInfo(this.$entryParams.lv_id).then(res => {
				if(res?.data?.retval?.[0]) this.setLvViewData(res.data.retval[0])
			})
		},
		loadLE() {
			this.$refs.modalContainerKontrolleSetup.hide()
			this.$router.push({
				name: 'Lektor'
			})
		},
		loadStudentPage() {
			this.$refs.modalContainerStudentSetup.hide()

			this.$router.push({
				name: 'Student'
			})
		},
		async routeToLektor() {
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise

			const noLeAvailable = !this.$entryParams.selected_le_id && !this.$entryParams.available_le_ids.length
			const hasMultipleLeAvailable = this.$entryParams.selected_le_id && this.$entryParams.available_le_ids.length > 1

			if (hasMultipleLeAvailable || this.$entryParams.permissions.admin || this.$entryParams.permissions.assistenz) {
				// MULTIPLE LE SHOW SELECTION MODAL
				this.$refs.modalContainerKontrolleSetup.show()
				return
			} else if (noLeAvailable) {
				// NO LE => NO KONTROLLE
				this.$fhcAlert.alertError(this.$p.t('global/keineAnwkontrolleMöglichWeilLEFehlt'))
				return
			} else {
				// ONE LE
				this.$router.push({
					name: 'Lektor'
				})
			}
		},
		async handleSetup() {
			return new Promise(resolve => {
				let ma_uid = this.$entryParams.permissions.authID
				const sem_kurzbz = this.$entryParams.sem_kurzbz
				const lv_id = this.$entryParams.lv_id
				const le_ids = []

				const promises = []

				// TODO: default select closest one from stundenplan AND SHOW THAT

				// load lektors teaching the lva aswell as students attending the lva in case of admin or assistenz rights
				if(this.$entryParams.permissions.admin ||
					this.$entryParams.permissions.assistenz) {

					const maProm = this.handleMaSetup(lv_id, sem_kurzbz)

					maProm.then(()=> {
						ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid
						console.log('add le setup promise')
						promises.push(this.handleLeSetup(lv_id, ma_uid, sem_kurzbz, le_ids))
						console.log('add student setup promise')
						promises.push(this.handleStudentsSetup(lv_id, sem_kurzbz))

						resolve(Promise.all(promises))
					})

					// load teaching units/lehreinheiten of provided lektor maUID in case of lektor rights
				} else if(this.$entryParams.permissions.lektor) {
					resolve(this.handleLeSetup(lv_id, ma_uid, sem_kurzbz,le_ids).then(()=>{
						if(this.$entryParams.available_le_ids.length === 1 && !this.$entryParams.initRouted) {

							// automagically skip landing page if there is no selection of LE necessary
							this.$entryParams.initRouted = true
							this.$router.push({
								name: 'Lektor'
							})
						}
					}))
				} else if(this.$entryParams.permissions.student) {
					resolve()
				}

			})
		},
		handleStudentsSetup(lv_id, sem_kurzbz) {
			return new Promise((resolve) => {
				this.$fhcApi.factory.Info.getStudentsForLvaInSemester(lv_id, sem_kurzbz).then(res => {
					console.log('infoGetStudentsForLvaInSemester', res)
					this.$entryParams.availableStudents = []

					res?.data?.retval?.forEach(e => {
						const infoString = e.vorname + ' ' + e.nachname + ' ' + e.semester + e.verband + e.gruppe
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
		handleMaSetup(lv_id, sem_kurzbz) {
			console.log('handleMaSetup start')
			// TODO: historic data access?
			return new Promise(resolve => {
				this.$fhcApi.factory.Info.getLektorsForLvaInSemester(lv_id, sem_kurzbz).then(res => {
					console.log('handleMaSetup then')
					this.$entryParams.available_maUID = []
					const lektor = res.data.retval[0]
					const infoString = lektor.anrede + ' ' + (lektor.titelpre ? lektor.titelpre + ' ' : '')
						+ lektor.vorname + (lektor.vornamen ? ' ' + lektor.vornamen : '') + ' ' + lektor.nachname
						+ (lektor.titelpost ? ' ' + lektor.titelpost : '')
					this.$entryParams.selected_maUID = lektor ?{mitarbeiter_uid: lektor.mitarbeiter_uid, infoString} : null


					res.data?.retval?.forEach(lektor => {
						const infoString = lektor.anrede + ' ' + (lektor.titelpre ? lektor.titelpre : '')
							+ lektor.vorname + (lektor.vornamen ? ' ' + lektor.vornamen : '') + ' ' + lektor.nachname
							+ (lektor.titelpost ? ' ' + lektor.titelpost : '')

						this.$entryParams.available_maUID.push({
							mitarbeiter_uid: lektor.mitarbeiter_uid,
							infoString
						})
					})

					this.$refs.MADropdown.resetData()

				}).finally(()=> {
					console.log('handleMaSetup finally')
					resolve()
				})
			})
		},
		handleLeSetup(lv_id, ma_uid, sem_kurzbz, le_ids) {
			console.log('handleLeSetup start')
			return new Promise(resolve => {
				this.$fhcApi.factory.Info.getLehreinheitenForLehrveranstaltungAndMaUid(lv_id, ma_uid, sem_kurzbz).then(res => {
					console.log('getLehreinheitenForLehrveranstaltung Res', res)

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
					console.log('this.$entryParams.selected_le_info', this.$entryParams.selected_le_info)
					this.$entryParams.available_le_info = [...data]
					data.forEach(leEntry => le_ids.push(leEntry.lehreinheit_id))

					this.$entryParams.selected_le_id = le_ids.length ? le_ids[0] : null
					this.$entryParams.available_le_ids = [...le_ids]

					this.$refs.LEDropdown.resetData()

					resolve()
				}).finally(() => {
					console.log('handleLeSetup finally')

					// TODO: le promise never enters then case... set properties somewhere
					// this.$entryParams.selected_le_id = le_ids.length ? Vue.ref(le_ids[0]) : null
					// this.$entryParams.available_le_ids = Vue.ref([...le_ids])

					console.log('globalProps', this._.appContext.config.globalProperties)
					// resolve()
				})
			})
		},
		maUIDchangedHandler(e) {
			this.$refs.LEDropdown.resetData()
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
		studentUIDchangedHandler(e) {
			console.log('studentUIDchangedHandler', e)
		}
	},
	created(){
		if(!this.$entryParams.permissions) this.createdSetup()
		this.$entryParams.setupPromise = this.handleSetup().then(()=>{
			this.loaded = true
		})
	},
	mounted() {

	},
	watch: {

	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>

	<core-base-layout
		:title="($p.t('global/digitalesAnwManagement'))+' '+$entryParams.viewDataLv.kurzbz +' - '+$entryParams.viewDataLv.bezeichnung">
		<template #main>
			<bs-modal ref="modalContainerKontrolleSetup" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>{{ $p.t('global/lehreinheitConfig') }}</template>
				<template v-slot:default>
					<div>
						<MaUIDDropdown v-if="$entryParams?.permissions?.admin || $entryParams?.permissions?.assistenz"
						 id="maUID" ref="MADropdown" @maUIDchanged="maUIDchangedHandler">
						</MaUIDDropdown>
					
						<LehreinheitenDropdown id="lehreinheit" ref="LEDropdown">
						</LehreinheitenDropdown>
					</div>
					
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-primary" :disabled="$entryParams?.selected_le_id === null" @click="loadLE">{{ $p.t('global/leLaden') }}</button>
				</template>
			</bs-modal>
			
			<bs-modal ref="modalContainerStudentSetup" class="bootstrap-prompt" dialogClass="modal-lg">
				<template v-slot:title>{{ $p.t('global/studentConfig') }}</template>
				<template v-slot:default>
					<div>
						<StudentDropdown v-if="$entryParams?.permissions?.admin || $entryParams?.permissions?.assistenz"
						 id="studentUID" ref="studentDropdown" @studentUIDchanged="studentUIDchangedHandler">
						</StudentDropdown>
					</div>
				</template>
				<template v-slot:footer>
					<button type="button" class="btn btn-primary" @click="loadStudentPage">{{ $p.t('global/studentLaden') }}</button>
				</template>
			</bs-modal>
		
			<div id="visibilityWrapper" v-if="loaded">
				<div style="margin-bottom: 12px;">
					<div class="col-sm-10 col-10 mx-auto">
						<div class="row mt-4" v-if="$entryParams.permissions?.lektor || $entryParams.permissions?.admin">
							<button  class="btn btn-primary btn-block btn-lg" @click="routeToLektor">Anwesenheiten verwalten Lektor</button>
						</div>
						<div class="row mt-4" v-if="$entryParams.permissions?.student || $entryParams.permissions?.admin">
							<button  class="btn btn-primary btn-block btn-lg" @click="routeToStudent">Anwesenheiten verwalten Student</button>
						</div>
						<div class="row mt-4" v-if="$entryParams.permissions?.assistenz || $entryParams.permissions?.admin">
							<button  class="btn btn-primary btn-block btn-lg" @click="routeToAssistenz">Anwesenheiten verwalten Assistenz</button>
						</div>
					</div>
				</div>
				
				
				
			</div>
			<ChartComponent></ChartComponent>
			
		</template>
	</core-base-layout>
`
};


