import {CoreNavigationCmpt} from '../../../../../js/components/navigation/Navigation.js';
import CoreBaseLayout from '../../../../../js/components/layout/BaseLayout.js';
import CoreTabs from '../../../../../js/components/Tabs.js';
import BsModal from '../../../../../js/components/Bootstrap/Modal.js';
import {StudentDropdown} from "../Setup/StudentDropdown.js"
import StudentAnwesenheitComponent from "./StudentAnwesenheitComponent.js";

import ApiProfil from '../../api/factory/profil.js';
import AnwTimeline from '../Assistenz/AnwTimeline.js';

export const StudentComponent = {
	name: 'StudentComponent',
	components: {
		AnwTimeline,
		CoreNavigationCmpt,
		CoreBaseLayout,
		CoreTabs,
		BsModal,
		StudentDropdown,
		StudentAnwesenheitComponent
	},
	data: function() {
		return {
			tabsStudent: this.getTabsStudent(),
			viewDataStudent: {},
			// tabs are kept alive, inactive ones still show the previous student
			// after a student switch and get reloaded once they are activated again
			tabsToReload: new Set()
		};
	},
	props: {
		permissions: []
	},
	methods: {
		getTabsStudent() {
			const tabs = {
				anwesenheiten: { title: this.$p.t('global/anwesenheiten'), component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentAnwesenheitComponent.js'},
			}
			if(this.$entryParams.permissions.entschuldigungen_enabled) tabs['entschuldigungen'] = { title: this.$p.t('global/entschuldigungen'), component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/StudentEntschuldigungComponent.js'}
			if(this.$entryParams.permissions.admin) tabs['timeline'] = { title: this.$p.t('global/anwTimelineV2'), component: '../../extensions/FHC-Core-Anwesenheiten/js/components/Student/AnwTimelineWrapper.js'}
			
			return tabs
		},
		routeToCodeScan() {
			this.$router.push({
				name: 'Scan'
			})
		},
		checkEntryParamPermissions() {
			if(this.$entryParams.permissions === undefined) { // routed into app inner component skipping init in landing page

				this.$entryParams.permissions = JSON.parse(this.permissions)
			}

			if(this.$entryParams.phrasenPromise === undefined) {
				this.$entryParams.phrasenPromise = this.$p.loadCategory(['global', 'person', 'lehre', 'table', 'filter', 'ui'])
			}

		},
		handleTabChanged (key) {
			const current = this.$refs.tabsStudent?._?.refs?.current
			if (!current) return

			// tab still holds data of a previously selected student -> reload it
			if (this.tabsToReload.has(key) && current.reload) {
				this.tabsToReload.delete(key)
				current.reload()
			}

			// check if the current has redrawTable function -> its a tabulator so redraw it to avoid bad things
			if (current.redrawTable) current.redrawTable()
		},
		setViewDataStudent(data) {
			this.viewDataStudent.vorname = data.vorname
			this.viewDataStudent.nachname = data.nachname
			this.viewDataStudent.student_uid = data.student_uid ? data.student_uid : data.uid
			this.viewDataStudent.person_id = data.person_id
			this.viewDataStudent.prestudent_id = data.prestudent_id
			this.viewDataStudent.gruppe = data.gruppe
			this.viewDataStudent.verband = data.verband
			this.viewDataStudent.semester = data.semester
		},
		async setup() {
			await this.$entryParams.setupPromise
			await this.$entryParams.phrasenPromise

			this.$entryParams.profileViewDataPromise = new Promise((resolve) => {
				// if student is logged in as himself load his own viewData
				if(!this.$entryParams.selected_student_info) {

					this.$api.call(ApiProfil.getProfileViewData(null))
						.then(res => {
							const data = res.data.retval[0]
							this.setViewDataStudent(data)
							this.$entryParams.viewDataStudent = data
							resolve()
						});

				} else { // admin or assistenz check student data - set viewdata from selected student
					this.setViewDataStudent(this.$entryParams.selected_student_info)
					resolve()
				}

			})
		},
		studentChangedHandler() {

			// reload the visible tab right away, mark the other kept alive tabs
			// stale so they reload once activated (handleTabChanged)
			this.$refs.tabsStudent._.refs.current.reload()
			this.tabsToReload = new Set(Object.keys(this.tabsStudent).filter(key => key !== this.$refs.tabsStudent.current))

			const uid = this.$entryParams.selected_student_info.uid ? this.$entryParams.selected_student_info.uid : this.$entryParams.selected_student_info.student_uid
			this.$api.call(ApiProfil.getProfileViewData(uid))
				.then(res => {
					if(!res?.data?.retval?.[0]) return
					const data = res.data.retval[0]
					this.setViewDataStudent(data)
					this.$entryParams.viewDataStudent = data
				});

		},
		async awaitPhrasen() {
			await this.$entryParams.phrasenPromise
		},
		redrawTable() {
			// empty method so landing page doesnt break on this tab
		}
	},
	created() {
	},
	mounted() {
		this.checkEntryParamPermissions()
		this.setup()

		// get some info if desired user endpoint is anw list or entschuldigungen tab and set it accordingly

		if(this.$entryParams.activetabstudent) this.$refs.tabsStudent.change(this.$entryParams.activetabstudent)

	},
	template: `
	<div class="row-cols">
		<core-base-layout>	
			<template #main>	
				<div ref="studentHeaderRow" class="row">
					<div class="col-6">
						<h1 class="h4">
							{{ viewDataStudent.vorname }} {{viewDataStudent.nachname }} 
							<span class="fhc-subtitle">{{viewDataStudent.semester }}{{viewDataStudent.verband }}{{viewDataStudent.gruppe }}</span>
						</h1>				
					</div>
					<div class="col-3">
						<StudentDropdown v-if="$entryParams?.permissions?.admin || $entryParams?.permissions?.assistenz"
							 id="studentUID" ref="studentDropdown" @studentChanged="studentChangedHandler">
						</StudentDropdown>
						
					</div>
					<div class="col-2 text-center">
						<button type="button" class="btn btn-primary" @click="routeToCodeScan">{{ $p.t('global/codeEingeben') }}</button>
					</div>
				</div>
				<template v-if="$entryParams?.permissions?.entschuldigungen_enabled">
					<core-tabs :config="tabsStudent" ref="tabsStudent" @changed="handleTabChanged"></core-tabs>
				</template>
				<template v-else>
					<StudentAnwesenheitComponent/>				
				</template>
			</template>
		</core-base-layout>
		
	</div>
		
`
};

export default StudentComponent