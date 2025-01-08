export default {

	async fetchStatsData(lva, semester, le) {

		const payload = {lva, semester, le}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/StatsApi/fetchStatsData';
		return this.$fhcApi.post(url, payload, null)

	},
	
	async fetchStatsOptions() {
		const url = 'extensions/FHC-Core-Anwesenheiten/api/StatsApi/fetchStatsOptions';
		return this.$fhcApi.post(url, null, null)
	}

}