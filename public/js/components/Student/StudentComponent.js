import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import CoreTabs from '../../../../../js/components/Tabs.js';
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {StudentDropdown} from "../Setup/StudentDropdown"

export const StudentComponent = {
	name: 'StudentComponent',
	components: {
		CoreNavigationCmpt,
		CoreBaseLayout,
		CoreTabs,
		BsModal,
		StudentDropdown
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			tabsStudent: {
				tab1: { title: Vue.ref(this.$p.t('global/anwesenheiten')), component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentAnwesenheitComponent.js'},
				tab2: { title: Vue.ref(this.$p.t('global/entschuldigungen')), component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentEntschuldigungComponent.js'}
			},
			viewDataStudent: {}
		};
	},
	props: {
		permissions: []
	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.sideMenuEntries = payload;
		},
		routeToCodeScan() {
			this.$router.push({
				name: 'Scan'
			})
		},
		routeToLandingPage() {

			this.$router.push({
				name: 'LandingPage'
			})

		},
		async checkEntryParamPermissions() {
			if(this.$entryParams.permissions === undefined) { // routed into app inner component skipping init in landing page


				this.$entryParams.permissions = JSON.parse(this.permissions)
			}

			if(this.$entryParams.phrasenPromise === undefined) {
				this.$entryParams.phrasenPromise = this.$p.loadCategory(['global', 'person', 'lehre', 'table', 'filter', 'ui'])
			}
		},
		async setup() {
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise

			// if student is logged in as himself load his own viewData
			if(!this.$entryParams.selected_student_info) {

				this.$fhcApi.factory.Profil.getProfileViewData(null).then(res => {

					const data = res.data.retval[0]
					this.viewDataStudent.vorname = data.vorname
					this.viewDataStudent.nachname = data.nachname
					this.viewDataStudent.student_uid = data.student_uid
					this.viewDataStudent.person_id = data.person_id
					this.viewDataStudent.prestudent_id = data.prestudent_id
					this.viewDataStudent.gruppe = data.gruppe
					this.viewDataStudent.verband = data.verband
					this.viewDataStudent.semester = data.semester

					this.$entryParams.viewDataStudent = data
				});

			} else { // admin or assistenz check student data - set viewdata from selected student
				const data = this.$entryParams.selected_student_info
				this.viewDataStudent.vorname = data.vorname
				this.viewDataStudent.nachname = data.nachname
				this.viewDataStudent.student_uid = data.student_uid ? data.student_uid : data.uid
				this.viewDataStudent.person_id = data.person_id
				this.viewDataStudent.prestudent_id = data.prestudent_id
				this.viewDataStudent.gruppe = data.gruppe
				this.viewDataStudent.verband = data.verband
				this.viewDataStudent.semester = data.semester
			}

			this.$refs.tabsStudent._.data.tabs.tab1.title = this.$p.t('global/anwesenheiten')
			this.$refs.tabsStudent._.data.tabs.tab2.title = this.$p.t('global/entschuldigungen')
		},
		openModalStudentInit() {
			this.$refs.modalContainerStudentSetup.show()
		},
		loadStudentPage() {
			this.setup()
			this.$refs.modalContainerStudentSetup.hide()
		},
		studentChangedHandler() {

			this.$refs.tabsStudent._.refs.current.reload()

			const uid = this.$entryParams.selected_student_info.uid ? this.$entryParams.selected_student_info.uid : this.$entryParams.selected_student_info.student_uid
			this.$fhcApi.factory.Profil.getProfileViewData(uid).then(res => {

				const data = res.data.retval[0]
				this.viewDataStudent.vorname = data.vorname
				this.viewDataStudent.nachname = data.nachname
				this.viewDataStudent.student_uid = data.student_uid
				this.viewDataStudent.person_id = data.person_id
				this.viewDataStudent.prestudent_id = data.prestudent_id
				this.viewDataStudent.gruppe = data.gruppe
				this.viewDataStudent.verband = data.verband
				this.viewDataStudent.semester = data.semester

				this.$entryParams.viewDataStudent = data
			});

		},
		async awaitPhrasen() {
			await this.$entryParams.phrasenPromise
		}

	},
	created() {
	},
	mounted() {
		this.checkEntryParamPermissions()
		this.setup()
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>

	<div class="row-cols">
		<core-base-layout>	
			<template #main>	
				<div class="row">
					<div class="col-4">
						<h1 class="h4 mb-5">{{ viewDataStudent.vorname }} {{viewDataStudent.nachname }} <span class="fhc-subtitle">{{viewDataStudent.semester }}{{viewDataStudent.verband }}{{viewDataStudent.gruppe }}</span></h1>
					</div>
					<div class="col-4">
						<StudentDropdown v-if="$entryParams?.permissions?.admin || $entryParams?.permissions?.assistenz"
							 id="studentUID" ref="studentDropdown" @studentChanged="studentChangedHandler">
						</StudentDropdown>
					</div>
					<div class="col-4 text-center">
						<button type="button" class="btn btn-primary" @click="routeToCodeScan">{{ $p.t('global/codeEingeben') }}</button>
					</div>
				</div>
				<core-tabs class="mb-5" :config="tabsStudent" ref="tabsStudent"></core-tabs>
			</template>
		</core-base-layout>
		
	</div>
		
`
};

export default StudentComponent


