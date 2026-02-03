# Sales Team OS — Technical Brief (Alpha)

## Objective

Ship a live, web-based **Sales Team Operating System** where reps can:

- Understand whether they are executing a *good day* vs a *great day*
- Review meetings, outcomes, and activity as a daily ledger
- See performance against a configurable **Magic Formula**
- Discover, clone, and improve winning campaigns via AI insights
- Receive daily guidance on *what to do today* based on real performance

This is an **execution and coaching OS**, not a BI tool or reporting warehouse.

---

## Priority #1: Licenses, Seats & User Accounts (Foundational)

### Purpose
Seats define **who is evaluated, benchmarked, coached by AI, and included in team metrics**.

Auth alone is insufficient — seat semantics must be explicit.

---

### Core Concepts

#### User Account
- Authentication + identity
- Can exist without a seat

#### Seat (License)
- Grants participation in the Sales Team OS
- Exactly one seat per rep or manager
- Determines:
  - Whether activity is tracked
  - Whether performance is evaluated
  - Whether AI coaching is generated

#### Role
- Controls visibility and edit permissions

---

### Seat Types

#### Rep Seat (Default)
A **Rep Seat** represents a salesperson whose execution is evaluated.

Capabilities:
- Activity tracked (emails, dials, meetings, campaigns)
- Magic Formula evaluated
- Active Days and Ideal Days computed
- Receives AI coaching and recommendations
- Can view:
  - Own performance
  - Campaign performance
  - AI insights
  - Anonymized peer comparisons

Restrictions:
- Cannot edit other reps’ targets
- Cannot see named peer performance

This is the **unit of truth** for Heat Maps, benchmarks, and AI insights.

---

#### Manager Seat
A **Manager Seat** represents a non-selling leader.

Capabilities:
- View all reps (named)
- View team heat maps
- Adjust Magic Formula targets
- Create report templates
- View aggregated AI insights

Restrictions:
- No Ideal Days computed
- Not included in benchmarks
- Does not receive rep-style daily coaching

---

### Seat States

Each seat has a lifecycle state:
- `active`
- `paused` (PTO, ramp, leave)
- `inactive` (former rep)

Only **active Rep Seats**:
- Appear in heat maps
- Count toward benchmarks
- Generate AI insights

Paused/inactive seats retain historical data but are excluded from comparisons.

---

## Core Concepts (Behavioral)

### Active Day
A calendar day where **any** sales activity occurred.

### Ideal Day (Critical Concept)
A calendar day where **expected execution + performance quality** are met.

An Ideal Day requires:
- ≥ **800 outbound emails**
- ≥ **30 dials**
- **Magic Formula attainment ≥ threshold**

The system must explicitly distinguish:
- Inactive Day
- Active Day
- Ideal Day

This distinction powers coaching, heat maps, AI insights, and reports.

---

## 2. Authentication & Deployment

### Requirements
- App is deployed online (not localhost)
- Users authenticate via User Account
- Data is scoped by Seat + Role

Auth can be basic (email/password or magic link).

---

## 3. Rep Activity Tracking & Heat Map

### Purpose
Make **effort and execution visible** and remove ambiguity from coaching.

---

### Activity Inputs (`/activity`)
Source-of-truth metrics:
- Emails sent
- Dials made
- Calls connected
- Meetings held
- Sequence activity

Only **active Rep Seats** generate activity.

---

### Daily Computation (Per Rep Seat, Per Day)

Compute a daily fact record:
- emails_sent
- dials_made
- meetings_held
- qualified_opps
- conversions
- revenue
- magic_formula_attainment
- is_active_day
- is_ideal_day

---

### Ideal Day Logic (v1)

A day is **Ideal** if:
- emails_sent ≥ 800
- dials_made ≥ 30
- magic_formula_attainment ≥ threshold (e.g. 80%)

Magic Formula attainment is derived from:
- meetings vs target
- qualified opps vs target
- conversions vs target
- revenue vs target

---

### Heat Map UI
- Calendar heat map (last 30 days)
- Rows = active Rep Seats
- Columns = days

States:
- Inactive
- Active
- Ideal

Aggregates:
- Active Days (week / month)
- Ideal Days (week / month)
- Ideal Day %

Comparisons:
- Rank vs peers
- Percentile vs team

This is the **primary coaching surface**.

---

## 4. Meetings Ledger (`/meetings`)

### Purpose
Provide a **daily outcomes ledger** for reps and managers.

### Functionality
- List meetings by rep & date
- Show:
  - meeting type
  - contact
  - lead source
  - outcome
  - host
  - (future) recording / coaching tags

### Metrics (v1)
- Meetings scheduled
- Meetings held
- Show rate
- Average duration
- # of Grain-recorded calls

Meetings should be joinable to:
- pipeline outcomes
- campaign source (when possible)

---

## 5. Magic Formula (`/magic-formula`)

### Purpose
Serve as the **daily performance scorecard**.

### Default Formula (Configurable)
- 5 meetings per day
- 3 qualified opportunities per day
- 2 conversions per day
- $300 MRR per conversion

### Functionality
- View performance daily / weekly / monthly
- Edit global or per-seat targets
- Instantly recompute attainment

### Output
- Actuals vs targets
- Attainment %
- Status:
  - Strong momentum
  - At baseline
  - At risk

Feeds Ideal Day logic and AI insights.

---

## 6. Campaign Performance (`/campaigns`)

### Rep Needs
- See what is currently running
- Understand what is working *right now*
- Create new campaigns without starting from zero

### Metrics (Directional, v1)
- Enrolled
- Replies
- Meetings
- Deals created
- Deals won
- Revenue
- Time window (7 / 14 / 30 days)

Perfect attribution is not required.

Campaigns are owned by **Rep Seats**.

---

## 7. Campaign AI Insights (Key Feature)

### Goal
Reduce manager dependency by surfacing **replicable campaign wins**.

### Functionality
- Analyze recent campaign performance
- Identify top performers by:
  - industry / audience
  - copy theme
  - offer positioning
  - recent revenue or meeting creation
- Generate grounded, proof-based recommendations

### Example Output

**What’s working right now**

John has been running campaigns targeting **bookkeepers** using copy focused on  
“getting in front of ideal customers inside trusted local communities.”

This campaign has generated **$40k in the last 14 days**.

**Suggested version you could try:**  
“Own the top-of-mind position for bookkeepers in your local business community — no competitors, no distractions.”

CTAs:
- Copy campaign
- Clone & edit
- Add to my queue today

---

## 8. AI Daily Coach (`/ai-insights`)

### Purpose
Tell reps **exactly how to win today**.

### Inputs
- Recent Active vs Ideal Days
- Magic Formula trends
- Recent revenue or momentum spikes
- Current campaign performance

### Outputs
- 2–3 concrete actions for today
- 1 campaign recommendation to clone or adapt
- (future) coaching moments from calls

Only **Rep Seats** receive daily coaching.
Managers see aggregated insights.

---

## 9. Reports (`/reports`)

### Purpose
Generate shareable, templated sales reports.

### Current State
- One report template exists

### Target State
- Create report templates (rep or manager scoped)
- Templates define:
  - required metrics
  - date range
  - sections
- Output as markdown / shareable text

---

## Non-Goals (Explicit)

- Perfect historical backfill
- Slack integration (future)
- Complex permissions
- Exec-grade BI dashboards
- Fully customizable dashboard (future)

---

## Definition of “Shipped”

- App is live online
- Users authenticate via User Accounts
- Seats are assigned and enforced
- Each **active Rep Seat** can see:
  - Activity & Ideal Day heat map with peer comparison
  - Meetings ledger
  - Campaign performance
  - Magic Formula performance
  - AI insights with actionable recommendations

If it loads, reflects reality, and changes rep behavior — it’s shipped.
