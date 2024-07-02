export const lektorFormatters = {
	entschuldigtColoring: function (row) {
		const data = row.getData()

		if(data.entschuldigt) {
			row.getElement().style.color = "#0335f5";
		}
	},
	anwesenheitFormatter: function (cell) {
		const data = cell.getData().status
		if (data === "anwesend") {
			cell.getElement().style.color = "#28a745";
			return '<i class="fa fa-check"></i>'
		} else if (data === "abwesend") {
			cell.getElement().style.color = "#dc3545";
			return '<i class="fa fa-xmark"></i>'
		} else if (data === "entschuldigt") {
			cell.getElement().style.color = "#28a745";
			// return '<i class="fa fa-bed"></i>'
			return '<i class="fa fa-check"></i>' + '(Entschuldigung akzeptiert)'
		} else return '-'
	},
	anwesenheitFormatterValue: function (cell) {
		const data = cell.getValue()
		if (data === "anwesend") {
			cell.getElement().style.color = "#28a745";
			return '<i class="fa fa-check"></i>'
		} else if (data === "abwesend") {
			cell.getElement().style.color = "#dc3545";
			return '<i class="fa fa-xmark"></i>'
		} else if (data === "entschuldigt") {
			cell.getElement().style.color = "#28a745";
			// return '<i class="fa fa-bed"></i>'
			return '<i class="fa fa-check"></i>' + '(Entschuldigung akzeptiert)'
		} else return '-'
	},
	percentFormatter: function (cell) {
		return cell.getData().sum + ' %';
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

		return '<img src="'+value+'" style="max-height: 64px"></img>'
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

	customGroupHeader: function(value, count, data, group)
	{
		return '<div style="display:flex; justify-content: space-between;">' +
			'<div>' + value + '</div>' +
			'<div style="flex-grow: 1; text-align: right;">Anwesenheit ' + data[0].anwesenheit + " %" + '</div>' +
			'</div>';
	},
	formAnwesenheit: function(cell)
	{
		let data = cell.getValue();
		if (data === "anwesend" || data === 'entschuldigt')
		{
			cell.getElement().style.color = "#28a745";
			let returnValue = '';
			if (data === 'entschuldigt')
				returnValue = '   (Entschuldigung akzeptiert)';
			return '<i class="fa fa-check"></i>' + returnValue;
		}
		else if (data === "abwesend")
		{
			let returnValue = '';
			cell.getElement().style.color = "#dc3545";
			if (cell.getData().exists_entschuldigung === 1)
			{
				if (cell.getData().status_entschuldigung === null)
					returnValue = ' (Entschuldigung offen) ';
				else if (cell.getData().status_entschuldigung === false)
					returnValue = ' (Entschuldigung abgelehnt) ';
				else if (cell.getData().status_entschuldigung === true)
					returnValue = ' (Entschuldigung akzeptiert) ';
			}
			return '<i class="fa fa-xmark"></i>' + returnValue;

		}
		else
			return '-'
	},

	anwesenheitRowFormatter: function(row)
	{
		// let value = row.getData().student_status;
		// let colorClass = "";
		// if (value === 'anwesend' || value === 'entschuldigt')
		// {
		// 	colorClass = "#28a745";
		// }
		// else if (value === 'abwesend')
		// {
		// 	colorClass = "#dc3545";
		// }
		// row.getElement().style.color = colorClass;
	}
}

export const universalFormatter = {

	entschuldigungstatusFormatter: function(cell)
	{
		let data = cell.getValue()
		if (data == null) {
			cell.getElement().style.color = "#17a2b8"
			return 'Hochgeladen'
		} else if (data === true) {
			cell.getElement().style.color = "#28a745";
			return 'Akzeptiert';
		} else if (data === false) {
			cell.getElement().style.color = "#dc3545";
			return 'Abgelehnt'
		}
	},
}
