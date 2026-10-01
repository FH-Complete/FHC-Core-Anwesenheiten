export const lektorFormatters = {
	centeredFormatter: function(cell) {
		const val = cell.getValue()
		return '<div style="display: flex; justify-content: center; align-items: center; height: 44px; max-height: 44px;">'+val+'</div>'
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

		return '<div style="display: flex; justify-content: center; align-items: center; height: 44px; max-height: 44px;"><img src="'+value+'" style="max-height: 64px"></img></div>'
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
	},
	// status cell of the Lektor table and of its detail view (StudentByLvaComponent). Both use it, so a status looks
	// the same in both: the status class on the cell (colors in FhcMain.css, light and dark), the icon and for
	// verspaetet the fehlminuten. options.fehlminutenText() gives the text of the minutes. options.onEditFehlminuten
	// makes the minutes a button that opens the dialog again, the list editor fires nothing for the same status
	anwStatusCell: function (cell, permissions, options = {}) {
		const status = cell.getValue()
		const el = cell.getElement()
		const looks = {
			[permissions.anwesend_status]: {cls: 'anw-anwesend', icon: 'fa fa-check'},
			[permissions.abwesend_status]: {cls: 'anw-abwesend', icon: 'fa fa-xmark'},
			[permissions.entschuldigt_status]: {cls: 'anw-entschuldigt', icon: 'fa-solid fa-user-shield'},
			[permissions.verspaetet_status]: {cls: 'anw-verspaetet', icon: 'fa-solid fa-user-clock'}
		}

		el.classList.remove('anw-anwesend', 'anw-abwesend', 'anw-entschuldigt', 'anw-verspaetet')
		const look = looks[status]
		if (!look) return '-'
		el.classList.add(look.cls)

		const wrap = document.createElement('div')
		wrap.className = 'anw-cell-status'
		wrap.innerHTML = '<i class="' + look.icon + '" aria-hidden="true"></i>'
		if (status !== permissions.verspaetet_status) return wrap

		const minutes = document.createElement(options.onEditFehlminuten ? 'button' : 'span')
		minutes.textContent = options.fehlminutenText()
		if (options.onEditFehlminuten) {
			minutes.type = 'button'
			minutes.className = 'anw-fehlminuten-btn'
			minutes.title = options.editTitle ?? ''
			// stop the events before they reach the cell, else the list editor opens as well
			minutes.addEventListener('mousedown', e => {
				e.preventDefault()
				e.stopPropagation()
			})
			minutes.addEventListener('click', e => {
				e.preventDefault()
				e.stopPropagation()
				options.onEditFehlminuten()
			})
		}
		wrap.appendChild(minutes)

		return wrap
	}
}

export const studentFormatters = {
	formFile: function(cell) {
		var value = cell.getValue();

		if(value) {
			return '<div style="display: flex; justify-content: center; align-items: center; height: 100%; cursor: pointer;">' +
				'<a><i class="fa fa-file-pdf anw-file-icon"></i></a></div>'
		} else return '<div style="display: flex; justify-content: center; align-items: center; height: 100%">' +
			'<a>-</a></div>'

	},
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
	}
}