"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  FileText,
  Sparkles,
  Settings,
  Phone,
  Mail,
  Workflow,
  Target,
  CalendarDays,
  Sparkle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBar } from "@/components/dashboard/FilterBar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pipeline", href: "/dashboard/pipeline", icon: GitBranch },
  { name: "Meetings", href: "/dashboard/meetings", icon: CalendarDays },
  { name: "Magic Formula", href: "/dashboard/magic-formula", icon: Sparkle },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Target },
  {
    name: "Activity",
    href: "/dashboard/activity",
    icon: Activity,
    children: [
      { name: "Calls", href: "/dashboard/activity/calls", icon: Phone },
      { name: "Emails", href: "/dashboard/activity/emails", icon: Mail },
      { name: "Sequences", href: "/dashboard/activity/sequences", icon: Workflow },
    ],
  },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "AI Insights", href: "/dashboard/insights", icon: Sparkles },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-72 flex-col bg-card border-r">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Reporter</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
              {item.children && isActive && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        pathname === child.href
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <child.icon className="h-4 w-4" />
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="mt-4 border-t pt-4">
          <FilterBar showOwnerFilter showDateFilter showActiveOnly={false} />
        </div>
      </nav>
    </div>
  );
}
