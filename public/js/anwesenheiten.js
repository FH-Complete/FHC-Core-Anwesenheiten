function formatDate (date) {


	let date2 = new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
		.toISOString()
		.split("T")[0];

	return date2
}
