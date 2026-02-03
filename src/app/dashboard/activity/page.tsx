"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { useFilters } from "@/contexts/FilterContext";
import { Phone, Mail, Workflow, ArrowRight } from "lucide-react";

const activitySummary = [
  {
    title: "Calls",
    icon: Phone,
    href: "/dashboard/activity/calls",
    stats: [
      { label: "Made", value: "145" },
      { label: "Connected", value: "121" },
      { label: "Avg Duration", value: "4m 32s" },
    ],
    change: "+12% vs last week",
  },
  {
    title: "Emails",
    icon: Mail,
    href: "/dashboard/activity/emails",
    stats: [
      { label: "Sent", value: "828" },
      { label: "Opened", value: "412" },
      { label: "Replied", value: "56" },
    ],
    change: "+8% vs last week",
  },
  {
    title: "Sequences",
    icon: Workflow,
    href: "/dashboard/activity/sequences",
    stats: [
      { label: "Active", value: "12" },
      { label: "Enrolled", value: "234" },
      { label: "Completed", value: "89" },
    ],
    change: "+15% vs last week",
  },
];

export default function ActivityPage() {
  // Use global filters (data is currently static, but filters persist across pages)
  const { filters } = useFilters();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">
          Track calls, emails, and sequence performance
        </p>
      </div>

      {/* Global FilterBar */}
      <FilterBar />

      <div className="grid gap-6 md:grid-cols-3">
        {activitySummary.map((activity) => (
          <Link key={activity.title} href={activity.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <activity.icon className="h-5 w-5" />
                  {activity.title}
                </CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {activity.stats.map((stat) => (
                    <div key={stat.label}>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-600">{activity.change}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { type: "call", user: "Sarah", action: "completed call with", target: "Acme Corp", time: "2m ago" },
              { type: "email", user: "Mike", action: "sent email to", target: "TechStart Inc", time: "5m ago" },
              { type: "sequence", user: "System", action: "enrolled contact in", target: "Outbound Q1", time: "8m ago" },
              { type: "email", user: "Sarah", action: "received reply from", target: "Global Solutions", time: "12m ago" },
              { type: "call", user: "Mike", action: "scheduled call with", target: "Startup XYZ", time: "15m ago" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`h-2 w-2 rounded-full ${
                  item.type === "call" ? "bg-green-500" :
                  item.type === "email" ? "bg-blue-500" :
                  "bg-purple-500"
                }`} />
                <span className="font-medium">{item.user}</span>
                <span className="text-muted-foreground">{item.action}</span>
                <span className="font-medium">{item.target}</span>
                <span className="text-muted-foreground ml-auto">{item.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
