function formatDateToDbString (date) {
	return new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
		.toISOString()
		.split("T")[0];
}

function areDatesSame(date1, date2) {
	const date1Date = date1.getDate()
	const date2Date = date2.getDate()

	const date1Month = date1.getMonth()
	const date2Month = date2.getMonth()

	const date1Year = date1.getFullYear()
	const date2Year = date2.getFullYear()

	return date1Date === date2Date && date1Month === date2Month && date1Year === date2Year
}