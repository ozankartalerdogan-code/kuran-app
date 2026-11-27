import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Kuran Yolu privacy policy: data collected, cloud backup, third-party services, and account and data deletion.",
  alternates: { languages: { tr: "/privacy", en: "/privacy/en" } },
};

const sectionTitleClass = "mt-10 scroll-mt-28 font-display text-xl font-bold text-navy-900 dark:text-stone-100";

export default function PrivacyEnPage() {
  return (
    <main lang="en" className="mx-auto max-w-3xl px-4 py-10 text-stone-700 dark:text-stone-300 sm:px-6 [&_a]:font-medium [&_a]:text-navy-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-navy-300 [&_li]:pl-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:mt-3 [&_p]:leading-7 [&_strong]:font-semibold [&_strong]:text-stone-900 dark:[&_strong]:text-stone-100 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5">
      <p className="mb-4 text-sm"><Link href="/privacy" hrefLang="tr" lang="tr">Türkçe</Link></p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 dark:text-stone-50">Privacy Policy</h1>
      <p className="mb-10 text-sm text-stone-500 dark:text-stone-400">Last updated: November 27, 2026</p>

      <p><strong>Developer:</strong> Kartal Studio<br/>
      <strong>Contact:</strong> kuranyolu.iletisim@gmail.com<br/>
      <strong>App:</strong> Kuran Yolu - Learn Islam</p>

      <h2 className={sectionTitleClass}>1. Data Collected</h2>
      <p><strong>Automatically collected through Firebase Analytics:</strong></p>
      <ul>
        <li>App usage statistics (which screens were opened)</li>
        <li>Device type and operating system version</li>
        <li>App version</li>
        <li>Anonymous user ID</li>
      </ul>
      <p><strong>Stored on your device and included in the cloud backup:</strong></p>
      <ul>
        <li>Favorite verses</li>
        <li>Personal notes</li>
        <li>Quran completion tracking and reading position (bookmark)</li>
        <li>Lesson and Arabic alphabet learning progress</li>
        <li>Daily streak information</li>
        <li>Some app preferences (night mode, font size, tajweed)</li>
      </ul>
      <p>This data is primarily stored on your device. The relevant verse keys may be sent to the app API to display the translations and verse information for verses you have favorited or added notes to.</p>
      <p><strong>Cloud backup (Firebase):</strong> The data above is backed up using Google Firebase (Cloud Firestore) so that your progress is not lost if you uninstall and reinstall the app or switch to a new device. This backup is linked to <strong>an anonymous identity</strong> (Firebase Anonymous Authentication) created without requesting any identifying information such as your name, email address, or phone number. Access to your backup is restricted by security rules to your anonymous identity alone; data is encrypted in transit using HTTPS. Backup content, including your note text, is not used for advertising, profiling, or analytics and is not shared with third parties. You can permanently delete your backup and anonymous account from within the app at any time (see <a href="#account-deletion">&quot;Account and Data Deletion&quot;</a> below).</p>
      <p><strong>Device system backup:</strong> If your device's system backup feature is enabled, this on-device data may also be backed up automatically: to the Google Drive account linked to your device on Android, or to your iCloud account on iOS. This backup is managed by Google or Apple and can be turned off in your device settings.</p>
      <p><strong>Location data:</strong> Approximate location (at the city level) is used for prayer times and the qibla direction; precise (GPS) location is not used. The qibla direction is calculated entirely on your device. For prayer times, your location is rounded to roughly 1 km and sent to our app server, which uses it only to find the nearest city of the <strong>Presidency of Religious Affairs of Türkiye (Diyanet)</strong> and then fetches that city's times from Diyanet (your location is not sent to Diyanet). If this service is unavailable or there is no Diyanet city near you, your approximate location is sent to the third-party service <strong>Aladhan.com</strong> instead (see &quot;Third-Party Services&quot; below). Your location is not recorded on our servers; it may only appear temporarily in the standard, short-lived request logs of our hosting provider (Vercel). The matched city and prayer times are stored on your device. On the website&apos;s Qibla page, if location permission is granted, the latitude and longitude provided by your browser are sent directly from the browser to the <strong>OpenStreetMap Nominatim</strong> service to display your city name (reverse geocoding); if location permission is not granted, no request is made. This service is not used in the mobile app.</p>
      <p><strong>Search data:</strong> When you use the search feature in the app, your search query may be sent to the app server solely to retrieve search results. Search queries are not used for ad targeting or user profiling; search text is not sent to Firebase Analytics.</p>
      <p><strong>Advertising ID:</strong> The app does not contain ads and does not collect your advertising ID.</p>
      <p><strong>Microphone:</strong> The app does not request microphone access or record audio.</p>
      <p><strong>Notifications (mobile app):</strong> Prayer time and Verse of the Day notifications are scheduled locally on your device (expo-notifications). Push tokens or notification data are not sent to our servers. Notification permission is optional; you can turn off notifications from the Notifications screen in the app or in your device settings. On Android, an &quot;exact alarm&quot; permission may be requested for on-time notifications; if not granted, notifications may be delayed by a few minutes.</p>

      <h2 className={sectionTitleClass}>2. Use of Data</h2>
      <p>The data collected is used only for the following purposes:</p>
      <ul>
        <li>Improving app performance</li>
        <li>Detecting and fixing errors</li>
        <li>Improving the user experience</li>
      </ul>
      <p><strong>Your data is never sold to third parties.</strong></p>

      <h2 className={sectionTitleClass}>3. Third-Party Services</h2>
      <p>The app uses the following third-party services:</p>
      <ul>
        <li><strong>Firebase Analytics</strong> — Usage statistics (<a href="https://policies.google.com/privacy" target="_blank">Google Privacy Policy</a>)</li>
        <li><strong>Firebase Authentication</strong> — Anonymous identity for linking the cloud backup specifically to you (<a href="https://firebase.google.com/support/privacy" target="_blank">Firebase Privacy Policy</a>)</li>
        <li><strong>Cloud Firestore</strong> — Cloud backup storage (<a href="https://firebase.google.com/support/privacy" target="_blank">Firebase Privacy Policy</a>)</li>
        <li><strong>Sentry</strong> — Error reporting (<a href="https://sentry.io/privacy/" target="_blank">Sentry Privacy Policy</a>)</li>
        <li><strong>Diyanet (Presidency of Religious Affairs of Türkiye)</strong> — Prayer times (per city; your location is not sent)</li>
        <li><strong>Aladhan.com</strong> — Fallback prayer times API (<a href="https://aladhan.com/privacy" target="_blank">Aladhan Privacy Policy</a>)</li>
        <li><strong>Vercel</strong> — App server (hosting) (<a href="https://vercel.com/legal/privacy-policy" target="_blank">Vercel Privacy Policy</a>)</li>
        <li><strong>Turso</strong> — Database (<a href="https://turso.tech/privacy" target="_blank">Turso Privacy Policy</a>)</li>
        <li><strong>Upstash Redis</strong> — Web API rate limiting (to prevent abuse, the request IP address is stored briefly as a 60-second sliding-window counter key; it is not used for any other purpose or profiled) and coordination of Diyanet prayer time requests (contains no personal data)</li>
        <li><strong>OpenStreetMap Nominatim</strong> — Reverse geocoding to display your city name on the website&apos;s Qibla page only, when location permission is granted (<a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">OpenStreetMap Foundation Privacy Policy</a>)</li>
      </ul>

      <h2 className={sectionTitleClass}>4. Data Security</h2>
      <ul>
        <li>All API communications are encrypted using HTTPS</li>
        <li>No user account is required; names, email addresses, and phone numbers are not collected</li>
        <li>Your note text is stored on your device and only in your personal cloud backup, which is protected by an anonymous identity; it is not used for any other purpose</li>
        <li>Verse keys for favorited verses or verses with notes may be sent to the API only to display the relevant verse information</li>
      </ul>

      <h2 className={sectionTitleClass}>5. Children's Privacy</h2>
      <p>The app is not intended for children under 13. We do not knowingly collect data from users under 13.</p>

      <h2 className={sectionTitleClass}>6. Rights Under the KVKK</h2>
      <p>You have the following rights under the Turkish Personal Data Protection Law No. 6698 (KVKK):</p>
      <ul>
        <li>The right to access your data</li>
        <li>The right to request correction of your data</li>
        <li>The right to request deletion of your data</li>
      </ul>
      <p>To exercise these rights: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>

      <h2 id="account-deletion" className={sectionTitleClass}>7. Account and Data Deletion</h2>
      <p>The app uses <strong>an anonymous Firebase account</strong> for cloud backup, without requesting your name or email address. You can delete this account and your entire cloud backup from within the app:</p>
      <ol>
        <li>In the app, open <strong>More → Privacy Policy</strong>.</li>
        <li>In the &quot;7. Account and Data Deletion&quot; section, tap <strong>&quot;Delete my cloud backup&quot;</strong> and confirm.</li>
      </ol>
      <p>Deletion is immediate and permanent: your cloud backup document and anonymous Firebase account are deleted; deleted data cannot be recovered. Local data on your device is not affected — you can delete it by uninstalling the app or clearing the app data in your device settings. Cloud backup will remain off until you turn it back on from within the app.</p>
      <p>If you cannot access the app, send your deletion request to <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a>; we will help you delete your backup.</p>

      <h2 className={sectionTitleClass}>8. Changes</h2>
      <p>This privacy policy may be updated from time to time. The effective date of the current version is stated at the top of this page.</p>

      <h2 className={sectionTitleClass}>9. Contact</h2>
      <p>For questions: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>
    </main>
  );
}
