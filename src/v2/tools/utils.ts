export const YEAR_LENGTH = 31536000000;
export const getLastYear = () => new Date(Date.now() - YEAR_LENGTH);

export const MONTH_LENGTH = 2629800000;
export const getLastMonth = () => new Date(Date.now() - MONTH_LENGTH);

export const WEEK_LENGTH = 604800000;
export const getLastWeek = () => new Date(Date.now() - WEEK_LENGTH);

export const DAY_LENGTH = 86400000;
export const getLastDay = () => new Date(Date.now() - DAY_LENGTH);

export function startOfDay(date: Date | number) {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result.getTime();
}
