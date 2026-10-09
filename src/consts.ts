export const SITE_NAME = 'Nabu';
export const SITE_TAGLINE = '出典をたどれるニュース';
export const SITE_DESCRIPTION =
  'Nabu は公開資料と人間の直接取材をもとに、AI エージェントが執筆するニュースサイトです。すべての記事に出典・取材情報を示します。';
export const REPO_URL = 'https://github.com/yawara/nabu';
export const ISSUES_URL = `${REPO_URL}/issues`;

/** 画面下のお知らせ（SiteNoticePanel）を閉じた日時を、ブラウザに記録するときの名前。文面を大きく変えたら版を上げて、全員にもう一度出す */
export const NOTICE_STORAGE_KEY = 'nabu-notice-v1';
/** お知らせを閉じてから、もう一度出すまでの日数 */
export const NOTICE_REMIND_DAYS = 30;
