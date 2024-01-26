import fhc_anwesenheitenapifactory from "../api/fhc-anwesenheitenapifactory.js";
// import OverviewComponent from "../components/OverviewComponent.js";
// import FhcAlert from '../../../../js/plugin/FhcAlert.js';

import {CoreFilterCmpt} from '../../../../js/components/filter/Filter.js';
import {CoreNavigationCmpt} from '../../../../js/components/navigation/Navigation.js';

import verticalsplit from "../../../../js/components/verticalsplit/verticalsplit.js";
import searchbar from "../../../../js/components/searchbar/searchbar.js";

import {AnwesenheitenTabulatorOptions} from './TabulatorSetup.js';
import {AnwesenheitenTabulatorEventHandlers} from './TabulatorSetup.js';


Vue.$fhcapi = fhc_anwesenheitenapifactory;

const overviewApp = Vue.createApp({
	
	components: {
		// OverviewComponent
		CoreFilterCmpt,
		CoreNavigationCmpt,
		verticalsplit: verticalsplit,
		searchbar: searchbar
	},
	data() {
		return {
			title: "Anwesenheiten App",
			appSideMenuEntries: {},

			anwesenheitenTabulatorOptions: AnwesenheitenTabulatorOptions,
			anwesenheitenTabulatorEventHandlers: AnwesenheitenTabulatorEventHandlers
		}
	},
	props: {

	},
	methods: {
		newSideMenuEntryHandler: function(payload) {
			this.appSideMenuEntries = payload;
		},
		searchfunction: function(searchsettings) {
			return Vue.$fhcapi.Search.search(searchsettings);
		},
		searchfunctiondummy: function(searchsettings) {
			return Vue.$fhcapi.Search.searchdummy(searchsettings);
		}
	},
	created(){

		// Vue.$fhcapi.UserData.getView(uid).then((res)=>{
		// 	if(!res.data){
		// 		this.notFoundUID=uid;
		// 	}else{
		// 		this.view = res.data?.view;
		// 		this.data = res.data?.data;
		// 	}
		// });

	},
	mounted() {

	},
	updated(){

	},
	template:`
	<div>
		<p>Test</p>
		
		
	</div>`
	
	
});
overviewApp.mount("#main");
	// .use(primevue.config.default, {zIndex: {overlay: 9999}})
	// .use(FhcAlert)
