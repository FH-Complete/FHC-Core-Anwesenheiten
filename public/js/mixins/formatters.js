export function anwesenheitFormatter (cell) {
				const data = cell.getData().status
				if (data === "anw") return '<i class="fa fa-check"></i>'
				else if (data === "abw") return '<i class="fa fa-xmark"></i>'
				else return '-'
			}

