import Anthropic from "@anthropic-ai/sdk";
import type { DailyMetrics, AIInsight } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generatePipelineInsights(
  metrics: DailyMetrics,
  historicalMetrics: DailyMetrics[]
): Promise<AIInsight[]> {
  const prompt = `Analyze the following sales pipeline metrics and provide actionable insights.

Today's Metrics:
${JSON.stringify(metrics, null, 2)}

Historical Metrics (last 7 days):
${JSON.stringify(historicalMetrics, null, 2)}

Provide insights in the following JSON format:
{
  "insights": [
    {
      "category": "pipeline" | "funnel" | "activity",
      "title": "Short title",
      "summary": "One sentence summary",
      "details": "Detailed explanation",
      "recommendations": ["Action 1", "Action 2", "Action 3"],
      "severity": "info" | "warning" | "critical"
    }
  ]
}

Focus on:
1. Deal velocity and stage progression
2. Conversion rates between stages
3. At-risk patterns
4. Activity effectiveness
5. Comparison to recent trends

Return only valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return [];
    }

    const parsed = JSON.parse(content.text);
    return parsed.insights.map((insight: Omit<AIInsight, "id" | "createdAt">, index: number) => ({
      ...insight,
      id: `insight-${Date.now()}-${index}`,
      createdAt: new Date(),
    }));
  } catch (error) {
    console.error("Failed to generate pipeline insights:", error);
    return [];
  }
}

export async function generateMeetingInsights(
  meetingTranscript: string,
  meetingSummary: string
): Promise<AIInsight[]> {
  const prompt = `Analyze this sales meeting transcript and summary to provide coaching insights.

Summary:
${meetingSummary}

Transcript excerpt:
${meetingTranscript.slice(0, 3000)}

Provide insights in the following JSON format:
{
  "insights": [
    {
      "category": "meeting",
      "title": "Short title",
      "summary": "One sentence summary",
      "details": "Detailed explanation",
      "recommendations": ["Action 1", "Action 2", "Action 3"],
      "severity": "info" | "warning" | "critical"
    }
  ]
}

Focus on:
1. Key topics discussed
2. Customer objections or concerns
3. Competitor mentions
4. Pricing discussions
5. Next steps clarity
6. Areas for improvement

Return only valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return [];
    }

    const parsed = JSON.parse(content.text);
    return parsed.insights.map((insight: Omit<AIInsight, "id" | "createdAt">, index: number) => ({
      ...insight,
      id: `meeting-insight-${Date.now()}-${index}`,
      createdAt: new Date(),
    }));
  } catch (error) {
    console.error("Failed to generate meeting insights:", error);
    return [];
  }
}

export async function generateReportInsight(
  metrics: DailyMetrics,
  section: string
): Promise<string> {
  const prompt = `Based on these sales metrics, provide a brief one-line insight for the "${section}" section of a sales report.

Metrics:
${JSON.stringify(metrics, null, 2)}

Return only the insight text, no formatting. Keep it under 100 characters. Be specific and actionable.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return "";
    }

    return content.text.trim();
  } catch (error) {
    console.error("Failed to generate report insight:", error);
    return "";
  }
}
