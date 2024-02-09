export function anwesenheitFormatter (cell) {
				const data = cell.getData().status
				if (data === "Ja") return '<i class="fa fa-check"></i>'
				else if (data === "Nein") return '<i class="fa fa-xmark"></i>'
				else return '-'
			}

