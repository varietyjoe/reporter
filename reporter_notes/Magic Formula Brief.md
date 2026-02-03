# Magic Formula (Magic Equation) — MVP Brief

## Goal

Build a **simple, opinionated KPI calculator** that shows whether a salesperson (or team) is hitting daily activity and revenue goals.

This is **only** the Magic Formula logic.

- No Grain integration
    
- No meeting recordings
    
- No AI insights
    
- No advanced configuration
    

This should be fast to build and easy to reason about.

---

## What the Magic Formula Is

For a given **day** and **scope** (individual or team), calculate:

- Meetings Held vs Target
    
- Qualified Opportunities vs Target
    
- Conversions vs Target
    
- Revenue vs Target Revenue
    

If all targets are met → the day is a success.

---

## Default Targets (Global)

These apply unless overridden:

- 5 meetings per day
    
- 3 qualified opportunities per day
    
- 2 conversions per day
    
- $300 MRR per conversion
    

---

## Metric Definitions (Very Simple)

- **Meeting Held**: a meeting that was completed
    
- **Qualified Opportunity**: a completed meeting marked as qualified
    
- **Conversion**: a completed meeting marked as deal won
    
- **Revenue**: sum of MRR from conversions
    

No edge cases, no exclusions, no special rules in MVP.

---

## Target Hierarchy

Targets resolve in this order:

1. Individual target (if set)
    
2. Team target (if set)
    
3. Global default
    

Most specific target always wins.

---

## Output (What the System Returns)

For a given day:

- Actual counts for each metric
    
- Target for each metric
    
- Percent to goal for each metric
    
- Revenue target for the day
    
- Boolean: `all_goals_met`
    

---

## Time Scope

- Today (default)
    
- Any single past day
    
- Simple day-by-day history
    

---

## Explicitly Out of Scope

- Grain or calendar integrations
    
- Meeting transcripts or recordings
    
- AI analysis or recommendations
    
- Forecasting or projections
    
- Leaderboards or gamification
    

---

## Definition of Done

- You can ask: “Did I / my team hit the Magic Formula today?”
    
- The answer is unambiguous, fast, and correct
    
- The logic is easy to extend later