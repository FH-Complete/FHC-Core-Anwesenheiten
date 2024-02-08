import {Student} from '../components/Student/Student.js';
import fhcapi from '../api/fhc-anwesenheitenapifactory'
import FhcAlert from '../../../../js/plugin/FhcAlert.js';



Vue.$fhcapi = fhcapi;

const studentApp = Vue.createApp({
	components: {
		Student
	},
});

studentApp.use(primevue.config.default).use(FhcAlert);
studentApp.mount('#main');
