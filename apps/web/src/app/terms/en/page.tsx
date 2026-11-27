import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Kuran Yolu terms of use: scope of service, limits of religious content, prayer times, intellectual property, and limitation of liability.",
  alternates: { languages: { tr: "/terms", en: "/terms/en" } },
};

const sectionTitleClass = "mt-10 scroll-mt-28 font-display text-xl font-bold text-navy-900 dark:text-stone-100";

export default function TermsEnPage() {
  return (
    <main lang="en" className="mx-auto max-w-3xl px-4 py-10 text-stone-700 dark:text-stone-300 sm:px-6 [&_a]:font-medium [&_a]:text-navy-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-navy-300 [&_li]:pl-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:mt-3 [&_p]:leading-7 [&_strong]:font-semibold [&_strong]:text-stone-900 dark:[&_strong]:text-stone-100 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5">
      <p className="mb-4 text-sm"><Link href="/terms" hrefLang="tr" lang="tr">Türkçe</Link></p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 dark:text-stone-50">Terms of Use</h1>
      <p className="mb-10 text-sm text-stone-500 dark:text-stone-400">Effective Date: November 27, 2026</p>

      <p><strong>Developer:</strong> Kartal Studio<br/>
      <strong>Contact:</strong> <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a><br/>
      <strong>App:</strong> Kuran Yolu</p>

      <h2 className={sectionTitleClass}>1. Description of Service</h2>
      <p>Kuran Yolu is a <strong>free</strong>, <strong>ad-free</strong> web and mobile application for reading the Quran, exploring translations and tafsir, studying word and root morphology, taking Arabic alphabet (Elif-Ba) and Islamic lessons, and using prayer time and worship guides. By using the app, you agree to these Terms of Use.</p>

      <h2 className={sectionTitleClass}>2. Sources and Limits of Religious Content</h2>
      <ul>
        <li><strong>Translations and tafsir:</strong> Quran translations and tafsir commentaries are human translations and scholarly interpretations (Elmalılı Hamdi Yazır in Turkish, and M. M. Pickthall in the English interface).</li>
        <li><strong>AI-assisted content:</strong> AI-assisted materials — including simplified tafsir explanations, selected lessons, quizzes, duas, hadith, seerah content, and English interface/content translations — are separately disclosed in the app and source notices. Although checked with automated and human reviews, errors may still occur.</li>
        <li><strong>Informational use only:</strong> Nothing in the app constitutes a fatwa, formal religious ruling, or official religious or legal advice. Please consult qualified scholars or institutions for authoritative religious guidance.</li>
      </ul>

      <h2 className={sectionTitleClass}>3. Prayer Times and Qibla Compass</h2>
      <p>Prayer times are primarily sourced per city from the Presidency of Religious Affairs of Türkiye (Diyanet, Awqat Salah). When Diyanet is unavailable or no Diyanet city is nearby, approximate times are calculated using Aladhan.com as a fallback. The qibla direction is calculated using your device&apos;s sensors and approximate location; accuracy may vary due to magnetic interference, sensor calibration, or location precision. Prayer times and qibla direction are provided for informational purposes and may be approximate.</p>

      <h2 className={sectionTitleClass}>4. Third-Party Content and Licenses</h2>
      <p>The Arabic Quran text (Tanzil Uthmani 1.1, CC BY 3.0), morphology datasets, tajweed markers, fonts, and open-source software packages used in the app remain subject to their respective licenses and terms. For full attribution and license details, please see the <Link href="/hakkinda">About (Sources and Licenses)</Link> page.</p>

      <h2 className={sectionTitleClass}>5. Intellectual Property</h2>
      <p>Except for third-party openly licensed data and software, <strong>all rights are reserved</strong> in the original source code, design, branding, and original compilations of Kuran Yolu. You may not copy, redistribute, sublicense, or commercially exploit them without prior written permission.</p>

      <h2 className={sectionTitleClass}>6. Acceptable Use</h2>
      <p>You may use the app only for personal, non-commercial, and lawful purposes. You agree not to disrupt the security, integrity, or availability of the service through automated excessive requests, scraping, reverse engineering, or unauthorized access attempts.</p>

      <h2 className={sectionTitleClass}>7. Disclaimer of Warranties and Limitation of Liability</h2>
      <p>Kuran Yolu is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, express or implied, including accuracy, completeness, or uninterrupted availability. To the fullest extent permitted by law, the developer is not liable for any direct or indirect damages arising from your use of the app, potential content errors, prayer time or qibla inaccuracies, or service interruptions.</p>

      <h2 className={sectionTitleClass}>8. Reporting Errors and Content Corrections</h2>
      <p>If you notice a textual, translation, morphology, or technical error, please report it via the <Link href="/support">Support</Link> page or by email. Reported content issues are reviewed against canonical sources and corrected in subsequent data or app updates.</p>

      <h2 className={sectionTitleClass}>9. Changes to These Terms</h2>
      <p>These Terms of Use may be updated from time to time. Updated terms take effect when posted on this page; the effective date is shown at the top of this page.</p>

      <h2 className={sectionTitleClass}>10. Contact</h2>
      <p>For questions or feedback: <a href="mailto:kuranyolu.iletisim@gmail.com">kuranyolu.iletisim@gmail.com</a></p>
    </main>
  );
}
