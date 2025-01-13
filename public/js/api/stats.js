export default {

	async fetchStatsData(lva, semester) {

		const payload = {lva, semester}
		const url = 'extensions/FHC-Core-Anwesenheiten/api/StatsApi/fetchStatsData';
		return this.$fhcApi.post(url, payload, null)

	},
	
	async fetchStatsOptions() {
		const url = 'extensions/FHC-Core-Anwesenheiten/api/StatsApi/fetchStatsOptions';
		return this.$fhcApi.post(url, null, null)
	}

}