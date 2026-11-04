// Date math on the day of the server (ctx.today, YYYY-MM-DD). UTC only, so the time zone of the runner does not matter.

export const addDays = (iso, days) => {
	const date = new Date(`${iso}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
};

/**
 * n workdays before iso, like ProfilApi::calcMinDate: a Monday steps back to the Friday, every other day one day.
 * A Saturday or Sunday at the start therefore counts as a workday.
 */
export const workdaysBack = (iso, n) => {
	let day = iso;
	for (let i = 0; i < n; i += 1) {
		const isMonday = new Date(`${day}T00:00:00Z`).getUTCDay() === 1;
		day = addDays(day, isMonday ? -3 : -1);
	}
	return day;
};

/** { year, month, day } of the KontrolleApi */
export const dateParam = iso => {
	const [year, month, day] = iso.split('-').map(Number);
	return { year, month, day };
};

/** { hours, minutes, seconds } of the KontrolleApi from 'HH:MM' */
export const timeParam = hhmm => {
	const [hours, minutes] = hhmm.split(':').map(Number);
	return { hours, minutes, seconds: 0 };
};
