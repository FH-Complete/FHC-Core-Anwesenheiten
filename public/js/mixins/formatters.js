const formatters = {
	methods:{
			anwesenheitFormatter (cell) {
				const data = cell.getData().datum
				if (data === "anw") return '<i class="fa fa-check"></i>'
				else if (data === "abw") return '<i class="fa fa-xmark"></i>'
				else return '-'
		}
	}
}

