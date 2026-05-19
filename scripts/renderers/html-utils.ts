export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDisplayDate(input: string, month: 'short' | 'long' = 'short'): string {
  const dateOnlyMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const monthIndex = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const utcDate = new Date(Date.UTC(year, monthIndex, day));

    return new Intl.DateTimeFormat('en-US', {
      month,
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(utcDate);
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      month,
      day: 'numeric',
      year: 'numeric'
    }).format(parsed);
  }

  return input;
}
