"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, MessageSquare } from "lucide-react";

const insights = [
  {
    category: "Pipeline",
    icon: TrendingUp,
    title: "Deal Velocity Slowing",
    summary: "Average time in 'Proposal Sent' stage increased 40% this week",
    details: "5 deals have been stuck in the Proposal Sent stage for over 7 days. Consider following up with personalized demos or addressing specific objections.",
    recommendations: [
      "Schedule follow-up calls for stalled proposals",
      "Review pricing objections from recent lost deals",
      "Consider offering limited-time incentives",
    ],
    severity: "warning" as const,
  },
  {
    category: "Funnel",
    icon: AlertTriangle,
    title: "Meeting No-Show Rate Elevated",
    summary: "66% no-show rate (6 of 9 meetings) - significantly above 25% benchmark",
    details: "No-show rate has doubled compared to last week. This is impacting qualified opportunity creation.",
    recommendations: [
      "Add calendar reminders 1 hour before meetings",
      "Send SMS confirmations day-of",
      "Qualify meeting intent more thoroughly during booking",
    ],
    severity: "critical" as const,
  },
  {
    category: "Activity",
    icon: Lightbulb,
    title: "Email Engagement Opportunity",
    summary: "Reply rate strong at 6.8% despite lower send volume",
    details: "Even with 20% fewer emails sent, reply rates improved. Quality over quantity is working.",
    recommendations: [
      "Continue personalization approach",
      "Analyze top-performing email templates",
      "Consider A/B testing subject lines",
    ],
    severity: "info" as const,
  },
  {
    category: "Meeting",
    icon: MessageSquare,
    title: "Pricing Discussions Dominating",
    summary: "70% of meeting time spent on pricing in last 5 calls",
    details: "Analysis of Grain transcripts shows pricing is the primary concern. Competitors mentioned in 3 of 5 calls.",
    recommendations: [
      "Prepare competitive battle cards",
      "Lead with value before discussing price",
      "Consider introducing flexible payment terms",
    ],
    severity: "warning" as const,
  },
];

const severityStyles = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  critical: "bg-red-50 border-red-200 text-red-800",
};

const severityIcons = {
  info: "💡",
  warning: "⚠️",
  critical: "🚨",
};

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">
            Intelligent analysis of your funnel, pipeline, and activities
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Insights Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">1 critical, 2 warning</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Recommendations to review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Meetings Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Via Grain integration</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">72</div>
            <p className="text-xs text-muted-foreground">-5 from yesterday</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((insight, i) => (
          <Card key={i} className={`border ${severityStyles[insight.severity]}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{severityIcons[insight.severity]}</span>
                  <div>
                    <CardTitle className="text-base">{insight.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{insight.category}</p>
                  </div>
                </div>
                <insight.icon className="h-5 w-5 opacity-50" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{insight.summary}</p>
              <p className="text-sm text-muted-foreground">{insight.details}</p>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Recommendations:</p>
                <ul className="text-sm space-y-1">
                  {insight.recommendations.map((rec, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
