// 人間の直接取材の出典チェック。ファイル I/O と分け、参照切れや日付の境界を検証できるようにする。
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isProfileUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function calendarDay(value) {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === text ? text : null;
}

/** Markdown のインライン・参照リンクと HTML リンクの、同じページ内の取材参照。 */
function reportingLinks(body) {
  const patterns = [
    /\]\(\s*<?(#reporting-[^\s)>]+)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^()]*\)))?\s*\)/g,
    /^\s*\[[^\]]+\]:\s*<?(#reporting-[^\s>]+)>?/gm,
    /\bhref\s*=\s*["'](#reporting-[^"']+)["']/gi,
  ];
  return patterns.flatMap((pattern) => [...body.matchAll(pattern)].map((match) => match[1]));
}

export function checkReporting(data, body, latestDay) {
  const errors = [];
  const ids = new Set();
  const cutoff = data.updated ?? data.published;
  const cutoffDate = cutoff ? new Date(cutoff) : null;
  const cutoffDay = cutoffDate && !Number.isNaN(cutoffDate.valueOf())
    ? new Date(cutoffDate.valueOf() + 9 * 3600e3).toISOString().slice(0, 10)
    : null;

  for (const record of data.reporting ?? []) {
    if (typeof record.id !== 'string' || !ID.test(record.id)) {
      errors.push(`取材の id は英小文字・数字とハイフンで書く: ${record.id}`);
    }
    if (ids.has(record.id)) errors.push(`取材の id が重複している: ${record.id}`);
    ids.add(record.id);
    if (record.reporterUrl !== undefined && !isProfileUrl(record.reporterUrl)) {
      errors.push(`取材者の公開プロフィールは http / https の URL で書く: ${record.id}`);
    }
    const day = calendarDay(record.date);
    if (!day) {
      errors.push(`取材日は実在する日付を YYYY-MM-DD で書く: ${record.id}`);
    } else {
      if (day > latestDay) errors.push(`取材日が未来になっている: ${record.id}`);
      if (cutoffDay && day > cutoffDay) {
        errors.push(`取材日が記事・トピックの最終更新日より後になっている: ${record.id}`);
      }
    }
  }

  const listed = new Set([...ids].map((id) => `#reporting-${id}`));
  for (const link of new Set(reportingLinks(body))) {
    if (!listed.has(link)) errors.push(`本文の取材参照が reporting に載っていない: ${link}`);
  }
  for (const item of data.timeline ?? []) {
    for (const link of item.sources ?? []) {
      if (link.startsWith('#reporting-') && !listed.has(link)) {
        errors.push(`年表の取材参照が reporting に載っていない: ${link}`);
      }
    }
  }
  return errors;
}
