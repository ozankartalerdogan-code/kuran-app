"use client";

import { useId, useState, type ReactNode } from "react";

export interface AyahDetailTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface AyahDetailTabsProps {
  tabs: AyahDetailTabItem[];
}

export function AyahDetailTabs({ tabs }: AyahDetailTabsProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const panelBaseId = useId();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white shadow-card">
      <div
        className="flex gap-1 overflow-x-auto border-b border-stone-200 px-3 py-3"
        role="tablist"
        aria-label="Ayet detay bölümleri"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <button
              aria-controls={`${panelBaseId}-${tab.id}`}
              aria-selected={isActive}
              className={[
                "min-h-11 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-stone-700 hover:bg-navy-50"
              ].join(" ")}
              id={`${panelBaseId}-${tab.id}-tab`}
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={`${panelBaseId}-${activeTab.id}-tab`}
        className="p-4 sm:p-5"
        id={`${panelBaseId}-${activeTab.id}`}
        role="tabpanel"
      >
        {activeTab.content}
      </div>
    </section>
  );
}
