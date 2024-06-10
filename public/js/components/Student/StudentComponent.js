import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import CoreTabs from '../../../../../js/components/Tabs.js';

export default {
	name: 'StudentComponent',
	components: {
		CoreNavigationCmpt,
		CoreBaseLayout,
		CoreTabs
	},
	data: function() {
		return {
			headerMenuEntries: {},
			sideMenuEntries: {},
			tabs: {
				tab1: { title: this.$p.t('global/anwesenheiten'), component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentAnwesenheitComponent.js'},
				tab2: { title: this.$p.t('global/entschuldigungen'), component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentEntschuldigungComponent.js'}
			},
			viewDataStudent: {}
		};
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

		}

	},
	mounted() {

		// if student is logged in as himself load his own viewData
		if(!this.$entryParams.selected_student_info) {

			this.$fhcApi.factory.Profil.getProfileViewData(null).then(res => {
				console.log('studentGetViewData', res)

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
			const data = this.$entryParams.selected_student
			this.viewDataStudent.vorname = data.vorname
			this.viewDataStudent.nachname = data.nachname
			this.viewDataStudent.student_uid = data.student_uid ? data.student_uid : data.uid
			this.viewDataStudent.person_id = data.person_id
			this.viewDataStudent.prestudent_id = data.prestudent_id
			this.viewDataStudent.gruppe = data.gruppe
			this.viewDataStudent.verband = data.verband
			this.viewDataStudent.semester = data.semester
		}
	},
	template: `
	<core-navigation-cmpt 
		v-bind:add-side-menu-entries="sideMenuEntries"
		v-bind:add-header-menu-entries="headerMenuEntries"
		:hideTopMenu=true
		leftNavCssClasses="">
	</core-navigation-cmpt>

	<row>
		<button class="btn btn-outline-secondary" @click="routeToLandingPage"><a><i class="fa fa-chevron-left"></i></a></button>
	</row>

	<div class="row-cols">
		<core-base-layout>	
			<template #main>
				<div class="row">
					<div class="col-8">
						<h1 class="h2 mb-5">{{ $p.t('global/anwesenheitenverwaltung') }} - {{ viewDataStudent.vorname }} {{viewDataStudent.nachname }} {{viewDataStudent.semester }} {{viewDataStudent.verband }} {{viewDataStudent.gruppe }}</h1>
					</div>
					<div class="col-4 text-center">
						<button type="button" class="btn btn-primary" @click="routeToCodeScan">{{ $p.t('global/codeEingeben') }}</button>
					</div>
				</div>
				<core-tabs class="mb-5" :config="tabs"></core-tabs>
			</template>
		</core-base-layout>
		
	</div>
		
`
};


