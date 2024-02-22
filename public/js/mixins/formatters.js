export function anwesenheitFormatter (cell) {
				const data = cell.getData().status
				if (data === "anwesend") return '<i class="fa fa-check"></i>'
				else if (data === "abwesend") return '<i class="fa fa-xmark"></i>'
				else return data
			}

