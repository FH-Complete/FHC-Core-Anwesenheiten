import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	getEntschuldigungen()
	{
		try {
			return CoreRESTClient.get('/extensions/FHC-Core-Anwesenheiten/assistenz/getEntschuldigungen');
		} catch (error) {
			throw error;
		}
	},
	updateEntschuldigung(entschuldigung_id, status)
	{
		try {
			return CoreRESTClient.post('/extensions/FHC-Core-Anwesenheiten/assistenz/updateEntschuldigung',
				{
					'entschuldigung_id': entschuldigung_id,
					'status': status
				}
			);
		} catch (error) {
			throw error;
		}
	},
};