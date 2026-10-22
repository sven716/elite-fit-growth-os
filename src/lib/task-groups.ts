export type DatedItem = { due_date: string | null };

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function groupItemsByTimeline<T extends DatedItem>(items: T[], day: string) {
  const upcomingLimit = addDays(day, 7);
  return {
    overdue: items.filter(
      (item) => item.due_date !== null && item.due_date < day,
    ),
    today: items.filter((item) => item.due_date === day),
    upcoming: items.filter(
      (item) =>
        item.due_date !== null &&
        item.due_date > day &&
        item.due_date <= upcomingLimit,
    ),
    later: items.filter(
      (item) => item.due_date !== null && item.due_date > upcomingLimit,
    ),
    withoutDate: items.filter((item) => item.due_date === null),
  };
}
