interface ProjectTabBarProps {
  activeTab: "detail" | "files";
  onTabChange: (tab: "detail" | "files") => void;
}

export function ProjectTabBar({ activeTab, onTabChange }: ProjectTabBarProps) {
  const tabs = [
    { id: "detail" as const, label: "Detail" },
    { id: "files" as const, label: "Files" },
  ];

  return (
    <div className="flex items-center border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-normal ${
            activeTab === tab.id
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
