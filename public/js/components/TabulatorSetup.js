/**
 * Copyright (C) 2022 fhcomplete.org
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 *
 */
export const AnwesenheitenTabulatorOptions = {
	height: 700,
	index: 'prestudent_id',
	layout: 'fitColumns',
	columns: [
		{title: 'Prestudent ID', field: 'prestudent_id', visible: false},
		{title: 'Vorname', field: 'vorname', headerFilter: true},
		{title: 'Nachname', field: 'nachname', headerFilter: true},
		{title: 'Aktuelles Datum', field: 'datum', headerFilter: true},
		{title: 'Summe', field: 'sum', headerFilter: true},
	]
};

// export const AnwesenheitenTabulatorOptions = {
// 	height: 700,
// 	index: 'anwesenheiten_id',
// 	layout: 'fitColumns',
// 	columns: [
// 		{title: 'Anwesenheit ID', field: 'anwesenheit_id', headerFilter: true},
// 		{title: 'Prestudent ID', field: 'prestudent_id', headerFilter: true},
// 		{title: 'Lehreinheit ID', field: 'lehreinheit_id', headerFilter: true},
// 		{title: 'Status', field: 'status', headerFilter: true},
// 		{title: 'Datum', field: 'datum', headerFilter: true},
// 	]
// };

/**
 *
 */
export const AnwesenheitenTabulatorEventHandlers = [
	{
		event: "rowClick",
		handler: function(e, row) {
			alert(row.getData().Data);
		}
	}
];

