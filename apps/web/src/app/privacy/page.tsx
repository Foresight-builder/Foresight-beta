import { getServerLocale } from "@/lib/i18n-server";
import { defaultLocale, type Locale } from "../../i18n-config";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

async function loadLanguageFile(locale: Locale): Promise<any> {
  const langMap = {
    "zh-CN": () => import("../../../messages/zh-CN.json"),
    en: () => import("../../../messages/en.json"),
    es: () => import("../../../messages/es.json"),
    fr: () => import("../../../messages/fr.json"),
    ko: () => import("../../../messages/ko.json"),
  };

  const loader = langMap[locale] || langMap[defaultLocale];
  const langModule = await loader();
  return langModule.default;
}

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const langFile = await loadLanguageFile(locale);
  const privacy = (langFile as any)?.legal?.privacy || {};
  const title = typeof privacy?.title === "string" ? privacy.title : "Privacy Policy";
  const lastUpdated = typeof privacy?.lastUpdated === "string" ? privacy.lastUpdated : "";
  const sections = Array.isArray(privacy?.sections) ? (privacy.sections as LegalSection[]) : [];
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        {lastUpdated ? <p className="text-sm text-gray-600 mb-8">{lastUpdated}</p> : null}

        {sections.map((s, idx) => (
          <section key={idx} className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            {Array.isArray(s.paragraphs)
              ? s.paragraphs.map((p, pIdx) => <p key={pIdx}>{p}</p>)
              : null}
            {Array.isArray(s.items) ? (
              <ul className="list-disc pl-6 space-y-2">
                {s.items.map((it, itIdx) => (
                  <li key={itIdx}>{it}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
