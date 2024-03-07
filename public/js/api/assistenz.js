import {CoreRESTClient} from "../../../../../public/js/RESTClient";

export default {
	getEntschuldigungen()
	{
		try {
			return CoreRESTClient.get('extensions/FHC-Core-Anwesenheiten/Api/assistenzGetEntschuldigungen')
		} catch (error) {
			throw error;
		}
	},
	updateEntschuldigung(entschuldigung_id, status)
	{
		try {
			return CoreRESTClient.post('extensions/FHC-Core-Anwesenheiten/Api/assistenzUpdateEntschuldigung',
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