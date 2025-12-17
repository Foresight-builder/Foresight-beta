"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

const languages = [
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  { code: "en", name: "English", flag: "🇺🇸" },
] as const;

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>("zh-CN");
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 从路径中检测当前语言
    const pathLang = pathname.split("/")[1];
    if (pathLang && languages.some((l) => l.code === pathLang)) {
      setCurrentLang(pathLang);
    }

    // 点击外部关闭菜单
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pathname]);

  const changeLanguage = (langCode: string) => {
    // 移除当前语言前缀（如果有）
    let newPath = pathname;
    languages.forEach((lang) => {
      if (newPath.startsWith(`/${lang.code}`)) {
        newPath = newPath.slice(lang.code.length + 1);
      }
    });

    // 添加新语言前缀（除非是默认语言 zh-CN）
    if (langCode !== "zh-CN") {
      newPath = `/${langCode}${newPath || "/"}`;
    }

    router.push(newPath || "/");
    setCurrentLang(langCode);
    setIsOpen(false);

    // 保存语言偏好
    localStorage.setItem("preferred-language", langCode);
  };

  const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white transition-colors text-sm font-medium text-gray-700"
        aria-label="切换语言"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm ${
                currentLang === lang.code ? "bg-purple-50 text-purple-700" : "text-gray-700"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
              {currentLang === lang.code && <span className="ml-auto text-purple-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
