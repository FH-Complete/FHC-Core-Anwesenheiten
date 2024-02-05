import fhc_anwesenheitenapifactory from "../api/fhc-anwesenheitenapifactory.js";
import LektorComponent from "../components/LektorComponent.js";
// import FhcAlert from '../../../../js/plugin/FhcAlert.js';




Vue.$fhcapi = fhc_anwesenheitenapifactory;

const lektorApp = Vue.createApp({
	
	components: { LektorComponent

	},
	data() {
		return {
			title: "Lektor Anwesenheitskontrolle App",

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
		<lektor-component></lektor-component>
	</div>`
	
	
});
lektorApp.mount("#main");
	// .use(primevue.config.default, {zIndex: {overlay: 9999}})
	// .use(FhcAlert)
