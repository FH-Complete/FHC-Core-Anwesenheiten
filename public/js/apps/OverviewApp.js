import fhc_anwesenheitenapifactory from "../api/fhc-anwesenheitenapifactory.js";
import OverviewComponent from "../components/OverviewComponent.js";
// import FhcAlert from '../../../../js/plugin/FhcAlert.js';

Vue.$fhcapi = fhc_anwesenheitenapifactory;

const overviewApp = Vue.createApp({
	
	components: {
		OverviewComponent
	},
	data() {
		return {

		}
	},
	props: {

	},
	methods: {

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
		<overview-component></overview-component>
	</div>`
	
	
});
overviewApp
	.use(primevue.config.default, {zIndex: {overlay: 9999}})
	.use(FhcAlert)
	.mount("#main");