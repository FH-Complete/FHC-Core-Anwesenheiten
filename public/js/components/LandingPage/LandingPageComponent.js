import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import {CoreRESTClient} from '../../../../../js/RESTClient.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import ChartComponent from '../LandingPage/ChartComponent.js'

import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {LehreinheitenDropdown} from "../Setup/LehreinheitenDropdown";
import {MaUIDDropdown} from "../Setup/MaUIDDropdown"

export default {
	name: 'LandingPageComponent',
	components: {
		CoreBaseLayout,
		CoreNavigationCmpt,
		CoreRESTClient,
		ChartComponent,
		BsModal,
		LehreinheitenDropdown,
		MaUIDDropdown
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},

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
		routeToStudent() {
			this.$router.push({
				name: 'Student'
			})
		},
		routeToAssistenz() {
			this.$router.push({
				name: 'Assistenz'
			})
		},
		loadLE() {
			this.$refs.modalContainerKontrolleSetup.hide()
			this.$router.push({
				name: 'Lektor'
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

					maProm.then(()=>{
						ma_uid = this.$entryParams.selected_maUID?.mitarbeiter_uid
						console.log('add le setup promise')
						promises.push(this.handleLeSetup(lv_id, ma_uid, sem_kurzbz, le_ids))
						console.log('add student setup promise')
						promises.push(this.handleStudentsSetup(lv_id, sem_kurzbz))

						resolve(Promise.all(promises))
					})

					// load teaching units/lehreinheiten of provided lektor maUID in case of lektor rights
				} else if(this.$entryParams.permissions.lektor) {
					resolve(this.handleLeSetup(lv_id, ma_uid, sem_kurzbz,le_ids))
				}

			})
		},
		handleStudentsSetup(lv_id, sem_kurzbz) {
			return new Promise((resolve) => {
				this.$fhcApi.get(
					`extensions/FHC-Core-Anwesenheiten/Api/infoGetStudentsForLvaInSemester?lva_id=${lv_id}&sem=${sem_kurzbz}`,
					null, null
				).then(res => {
					console.log('infoGetStudentsForLvaInSemester', res)
				}).finally(()=>{resolve()})
			})
		},
		handleMaSetup(lv_id, sem_kurzbz) {
			console.log('handleMaSetup start')
			// TODO: historic data access?
			return new Promise(resolve => {
				this.$fhcApi.get(
					`extensions/FHC-Core-Anwesenheiten/Api/infoGetLektorsForLvaInSemester?lva_id=${lv_id}&sem=${sem_kurzbz}`,
					null, null
				).then(res => {
					console.log('handleMaSetup then')
					this.$entryParams.available_maUID = []
					const lektor = res.data.retval[0]
					const infoString = lektor.anrede + ' ' + (lektor.titelpre ? lektor.titelpre + ' ' : '')
						+ lektor.vorname + (lektor.vornamen ? ' ' + lektor.vornamen : '') + ' ' + lektor.nachname
						+ (lektor.titelpost ? ' ' + lektor.titelpost : '')
					this.$entryParams.selected_maUID = lektor ? {mitarbeiter_uid: lektor.mitarbeiter_uid, infoString} : null


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
					// console.log('globalProps', this)
					resolve()
				})
			})
		},
		handleLeSetup(lv_id, ma_uid, sem_kurzbz, le_ids) {
			console.log('handleLeSetup start')
			return new Promise(resolve => {

				this.$fhcApi.get(
					`extensions/FHC-Core-Anwesenheiten/Api/infoGetLehreinheitenForLehrveranstaltungAndMaUid?lva_id=${lv_id}&ma_uid=${ma_uid}&sem_kurzbz=${sem_kurzbz}`,
					null, null
				).then(res => {
					console.log('handleLeSetup then')
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
		maUIDchangedHandler() {
			this.$refs.LEDropdown.resetData()
		}
	},
	created(){
		if(!this.$entryParams.permissions) this.createdSetup()
		this.$entryParams.setupPromise = this.handleSetup()
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
		:title="$p.t('global/digitalesAnwManagement')" >
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
			
			
			<ChartComponent></ChartComponent>
			
		</template>
	</core-base-layout>
`
};


