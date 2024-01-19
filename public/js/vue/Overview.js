import fhc_anwesenheitenapifactory from "../api/fhc-anwesenheitenapifactory.js";

Vue.$fhcapi = fhc_anwesenheitenapifactory;

const app = Vue.createApp({
	
	components: {

	},
	data() {
		return {
		}
	},
	props() {

	},
	methods: {

	},
	created(){

		// Vue.$fhcapi.UserData.getView(uid).then((res)=>{
		// 	if(!res.data){
		// 		this.notFoundUID=uid;
		// 	}else{
		// 		this.view = res.data?.view;
		//
		// 		this.data = res.data?.data;
		//
		//
		// 	}
		//
		//
		// });
	},
	template:`
	<div>

		<div>
		
			<p>Vue </p>

		</div>
	
	</div>`
	
	
});
app.mount("#content");