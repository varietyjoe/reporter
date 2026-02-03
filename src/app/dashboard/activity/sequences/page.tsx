"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const sequenceData = [
  {
    name: "Outbound Q1 2024",
    enrolled: 234,
    stats: {
      emailsSent: 1402,
      replies: 89,
      meetings: 23,
      dealsCreated: 12,
      dealsAdvanced: 8,
      dealsWon: 4,
      revenue: 18500,
    },
  },
  {
    name: "Product Demo Follow-up",
    enrolled: 156,
    stats: {
      emailsSent: 624,
      replies: 67,
      meetings: 34,
      dealsCreated: 28,
      dealsAdvanced: 22,
      dealsWon: 11,
      revenue: 42000,
    },
  },
  {
    name: "Re-engagement Campaign",
    enrolled: 89,
    stats: {
      emailsSent: 267,
      replies: 23,
      meetings: 8,
      dealsCreated: 5,
      dealsAdvanced: 3,
      dealsWon: 1,
      revenue: 4500,
    },
  },
];

export default function SequencesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sequences</h1>
        <p className="text-muted-foreground">
          Track sequence performance from enrollment to revenue
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">479</div>
            <p className="text-xs text-muted-foreground">Across 3 sequences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7.8%</div>
            <p className="text-xs text-green-600">+1.2% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Meeting Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.8%</div>
            <p className="text-xs text-green-600">+0.5% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$65,000</div>
            <p className="text-xs text-green-600">+18% vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Sequence Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Performance Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sequenceData.map((sequence) => (
              <div key={sequence.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{sequence.name}</h3>
                  <span className="text-sm text-muted-foreground">{sequence.enrolled} enrolled</span>
                </div>

                {/* Funnel visualization */}
                <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="font-bold">{sequence.stats.emailsSent}</div>
                    <div className="text-xs text-muted-foreground">Emails</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="font-bold">{sequence.stats.replies}</div>
                    <div className="text-xs text-muted-foreground">Replies</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="font-bold">{sequence.stats.meetings}</div>
                    <div className="text-xs text-muted-foreground">Meetings</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="font-bold">{sequence.stats.dealsCreated}</div>
                    <div className="text-xs text-muted-foreground">Deals</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="font-bold">{sequence.stats.dealsAdvanced}</div>
                    <div className="text-xs text-muted-foreground">Advanced</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="font-bold">{sequence.stats.dealsWon}</div>
                    <div className="text-xs text-muted-foreground">Won</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="font-bold text-green-600">${(sequence.stats.revenue / 1000).toFixed(1)}k</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                </div>

                {/* Conversion rates */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Reply: {((sequence.stats.replies / sequence.stats.emailsSent) * 100).toFixed(1)}%</span>
                  <span>Meeting: {((sequence.stats.meetings / sequence.enrolled) * 100).toFixed(1)}%</span>
                  <span>Deal: {((sequence.stats.dealsCreated / sequence.stats.meetings) * 100).toFixed(0)}%</span>
                  <span>Win: {((sequence.stats.dealsWon / sequence.stats.dealsCreated) * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
