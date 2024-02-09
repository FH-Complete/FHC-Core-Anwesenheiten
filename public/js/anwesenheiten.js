function formatDate (date) {
	return new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
		.toISOString()
		.split("T")[0];
}

function func_height(){
	return window.innerHeight * 0.75;
}