export const lektorFormatters = {
	centeredFormatter: function(cell) {
		const val = cell.getValue()
		return '<div style="display: flex; justify-content: center; align-items: center; height: 100%">'+val+'</div>'
	},
	entschuldigtColoring: function (row) {
		const data = row.getData()

		if(data.entschuldigt) {
			row.getElement().style.color = "#0335f5";
		}
	},
	percentFormatter: function (cell) {
		return '<div style="display: flex; justify-content: center; align-items: center; height: 100%">'+ cell.getData().sum + ' %</div>'
	},
	formDateOnly: function (cell) {
		var value = cell.getValue();

		if (value) {
			var date = new Date(value);

			var formattedDate = date.getDate().toString().padStart(2, '0') + '.' +
				(date.getMonth() + 1).toString().padStart(2, '0') + '.' +
				date.getFullYear()

			return formattedDate;
		}

		return value
	},
	fotoFormatter: function (cell) {
		let value = cell.getValue();
		if(value === undefined) return

		return '<div style="display: flex; justify-content: center; align-items: center; height: 100%"><img src="'+value+'" style="max-height: 64px"></img></div>'
	},
	dateOnlyTimeFormatter: function (cell) {
		const value = cell.getValue();

		if(value === undefined) return ''

		const date = new Date(value);
		let hours = date.getHours();
		let minutes = date.getMinutes();

		hours = (hours < 10) ? '0' + hours : hours;
		minutes = (minutes < 10) ? '0' + minutes : minutes;
		return hours + ':' + minutes
	}
}

export const studentFormatters = {
	formDate: function(cell)
	{
		var value = cell.getValue();

		if (value)
		{
			var date = new Date(value);

			var formattedDate = date.getDate().toString().padStart(2, '0') + '.' +
				(date.getMonth() + 1).toString().padStart(2, '0') + '.' +
				date.getFullYear() + ' ' +
				date.getHours().toString().padStart(2, '0') + ':' +
				date.getMinutes().toString().padStart(2, '0');

			return formattedDate;
		}

		return value;
	},

	formStudiengangKz: function (cell) {
		const rowData = cell.getRow().getData()
		return rowData.kurzbzlang + ' ' + rowData.bezeichnung
	},

	customGroupHeader: function(value, count, data)
	{
		return '<div style="display:flex; justify-content: space-between;">' +
			'<div>' + value + '</div>' +
			'<div style="flex-grow: 1; text-align: right;">Anwesenheit ' + data[0].anwesenheit + " %" + '</div>' +
			'</div>';
	},


}