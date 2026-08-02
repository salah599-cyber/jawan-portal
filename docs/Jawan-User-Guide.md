---
title: Jawan Investments — User Manual
author: Jawan Investments Family Office Platform
date: July 2026
version: 3.0
---

# Jawan Investments — User Manual

**Family Office Platform · Version 3.0 · July 2026**

This manual explains how to use the Jawan Investments family office platform: portfolio tracking, cash and banking, real estate, governance, family & succession, reporting, and administration. What you see in the sidebar depends on your **role**, **entity access**, and **module permissions**.

---

## Table of Contents

**Getting started**

1. [Signing In & Navigation](#1-signing-in--navigation)
2. [Roles & Permissions](#2-roles--permissions)
3. [Entities & Common Actions](#3-entities--common-actions)

**Home & planning**

4. [Dashboard](#4-dashboard)
5. [Assistant](#5-assistant)
6. [Calendar](#6-calendar)

**Portfolio**

7. [Assets (Portfolio Registry)](#7-assets-portfolio-registry)
8. [Public Markets](#8-public-markets)
9. [PE / VC Portfolio](#9-pe--vc-portfolio)
10. [Fund LP Investments](#10-fund-lp-investments)
11. [Exits](#11-exits)
12. [Lands](#12-lands)
13. [Real Estate](#13-real-estate)
14. [Cars](#14-cars)
15. [Companies](#15-companies)
16. [Precious Metals](#16-precious-metals)

**Finance & operations**

17. [Cash Management](#17-cash-management)
18. [Bank Details](#18-bank-details)
19. [Transfer Letters](#19-transfer-letters)
20. [Loans](#20-loans)
21. [Cheques](#21-cheques)
22. [Expenses](#22-expenses)

**Governance & people**

23. [Investment Proposals](#23-investment-proposals)
24. [Documents & Insurance](#24-documents--insurance)
25. [Family Members & Beneficiaries](#25-family-members--beneficiaries)
26. [Succession & Estate](#26-succession--estate)
27. [Contacts](#27-contacts)

**Reporting & admin**

28. [Reports](#28-reports)
29. [Admin: Users](#29-admin-users)
30. [Admin: Download Requests](#30-admin-download-requests)
31. [Admin: Audit Log](#31-admin-audit-log)

**Reference**

32. [Quick Reference by Task](#32-quick-reference-by-task)
33. [Tips & Best Practices](#33-tips--best-practices)

---

## 1. Signing In & Navigation

### Signing in

1. Open the platform URL in your browser.
2. If you are not signed in, you are redirected to **Sign In**.
3. Sign in with the email your administrator invited.
4. After sign-in, you land on the **Dashboard**.

**Invite-only access.** New users need a pending invitation from a Super Admin. Without an invite you are redirected to **Invite Required**. Deactivated accounts cannot sign in.

**Session timeout.** The platform logs you out after **30 minutes of inactivity**. Sign in again to continue.

### Navigation

- Use the **left sidebar** to open modules.
- The header shows the page title and your **user menu** (account settings).
- On smaller screens, use the **sidebar toggle**.
- Nested items (Real Estate, Documents, Family, Admin) expand to show sub-pages.

---

## 2. Roles & Permissions

| Role | Typical access |
|------|----------------|
| **Principal** | Full access to all modules |
| **Signatory** | Read portfolio and operations; full Calendar; no Expenses, Family, Succession, or Admin |
| **Finance** | Full Loans, Cheques, Expenses, Insurance, Cash, Fund LP, Contacts, Real Estate; filtered Documents/Reports; read elsewhere |
| **Director** | Filtered by assigned entities; full Proposals; read Dashboard/Calendar; no Expenses, Family, Succession, or Admin |
| **External** | Documents only (shared categories) |
| **Super Admin** | Flag on a user — full access everywhere, plus Users, Download Requests, and Audit Log |

**Permission levels**

| Level | Meaning |
|-------|---------|
| **FULL** | View and edit |
| **READ** | View only |
| **FILTERED** | Scoped by entity and/or document category |
| **SHARED_ONLY** | Only documents shared with you |
| **NONE** | Module hidden |

Super Admins can set **per-module overrides**, **entity access**, and **document category scopes** when inviting or editing a user.

---

## 3. Entities & Common Actions

### Entities

Most records belong to an **Entity** (for example, *Jawan Investments*). Choose the entity from the dropdown or add one inline where available. Users with filtered access only see assigned entities.

Values across the platform commonly consolidate to **OMR** for net worth and board reporting.

### Common actions

| Action | How |
|--------|-----|
| Add / Register | Top-right button on list pages (write access required) |
| Edit | Pencil icon or **Edit** on the detail page |
| Delete | Trash icon → confirmation (cheques use soft delete) |
| Upload | File inputs on forms or upload panels on detail pages |
| Filter | Filter controls above lists and tables |
| Export | Report or module export buttons (XLSX / CSV / print) |

**Accepted file types (typical):** PDF, JPG, PNG, WEBP, DOC, DOCX. Some modules also accept spreadsheets (XLSX / CSV).

---

## 4. Dashboard

**Path:** Sidebar → **Dashboard**

Your home view of family-office wealth and reminders.

### Summary cards

| Card | What it shows |
|------|----------------|
| Portfolio Value | Active and monitored assets (ownership-adjusted) |
| Net Worth | Portfolio minus active liabilities |
| Active Assets | Count of active holdings |
| Pending Reminders | Items needing attention across modules |

### Other panels

- **Performance** — valuation-based movement
- **Asset & currency allocation** — charts by class and currency
- **Exit analytics** — recent disposals and outcomes
- **Net worth trend** — historical view
- **Module shortcuts** — quick links with record counts
- **Pending proposal approvals** — items awaiting your decision
- **Reminders** — documents, vehicles, loans, cheques, expenses, insurance, family IDs, succession reviews

---

## 5. Assistant

**Path:** Sidebar → **Assistant**

A private AI assistant for Jawan Investments. Ask questions about portfolio data, holdings, cash, and related records you are permitted to see. Treat answers as decision support — always verify material figures in the source module or a report before acting.

---

## 6. Calendar

**Path:** Sidebar → **Calendar** · Tasks: **Calendar → Tasks** (`/calendar/tasks`)

Unified deadlines from across the platform, plus manual tasks.

### Views

Today · Week · Month · List

### What appears

- Document and insurance expiry dates
- Vehicle registration / insurance renewals
- Loan maturities and cheque due dates
- Expense due dates
- Family ID / passport renewals
- Succession review dates
- Manual tasks you create and assign

Create tasks from the calendar, assign owners, and manage them under **Calendar → Tasks**. Reminder digests may also be sent by email when configured.

---

## 7. Assets (Portfolio Registry)

**Path:** Sidebar → **Assets**

Central registry for all asset classes. Dedicated modules (Public Markets, PE, Fund LP, Real Estate, Cash) roll values into this registry and the Dashboard.

### Categories

| Category | Typical use |
|----------|-------------|
| Real Estate | Built property, developments |
| Private Equity | Direct PE/VC stakes |
| Public Equity | Listed markets and brokerage holdings |
| Fixed Asset | Vehicles and other fixed assets |
| Bonds | Fixed income, sukuk |
| Cash | Bank balances and liquidity |
| Precious Metals | Gold, silver, and related holdings |
| Other | Alternatives and custom structures |

### List filters

All · Active · Exited

### Register or edit an asset

**Required:** Name, Category, Entity, Status, Currency

**Optional:** Acquisition date/cost, current value, description, manager name/email, ownership %

**Statuses:** Active · Monitor · Deferred · Exited (via exit workflow)

### Record an exit (from an asset)

| Field | Notes |
|-------|-------|
| Exit Type | Sale, Transfer, Liquidation, Write-off, Other |
| Exit Date | Required |
| Proceeds | Required for Sale / Liquidation |
| Buyer / Transferee | For Sale / Transfer |
| Record proceeds as cash inflow | Optional |
| Documents | Sale agreement, deed, closing statement |

**Note:** Land-linked assets must be exited via **Lands → Record Property Sale**.

---

## 8. Public Markets

**Path:** Sidebar → **Public Markets**

Track listed equities, bonds, options, structured notes, and crypto across markets.

### Markets

MSX · GCC (UAE, SA, KW, BH, QA) · USA · HK · China · India · UK · Other · All

### What you can do

1. Open **Public Markets** and filter by entity, market, private vs managed portfolios, and management type.
2. Add holdings manually or import from broker / consolidated portfolio templates.
3. Download upload templates, then import spreadsheets.
4. Link **broker accounts** and **managed portfolios**.
5. Refresh prices (including crypto where supported).
6. Export holdings.

Position values roll into the **Public Equity** total on the Dashboard and in reports.

### Best practice

- Keep one broker account / managed portfolio per mandate.
- Use the provided templates for imports to avoid duplicate rows.
- Refresh prices after material market moves or before board packs.

---

## 9. PE / VC Portfolio

**Path:** Sidebar → **PE / VC Portfolio**

Direct private equity and venture holdings.

### List & summary

Summary cards show invested capital, fair value, and portfolio **MOIC / IRR**. Filter by entity. Add companies from **New**.

### Company hub tabs

| Tab | Purpose |
|-----|---------|
| Overview | Thesis, stage, status, key metrics |
| Investments | Cost basis and round history |
| Cap Table | Ownership and share classes |
| Valuations | Fair value marks over time |
| Distributions | Cash returned |
| Exit | Exit planning and outcomes |
| Contacts | Founders, GPs, IR |
| Governance | Board / observer notes |
| Monitoring | Reports and KPIs |
| Documents | Deal docs and packs |

A linked **Assets** record is maintained for portfolio roll-up. You can also register operating companies under **Companies** when corporate registry detail is the primary need.

---

## 10. Fund LP Investments

**Path:** Sidebar → **Fund LP Investments**

Limited-partner commitments to buyout, venture, growth, and similar funds.

### What you can do

1. Add a fund commitment (vintage, GP, strategy, commitment amount, currency, entity).
2. Log **capital calls** and **distributions**.
3. Enter periodic **NAV updates**.
4. Store fund documents (LPA, subscription, reports).

### Detail tabs

Overview · Capital Calls · Distributions · NAV Updates · Fund Details · Documents

### Key metrics

Paid-in · NAV · Unfunded · **DPI / RVPI / TVPI** · **IRR**

---

## 11. Exits

**Path:** Sidebar → **Exits**

Cross-module view of realized exits from assets, PE, and real estate. Use it to review proceeds, buyers, dates, and documents after disposals have been recorded in their source modules.

---

## 12. Lands

**Path:** Sidebar → **Lands**

Land parcels in Oman and internationally. Creates a linked portfolio asset automatically.

### Register land

**Oman — required:** Land name, Governorate, Wilayat, Entity

**International — required:** Land name, Country, City, Entity

**Optional:** Village, Krooki / Mulkia / plot refs, land use, area (m²), GPS, registered holders, valuation, documents (Krooki, Mulkia, Other)

### Record a property sale

**Required:** Sold To, Sale Date, Sale Amount

Optional currency, notes, and sale documents (SPA, POA, buyer ID). Completing a sale marks the land and linked asset as **Exited**.

### Delete

Permanent — removes the parcel, documents, and linked asset.

---

## 13. Real Estate

**Paths:**

- **Investment Portfolio** → `/real-estate`
- **Private Real Estate** → `/real-estate/private`
- **Rent Dashboard** → `/real-estate/rent`

### A. Investment Portfolio

Buildings and units held as investments.

**Property tabs:** Overview · Units · Rent · Leases · Maintenance · Utilities · Financials · Documents

Use the rent dashboard for collection status, occupancy, and PDCs linked to units and leases.

### B. Private Real Estate (family villas)

Family-use properties with running costs and staff.

**Tabs:** Overview · Physical · Running Costs · Staff · Financials · Documents · Succession

### C. Mortgages

Register property-backed debt in **Loans** and link the underlying asset as collateral.

---

## 14. Cars

**Path:** Sidebar → **Cars**

Oman vehicle registry (Mulkia). Creates a linked **Fixed Asset** automatically.

**Required:** Name, plate number, governorate, wilayat, entity, make, model

**Key optional fields:** Registration / insurance expiry (feed Dashboard and Calendar reminders), Mulkia documents, valuation

**Exit:** Record Exit on the vehicle detail page.

---

## 15. Companies

**Path:** Sidebar → **Companies**

Corporate registry for portfolio and operating companies. Creates a linked Private Equity asset when appropriate.

**Required:** Company name, registration number, entity

**Optional:** Owners (name, ownership %, email, phone), CEO, management contacts, registration expiry, corporate documents

---

## 16. Precious Metals

**Path:** Sidebar → **Assets** (category **Precious Metals**)

Gold, silver, and similar holdings. Units may include gram, tola, kilogram, and ounce. Price basis can use OMR buy/sell or USD spot. Use **Refresh prices** on the Assets list or detail page when available.

---

## 17. Cash Management

**Path:** Sidebar → **Cash Management**

Operational cash positions (distinct from the Bank Details registry).

### What you can do

1. Add cash-position accounts (bank, entity, currency, balance).
2. View summaries by bank, entity, and currency.
3. Upload PDF bank statements to extract closing balances.
4. Review import history and **stale balances** (30+ days without update).
5. See FX conversion toward OMR consolidation.

**Tip:** Keep reference account numbers and SWIFT/IBAN in **Bank Details**. Use **Cash Management** for balances that feed net worth and cash reports.

---

## 18. Bank Details

**Path:** Sidebar → **Bank Details**

Registry of family-office bank accounts used for cheques, transfer letters, and reference data.

| Field | Required? |
|-------|-----------|
| Account name | Yes |
| Bank name | Yes |
| Account number | Yes |
| Currency | Yes |
| IBAN, SWIFT, sort code | No |
| Entity | No |
| Notes | No |

USA and other regional account variants are supported where configured. The detail page shows linked cheques and related activity.

---

## 19. Transfer Letters

**Path:** Sidebar → **Transfer Letters**

Generate and track wire / transfer instruction letters.

### Types

Local · International · UK · US

### Workflow

1. Create a new letter and choose the transfer type.
2. Select source and beneficiary banks from **Bank Details**.
3. Enter amount (amount-in-words is generated), purpose, and correspondent bank details when required.
4. Preview / print the letter.
5. Track status: **Pending** ↔ **Complete**.
6. Serial numbers are assigned for auditability.

---

## 20. Loans

**Path:** Sidebar → **Loans**

Register borrowings and track outstanding principal and interest.

**Required:** Loan name, entity, principal amount

**Optional:** Type, lender, rate, payment frequency, maturity, collateral asset link, lender contact, documents

### Record a payment

**Required:** Payment date, amount, payment method

**Optional:** Principal / interest split, reference, receipt files

Active loans reduce **net worth** on the Dashboard.

---

## 21. Cheques

**Path:** Sidebar → **Cheques**

Track issued and received cheques.

**Required:** Cheque number, entity, amount, issue date, payee (for issued cheques)

**Statuses:** Pending · Deposited · Cleared · Bounced · Cancelled · Stopped

Summary cards highlight pending outgoing/incoming, due this week, and bounced items. Deletes are **soft deletes** (hidden from lists).

---

## 22. Expenses

**Path:** Sidebar → **Expenses**

**Access:** typically Principal and Finance (and Super Admin).

**Required:** Title, amount, expense type

**Optional:** Status (Paid / Pending / Overdue), due date, entity, recurring flag, attachments (invoice, payment slip, cheque copy)

Due and overdue expenses appear on the Dashboard and Calendar.

---

## 23. Investment Proposals

**Path:** Sidebar → **Proposals**

Governance workflow for new investments — from idea through approval.

### Who can do what

| Action | Who |
|--------|-----|
| View | Users with Proposals access |
| Create / edit / submit | Principal, Director, Super Admin (and others with write access) |
| Approve / reject / return | Assigned approvers |
| Delete | Submitter only, **Draft** status only |

### Lifecycle

```
Draft → Submit → Pending Approval → Approved
                                  → Rejected
                                  → Returned → edit → Resubmit → Pending
```

### Create a proposal

**Path:** Proposals → **New Proposal**

| Field | On submit |
|-------|-----------|
| Investment name | Required |
| Suggested amount | Required |
| Brief about the investment | Required |
| Recommendation | Required |
| Entity / currency / website | Optional |
| Investment deck (PDF / PPT) | Required |
| Approvers | At least one; cannot select yourself |

**Save Draft** keeps work in progress. **Submit for Approval** starts the review workflow.

### Review (approvers)

| Decision | Comment |
|----------|---------|
| **Approve** | Optional |
| **Return with Comments** | Required — sends back for revision |
| **Reject** | Required |

**Majority rule:** Once more than half of assigned approvers approve → **Approved**. Same for rejections. A single **Return** sets status to **Returned**.

### After approval

Register the investment in the correct portfolio module (PE, Fund LP, Public Markets, Real Estate, etc.) and store legal documents in the **Document Vault**.

**Filters:** All · Mine · Pending My Approval · Approved · Rejected

---

## 24. Documents & Insurance

### Document Vault

**Path:** Sidebar → **Documents → Document Vault**

| Field | Required? |
|-------|-----------|
| File | Yes |
| Name | Yes |
| Category | Yes — KYC, Legal, Property, Corporate, Tax, Banking, Other |
| Expiry date | No |
| Entity | No |

**Statuses:** Valid · Expiring Soon · Expired · Pending · Under Review

Restricted files may require a **download request** that Super Admins approve under Admin → Download Requests.

### Insurance Register

**Path:** Sidebar → **Documents → Insurance Register**

Register policies: Property · Vehicle · Life · Health · Business · Other

**Statuses:** Active · Pending Renewal · Expired · Cancelled

Track premiums, frequency, and policy documents. Expiry dates feed **Calendar** and **Dashboard** reminders.

---

## 25. Family Members & Beneficiaries

**Path:** Sidebar → **Family → Members & Beneficiaries**

Family register for the office.

### What you can track

- Relationships (Head of Family, Spouse, Son/Daughter, and other relations)
- KYC details and nationality
- IDs (Omani ID, passport, residence) with expiry dates
- Ownership stakes in entities / holdings
- Signatory roles
- Beneficiary designations
- Supporting documents

ID renewals appear on the Calendar and Dashboard when expiry dates are set.

---

## 26. Succession & Estate

**Path:** Sidebar → **Family → Succession & Estate**

Estate and succession plans (with on-screen disclaimer).

### Plan statuses

Draft · In Progress · Review Due · Complete

### Plan tabs

| Tab | Purpose |
|-----|---------|
| Overview | Plan summary and status |
| Distribution | Beneficiaries mapped to assets, lands, companies, real estate, vehicles |
| Legal Documents | Will, trust, letter of wishes, POA, and related uploads |
| Executors & Trustees | Executor, trustee, guardian, POA agent appointments |
| Checklist | Progress toward completeness |
| Review Schedule | Next review dates (Calendar reminders) |

---

## 27. Contacts

**Path:** Sidebar → **Contacts**

Central directory of external relationships.

**Types:** Banker · Lawyer · Fund Manager · Broker · Tenant · Contractor · Co-Investor · Government · Advisor · Other

Filter by entity or global contacts, follow-up due dates, and active status. Many modules also keep inline contact fields (managers, lenders, owners) — use the directory for people you reuse across records.

---

## 28. Reports

**Path:** Sidebar → **Reports**

Report library with entity and date filters. Export to **XLSX**, **CSV**, or **print / PDF**.

### Featured: Monthly Board Pack

Executive scorecard covering net worth, allocation, valuation-based MTD/YTD performance, PE MOIC/IRR, LP DPI/RVPI/TVPI/IRR, and cash. Scheduled email delivery can run on the **1st of each month** for users with Reports access (when email is configured).

### Report catalog (selected)

| Category | Reports |
|----------|---------|
| Balance sheet | Net Worth Statement · Consolidated Net Worth (OMR) · Asset Register · Asset Allocation · Liability & Loan Schedule · Valuation History |
| Cash | Cash & Bank Balances · Cash Position · Bank Accounts |
| Portfolio | Public Equity Holdings · PE / VC Portfolio Summary · Fund LP Portfolio Summary · Portfolio Performance · Dividend & Distribution Income · Total Portfolio Income · Realized Exits · Exit Analytics |
| Operations | Cheque Register · Expense Summary · Investment Proposal Pipeline |
| Registers | Land Portfolio · Vehicle Fleet · Registered Companies · Document Expiry · Insurance Register · Family Register · Succession Plan Status · Contacts Directory |
| Real estate | Property Portfolio · Rental Income · Rent Collection Register · Active Lease Register · Property Expense Summary · Property Valuation History |

---

## 29. Admin: Users

**Path:** Sidebar → **Admin → Users** · **Super Admin only**

### Invite a user

1. Enter email and office **role**.
2. Optionally flag **Super Admin**.
3. Set module overrides, entity access, and document category scopes.
4. Send the invitation — the user completes sign-up via the invite link.

### Manage users

Edit access, deactivate / reactivate, and cancel pending invitations.

---

## 30. Admin: Download Requests

**Path:** Sidebar → **Admin → Download Requests** · **Super Admin only**

Review and approve or deny requests to download restricted documents from the Document Vault.

---

## 31. Admin: Audit Log

**Path:** Sidebar → **Admin → Audit Log** · **Super Admin only**

Filterable event log of create / update / delete activity across modules for governance and troubleshooting.

---

## 32. Quick Reference by Task

| I want to… | Go to… |
|------------|--------|
| See portfolio overview | Dashboard |
| Ask a question about holdings | Assistant |
| See upcoming deadlines | Calendar |
| Track listed stocks / ETFs / crypto | Public Markets |
| Track a PE / VC company | PE / VC Portfolio |
| Track a fund LP commitment | Fund LP Investments |
| Review realized exits | Exits |
| Register Oman land | Lands → Register Land |
| Sell a land parcel | Lands → Record Property Sale |
| Manage rental buildings | Real Estate → Investment Portfolio |
| Track a family villa | Real Estate → Private Real Estate |
| Register a vehicle | Cars |
| Register a company | Companies |
| Track gold / silver | Assets → Precious Metals |
| Update cash balances | Cash Management |
| Register bank account details | Bank Details |
| Prepare a wire letter | Transfer Letters |
| Track a loan | Loans |
| Issue or track cheques | Cheques |
| Pay invoices / track costs | Expenses |
| Submit an investment for approval | Proposals → New Proposal |
| Approve an investment | Proposals → Pending My Approval |
| Store a will or LPA | Documents → Document Vault (Legal) |
| Track insurance policies | Documents → Insurance Register |
| Register family members | Family → Members & Beneficiaries |
| Plan succession | Family → Succession & Estate |
| Find an adviser | Contacts |
| Run the board pack | Reports → Monthly Board Pack |
| Invite a colleague | Admin → Users |

---

## 33. Tips & Best Practices

1. **Update values before board packs** — refresh Public Markets prices, PE valuations, Fund LP NAVs, and cash balances so Dashboard and Reports stay accurate.
2. **Use the right module** — prefer dedicated modules (Public Markets, PE, Fund LP, Real Estate, Cash) over generic Assets when available; Assets remains the registry and roll-up layer.
3. **Linked records** — Lands, Cars, and Companies create portfolio assets; exit them from the correct source module.
4. **Bank Details vs Cash** — Bank Details holds account identity; Cash Management holds balances that feed net worth.
5. **Proposals after approval** — always register the approved investment in the relevant portfolio module and file legal docs in the vault.
6. **Expiry dates matter** — set them on documents, insurance, vehicles, family IDs, and succession reviews so Calendar and Dashboard reminders work.
7. **Entity discipline** — assign the correct entity on every record so filtered users and consolidated reports stay correct.
8. **Cheque deletes** — soft delete only; most other deletes are permanent.
9. **Permissions** — if a module is missing from your sidebar, ask a Super Admin to adjust your role, overrides, or entity access.
10. **Security** — the session ends after 30 minutes of inactivity; never share invite links or credentials.

---

*Jawan Investments Family Office Platform · User Manual v3.0 · July 2026*
