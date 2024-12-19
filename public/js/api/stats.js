export default {

	async fetchStatsData(lv_id, sem_kurzbz, le_id, ma_uid, date) {

		const payload = {lv_id, sem_kurzbz, le_id, ma_uid, date}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/StatsApi/fetchStatsData';
		return this.$fhcApi.post(url, payload, null)

	},
	
	async fetchStatsOptions() {
		const url = 'extensions/FHC-Core-Anwesenheiten/api/StatsApi/fetchStatsOptions';
		return this.$fhcApi.post(url, null, null)
	}

}