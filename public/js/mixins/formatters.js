export const lektorFormatters = {
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
	percentFormatter: function (cell) {
		return cell.getData().sum ? cell.getData().sum + ' %' : '';
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
		console.log('formAnwesenheit', cell)
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

	entschuldigungRowFormatter: function(row)
	{
		// let value = row.getData().akzeptiert;
		// let colorClass = "";
		// if (value == null) {
		// 	colorClass = "#17a2b8";
		// } else if (value === true) {
		// 	colorClass = "#28a745";
		// } else if (value === false) {
		// 	colorClass = "#dc3545";
		// }
		// row.getElement().style.color = colorClass;
	},
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
