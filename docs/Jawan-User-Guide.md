---
title: Jawan Investments — User Guide
author: Jawan Investments Family Office Platform
date: July 2026
version: 2.0
---

# Jawan Investments — Full User Guide

**Family Office Platform · jawan-portal · Version 2.0**

This guide covers every function in the Jawan Investments platform: portfolio management, operations, governance, family office workflows, and administration. What you see depends on your **role** and **permissions**.

### Feature availability legend

| Symbol | Meaning |
|--------|---------|
| **Available** | Full UI — you can use it today |
| **Partial** | Basic registration or data stored; dedicated screens still being built |
| **Planned** | On the roadmap; not yet in the platform |

---

## Table of Contents

**Foundation**

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)

**Portfolio & investments**

3. [Public Markets](#3-public-markets)
4. [PE / VC Portfolio](#4-pe--vc-portfolio)
5. [Fund & LP Investments](#5-fund--lp-investments)
6. [Real Estate](#6-real-estate)
7. [Cash Management](#7-cash-management)
8. [Assets (Portfolio Registry)](#8-assets-portfolio-registry)
9. [Lands](#9-lands)
10. [Cars](#10-cars)
11. [Companies](#11-companies)

**Finance & operations**

12. [Loans](#12-loans)
13. [Cheques](#13-cheques)
14. [Bank Details](#14-bank-details)
15. [Expenses](#15-expenses)

**Governance & people**

16. [Investment Proposals](#16-investment-proposals)
17. [Family, Beneficiaries & Succession](#17-family-beneficiaries--succession)
18. [Contacts](#18-contacts)
19. [Documents (Document Vault)](#19-documents-document-vault)

**Administration**

20. [Reports](#20-reports)
21. [Admin: User Management](#21-admin-user-management)
22. [Admin: Audit Log](#22-admin-audit-log)

**Reference**

23. [Quick Reference by Task](#23-quick-reference-by-task)
24. [Tips & Limitations](#24-tips--limitations)

---

## 1. Getting Started

### Signing In

1. Open the platform URL in your browser.
2. If you are not signed in, you are redirected to **Sign In**.
3. Sign in with the email your administrator invited you with.
4. After sign-in, you land on the **Dashboard**.

### Navigation

- Use the **left sidebar** to move between modules.
- The header shows the current page title and your **user menu** (top right).
- Use the **sidebar toggle** on smaller screens.

### Roles & Permissions

| Role | Typical Access |
|------|----------------|
| **Principal** | Full access to all modules |
| **Signatory** | Read-mostly portfolio; no Expenses or Admin |
| **Finance** | Full Loans, Cheques, Expenses; read portfolio; filtered Documents/Reports |
| **Director** | Filtered portfolio by assigned entities; full Proposals (submit & approve) |
| **External** | Documents only (shared categories — when configured) |
| **Super Admin** | Everything, plus **Users** and **Audit Log** |

**Permission levels:** Full (read + write) · Read (view only) · Filtered (scoped by entity/category) · None

### Entities

Most records belong to an **Entity** (e.g. Jawan Investments). Choose from the dropdown or **Add entity** inline. Filtered users only see assigned entities.

### Common Actions

| Action | How |
|--------|-----|
| Add | Top-right on list pages (write access required) |
| Edit | Pencil icon or Edit button on detail page |
| Delete | Trash icon → confirmation (cheques use soft delete) |
| Upload | File inputs on forms or upload panels on detail pages |

**File types:** PDF, JPG, PNG, WEBP, DOC, DOCX (some modules accept spreadsheets).

---

## 2. Dashboard

**Path:** Sidebar → **Dashboard** · **Available**

### Summary Cards

| Card | What it shows |
|------|----------------|
| Portfolio Value | Active + monitored assets (ownership-adjusted) |
| Net Worth | Portfolio minus active liabilities |
| Active Assets | Count of active holdings |
| Pending Reminders | Documents, vehicles, expenses, cheques needing attention |

### Portfolio Overview

Breakdown by asset class: Real Estate, Private Equity, Public Equity, Bonds, Cash, Fixed Assets, Other.

### Other Panels

- **Modules** — quick links with record counts
- **Recent Exits** — disposals in the last 12 months
- **Pending Proposal Approvals** — items awaiting your decision
- **Reminders** — expiring documents, vehicle/company renewals, loan maturity, cheques due, overdue expenses

---

## 3. Public Markets

**Primary path:** Sidebar → **Assets** (category: **Public Equity**) · **Partial**

Public markets cover listed equities, ETFs, and broker-held positions. The platform tracks these as **Public Equity** assets in the portfolio registry.

### What you can do today

1. Go to **Assets** → **Add Asset**.
2. Set **Category** to **Public Equity**.
3. Enter name (e.g. "US Brokerage Account — Fidelity"), entity, status, currency, acquisition cost, and **Current Value**.
4. Add **Manager Name / Email** for the broker or advisor contact.
5. Save — the holding appears in the Assets list and Dashboard portfolio breakdown.

### Data the platform stores (backend)

Each public-markets asset can hold individual positions with:

| Field | Purpose |
|-------|---------|
| Symbol | Ticker (e.g. AAPL, 2222.SE) |
| Name | Security name |
| Quantity | Shares/units held |
| Cost basis | Original purchase cost |
| Market price | Latest price per share |
| Market value | Position value |
| Unrealised P&L | Gain/loss vs cost basis |
| Broker | Custodian name |
| Account number | Brokerage account ref |
| As-of date | Price date |

Import batches (bulk spreadsheet uploads) are also supported in the data model.

### Planned screens (not yet available)

- Dedicated **Public Markets** module with holdings table per account
- Bulk **import** from broker CSV/Excel
- Automatic roll-up of position values into asset current value
- Performance and allocation reports

### Best practice today

- Register one Public Equity asset per brokerage account or mandate.
- Update **Current Value** manually when you receive statements.
- Store broker statements in **Documents** (category: Banking or Corporate).
- Use **Manager Email** for the relationship manager at the broker.

---

## 4. PE / VC Portfolio

**Paths:** **Assets** (Private Equity) · **Companies** · **Partial**

Private equity and venture capital cover direct company stakes, growth investments, and operating holdings.

### Option A — Register a portfolio company (recommended for operating cos.)

1. Go to **Companies** → **Register Company**.
2. Enter registration details, **owners** (name, ownership %, email, phone), CEO, and management contacts.
3. Upload corporate documents (registration, chamber copy, financials).
4. A linked **Private Equity** portfolio asset is created automatically.
5. Manage valuation via the linked asset's **Current Value** in **Assets**.

### Option B — Register a direct PE/VC investment

1. Go to **Assets** → **Add Asset**.
2. Set **Category** to **Private Equity**.
3. Enter investment name, entity, dates, acquisition cost, current value, and manager/advisor contact.
4. Use **Description** for round details, fund name, or thesis notes.

### PE detail fields (stored; dedicated edit UI planned)

| Field | Purpose |
|-------|---------|
| Shareholding % | Ownership stake |
| Valuation method | e.g. Last round, DCF, NAV |
| Last round valuation | Most recent funding round value |
| Follow-on rounds | Notes on subsequent rounds |
| Registered holder | Legal holder of shares |
| Contact name / email / phone | Founder, GP, or company IR contact |

### Monitoring & exits

- Set status to **Monitor** for watch-list investments.
- Record an **exit** (sale, transfer, liquidation) from the asset or company detail page.
- Approved investments may originate from **Proposals** (see Section 16).

### Planned screens

- PE/VC portfolio dashboard with MOIC, IRR, and round history
- Cap-table style ownership view per company
- Integration with Companies and Proposals on approval

---

## 5. Fund & LP Investments

**Path:** **Assets** (Private Equity or Other) · **Partial**

Fund and limited-partner (LP) investments cover commitments to private funds, co-invest vehicles, and fund-of-funds.

### Register an LP commitment today

1. Go to **Assets** → **Add Asset**.
2. Choose **Private Equity** (primary fund commitments) or **Other** (alternative structures).
3. Name the record clearly, e.g. `"ABC Growth Fund III — LP Commitment"`.
4. Enter:
   - **Acquisition cost** = total commitment amount
   - **Current Value** = latest NAV or called capital + unrealised value
   - **Acquisition date** = commitment / first close date
   - **Manager name/email** = GP or fund administrator contact
5. In **Description**, record: vintage year, commitment, called capital, distributions, DPI/TVPI notes.

### Supporting documents

Upload in **Documents** (category: Legal or Corporate):

- Limited Partnership Agreement (LPA)
- Subscription documents
- Capital call notices
- Quarterly fund reports / K-1s

### Planned LP module

| Planned feature | Description |
|-----------------|-------------|
| Commitment tracking | Committed vs called vs uncalled capital |
| Capital calls | Schedule and log calls with due dates |
| Distributions | Record return of capital and profits |
| NAV updates | Periodic mark-to-market per fund |
| LP register | All fund interests in one view |

Until the dedicated module ships, use **Assets** + **Documents** + **Expenses** (for capital call payments) together.

---

## 6. Real Estate

**Paths:** **Lands** · **Assets** (Real Estate) · **Available** (Lands) · **Partial** (built property assets)

Real estate in Jawan spans **land parcels** (Oman and international) and **built property / development** holdings.

### A. Land parcels — Lands module (full detail)

**Path:** Sidebar → **Lands**

Use for raw land, plots, and titled land with Krooki/Mulkia documentation.

**Register land:** Name, location (Oman: governorate + wilayat; International: country + city), plot/krooki/mulkia refs, land use, area (m²), entity, registered holders, valuation, documents.

**Record a sale:** Sold To, Sale Date, Sale Amount, sale documents (SPA, POA, buyer ID) → marks land and linked asset as **Exited**.

See [Section 9 — Lands](#9-lands) for full field reference.

### B. Built property & developments — Assets (Real Estate)

**Path:** Assets → Add Asset → Category: **Real Estate**

Use for villas, commercial buildings, rental properties, and developments where you track a single asset value rather than parcel-level detail.

| Field | Use |
|-------|-----|
| Name | Property name or address label |
| Current Value | Latest appraisal or market value |
| Acquisition Cost / Date | Purchase basis |
| Manager Name / Email | Property manager or agent |
| Description | Unit count, tenant info, yield notes |

**Detail fields in data model (edit UI planned):** Title deed ref, plot number, BUA (built-up area), location, empty-land flag.

### C. Mortgages linked to property

Register property-backed debt in **Loans** → link to the underlying **Asset** as collateral.

### How real estate rolls up

- **Lands** creates a linked Real Estate (or land) portfolio asset automatically.
- Dashboard **Portfolio Overview** includes Real Estate in the class breakdown.
- Net worth subtracts active **mortgages** on those properties.

### Real estate documents

| Document | Where to store |
|----------|----------------|
| Title deeds, Krooki, Mulkia | Lands module uploads |
| Valuations, leases | Documents vault (Property / Legal) |
| Sale agreements | Land sale workflow or asset exit |

---

## 7. Cash Management

**Paths:** **Bank Details** · **Assets** (Cash) · **Cheques** · **Expenses** · **Available**

Cash management covers liquidity, bank accounts, payments, and cash-position tracking across the family office.

### A. Bank account registry

**Path:** Sidebar → **Bank Details**

Register every family office bank account:

| Field | Required? |
|-------|-----------|
| Account Name | Yes |
| Bank Name | Yes |
| Account Number | Yes |
| Currency | Yes |
| IBAN, SWIFT, Sort Code | No |
| Entity | No |
| Notes | No |

Link **Cheques** to bank accounts when registering outgoing/incoming cheques.

### B. Cash positions as assets

**Path:** Assets → Add Asset → Category: **Cash**

Use for material cash balances held at a bank (separate from the account registry):

- Name = e.g. "HSBC OMR Operating Balance"
- **Current Value** = latest balance
- Description / manager fields for treasury contact

**Data model also stores:** Bank name, account number, balance on the cash detail record (edit UI planned).

### C. Cheque register

**Path:** Sidebar → **Cheques**

Track all issued and received cheques with status workflow: Pending → Deposited → Cleared (or Bounced / Cancelled / Stopped).

Summary cards show pending outgoing/incoming, due this week, and bounced counts.

### D. Expense & payment tracking

**Path:** Sidebar → **Expenses**

Log invoices, recurring costs, and payment status (Paid / Pending / Overdue). Attach invoices and payment slips.

### E. Loan payments

Loan principal and interest payments recorded in **Loans** reduce outstanding balances and affect net worth.

### F. Cash flows on assets

When recording an **asset exit**, check **Record proceeds as cash inflow** to log disposal proceeds against the asset.

**Planned:** Treasury dashboard, multi-currency cash consolidation, FX rate management UI, cash-flow forecasting.

### Cash management workflow (recommended)

1. Register all accounts in **Bank Details**.
2. Register major balances as **Cash** assets (update values monthly).
3. Route all cheque activity through **Cheques**.
4. Route operational spend through **Expenses**.
5. Review **Dashboard** net worth (portfolio minus liabilities).

---

## 8. Assets (Portfolio Registry)

**Path:** Sidebar → **Assets** · **Available**

The Assets module is the central portfolio registry for all asset classes.

### Asset categories

| Category | Typical use |
|----------|-------------|
| Real Estate | Built property, developments |
| Private Equity | Direct stakes, fund LP commitments |
| Public Equity | Listed markets, brokerage accounts |
| Fixed Asset | Vehicles, art, jewelry (also see Cars) |
| Bonds | Fixed income, sukuk |
| Cash | Bank balances, liquidity |
| Other | Alternatives, custom structures |

### List page

**Filters:** All · Active · Exited

**Columns:** Name, Category, Entity, Status, Acquired, Current Value, Updated, Actions

### Register / edit an asset

**Required:** Name, Category, Entity, Status, Currency

**Optional:** Acquisition Date/Cost, Current Value, Description, Manager Name/Email

**Statuses:** Active · Monitor · Deferred · Exited (via exit workflow only)

### Record an exit

| Field | Required? |
|-------|-----------|
| Exit Type | Yes — Sale, Transfer, Liquidation, Write-off, Other |
| Exit Date | Yes |
| Proceeds | Yes for Sale/Liquidation |
| Buyer / Transferee | For Sale/Transfer |
| Record proceeds as cash inflow | Optional checkbox |
| Documents | Sale agreement, transfer deed, closing statement |

**Note:** Land-linked assets must be exited via **Lands** → Record Property Sale.

---

## 9. Lands

**Path:** Sidebar → **Lands** · **Available**

See [Section 6 — Real Estate](#6-real-estate) for context. Full field reference:

### Register land

**Oman — required:** Land Name, Governorate, Wilayat, Entity

**International — required:** Land Name, Country, City, Entity

**Optional:** Village, Krooki/Mulkia/Plot refs, Land Use, Area (m²), GPS, Registered Holders, valuation fields, documents (Krooki, Mulkia, Other).

### Property sale

**Required:** Sold To, Sale Date, Sale Amount. Optional: currency, notes, sale documents.

### Delete

Permanent — removes parcel, documents, and linked asset.

---

## 10. Cars

**Path:** Sidebar → **Cars** · **Available**

Oman vehicle registry (Mulkia). Creates a linked Fixed Asset automatically.

**Required:** Name, Plate Number, Governorate, Wilayat, Entity, Make, Model

**Key optional fields:** Registration/insurance expiry (Dashboard reminders), Mulkia docs, valuation.

**Exit:** Record Exit on vehicle detail page.

---

## 11. Companies

**Path:** Sidebar → **Companies** · **Available**

See [Section 4 — PE/VC Portfolio](#4-pe--vc-portfolio). Creates linked Private Equity asset.

**Required:** Company Name, Registration Number, Entity

**Optional:** Owners, CEO, management contacts, registration expiry, corporate documents.

---

## 12. Loans

**Path:** Sidebar → **Loans** · **Available**

**Required:** Loan Name, Entity, Principal Amount

**Optional:** Type, lender, rate, maturity, payment schedule, collateral asset link, **lender contact** (name/email/phone), documents.

### Record a payment

**Required:** Payment Date, Amount, Payment Method

**Optional:** Principal/interest split, reference, receipt files.

---

## 13. Cheques

**Path:** Sidebar → **Cheques** · **Available**

**Required:** Cheque Number, Entity, Amount, Issue Date, Payee (beneficiary for issued cheques)

**Statuses:** Pending · Deposited · Cleared · Bounced · Cancelled · Stopped

**Delete:** Soft delete (hidden from lists).

---

## 14. Bank Details

**Path:** Sidebar → **Bank Details** · **Available**

Part of cash management — see [Section 7](#7-cash-management). Detail page shows linked cheques.

---

## 15. Expenses

**Path:** Sidebar → **Expenses** · **Available**

**Access:** Principal and Finance only.

**Required:** Title, Amount, Expense Type

**Optional:** Status, due date, entity, recurring flag, attachments (invoice, payment slip, cheque copy).

---

## 16. Investment Proposals

**Path:** Sidebar → **Proposals** · **Available**

Governance workflow for new investments — from idea through committee approval.

### Who can do what

| Action | Who |
|--------|-----|
| View proposals | All roles with Proposals access |
| Create / edit / submit | Principal, Director, Super Admin |
| Approve / reject / return | Assigned approvers |
| Delete | Submitter only, **Draft** status only |

### Proposal lifecycle

```
Draft → Submit → Pending Approval → Approved
                                  → Rejected
                                  → Returned → (edit) → Resubmit → Pending
```

### Create a proposal

**Path:** Proposals → **New Proposal**

| Field | Required? | Notes |
|-------|-----------|-------|
| Investment Name | Yes | |
| Suggested Amount | Yes | |
| Brief About the Investment | Yes | Summary for reviewers |
| Recommendation | Yes | Your investment thesis / recommendation |
| Entity | No | Which entity would invest |
| Currency | No | Default OMR |
| Website | No | Company or fund URL |
| Investment Deck | Yes on submit | PDF or PowerPoint |
| Approvers | Yes on submit | At least one; cannot select yourself |

**Buttons:**

- **Save Draft** — work in progress; no approvers required
- **Submit for Approval** — requires deck + approvers; notifies workflow

### Review a proposal (approvers)

**Path:** Proposals → **Pending My Approval** → open proposal

The **Approvers** panel shows each reviewer and their decision. When it is your turn:

| Decision | Comment |
|----------|---------|
| **Approve** | Optional |
| **Return with Comments** | **Required** — sends back to submitter for revision |
| **Reject** | **Required** |

**Majority rule:** Once more than half of assigned approvers approve → **Approved**. Same for rejections. A single **Return** immediately sets status to **Returned**.

### Proposal detail page

- Investment summary (amount, entity, brief, recommendation, website)
- **Approvers** panel with progress (e.g. "2 of 3 approved")
- **Investment Deck** — open/download
- **Comment thread** — full audit of notes, returns, resubmissions

### After approval

Log the investment in the appropriate portfolio module (PE asset, Fund LP record, Public Equity account, etc.) and store legal documents in the **Document Vault**.

### Filters

All · Mine · Pending My Approval · Approved · Rejected

---

## 17. Family, Beneficiaries & Succession

**Status:** **Planned** — not yet available as a dedicated module

Jawan is designed to extend into family governance. The following capabilities are on the roadmap:

### Planned: Family members

| Feature | Description |
|---------|-------------|
| Member registry | Name, relationship, date of birth, nationality |
| Roles | Principal, beneficiary, dependent, advisor |
| Entity linkage | Which entities each member is associated with |
| Document linkage | IDs, passports, POA stored in vault |

### Planned: Beneficiaries

| Feature | Description |
|---------|-------------|
| Beneficiary register | Named beneficiaries per entity or asset |
| Allocation % | Intended share per beneficiary |
| Asset linkage | Which holdings benefit which family members |
| Trust / foundation mapping | Beneficial interest in structures |

### Planned: Succession & estate

| Feature | Description |
|---------|-------------|
| Estate plan documents | Wills, waqf deeds, trust deeds, letters of wishes |
| Succession timeline | Key dates and trigger events |
| Ownership transfer workflow | Link exits and transfers to succession events |
| Reminders | Document review dates, succession planning milestones |

### What you can do today

| Need | Use today |
|------|-----------|
| Store wills / estate documents | **Documents** vault (Legal category) |
| Track who owns what | **Lands** holders, **Companies** owners, asset **Ownership %** |
| Transfer assets on death/succession | **Record Exit** (Transfer type) on assets |
| Cheque beneficiaries | **Payee** field on issued cheques |
| Platform users (staff/advisors) | **Admin → Users** (not family genealogy) |

---

## 18. Contacts

**Status:** **Partial** — contacts are stored per record; central directory **planned**

### Where contacts live today

| Module | Contact fields |
|--------|----------------|
| **Assets** | Manager name, email, phone (notes) |
| **Loans** | Lender contact name, email, phone |
| **Companies** | CEO, management contact, owner name/email/phone |
| **Lands** | Registered holder name, email, phone |
| **PE investments** | Contact name/email/phone (data model; UI planned) |
| **Proposals** | Submitter and approver users (platform accounts) |
| **Cheques** | Payee (beneficiary) or payer name |

### Planned: Contacts directory

| Feature | Description |
|---------|-------------|
| Central address book | Advisors, lawyers, bankers, GPs, property managers |
| Categories | Legal, Banking, Broker, GP, Property, Family, Other |
| Link to records | Attach contacts to assets, loans, companies, funds |
| Communication log | Notes and meeting history (future) |

### Best practice today

- Enter relationship manager details in **Manager** fields on assets.
- Store adviser agreements and engagement letters in **Documents**.
- Use consistent naming (e.g. `"Ahmed — Bank Muscat RM"`) in manager/contact fields for searchability.

---

## 19. Documents (Document Vault)

**Path:** Sidebar → **Documents** · **Available**

### Upload

| Field | Required? |
|-------|-----------|
| File | Yes |
| Name | Yes |
| Category | Yes — KYC, Legal, Property, Corporate, Tax, Banking, Other |
| Expiry Date | No |
| Entity | No |

### Status

Valid · Expiring Soon · Expired · Pending · Under Review

### Family & estate use

Store wills, LPAs, trust deeds, KYC packs, and adviser contracts here. Set **expiry dates** for documents that need renewal — they appear on the Dashboard reminders.

---

## 20. Reports

**Path:** Sidebar → **Reports** · **Planned**

Placeholder only. Planned reports:

- Net worth statement (by entity, currency, asset class)
- Public markets performance
- PE/VC portfolio summary (MOIC, IRR)
- Fund LP capital account
- Real estate portfolio summary
- Cash and liquidity report
- Expense analysis

---

## 21. Admin: User Management

**Path:** Sidebar → **Users** · **Available** (Super Admin only)

### Invite a user

Email, office role, optional super-admin flag, module overrides, entity access, document category scopes.

### Manage users

Edit access, deactivate/reactivate, cancel pending invitations.

---

## 22. Admin: Audit Log

**Path:** Sidebar → **Audit Log** · **Planned** (UI)

Backend logging is active for create/update/delete across modules. Viewer UI coming soon.

---

## 23. Quick Reference by Task

| I want to… | Go to… |
|------------|--------|
| See portfolio overview | Dashboard |
| Track listed stocks / ETFs | Assets → Public Equity |
| Track a VC/PE company stake | Companies or Assets → Private Equity |
| Track a fund LP commitment | Assets → Private Equity or Other |
| Register Oman land | Lands → Register Land |
| Sell property | Lands → Record Property Sale |
| Track a building / villa | Assets → Real Estate |
| Manage bank accounts | Bank Details |
| Track cash balances | Assets → Cash + Bank Details |
| Issue or track cheques | Cheques |
| Pay invoices / track costs | Expenses |
| Submit investment for approval | Proposals → New Proposal |
| Approve an investment | Proposals → Pending My Approval |
| Store a will or LPA | Documents → Legal |
| Find an adviser's contact | Asset/Loan/Company manager fields |
| Register a vehicle | Cars |
| Track a loan | Loans |
| Invite a user | Admin → Users |

---

## 24. Tips & Limitations

1. **Portfolio classes** — Public Markets, PE/VC, Funds, Real Estate, and Cash all roll up through **Assets** and the **Dashboard** even when dedicated screens are still being built.
2. **Update values** — For Public Equity, PE, and Fund LP records, refresh **Current Value** when you receive statements until automated imports are available.
3. **Linked records** — Lands, Cars, and Companies create portfolio assets; manage exits in the correct module.
4. **Family & contacts** — Use Documents + per-record contact fields until dedicated modules ship.
5. **Proposals** — An approved proposal should be followed by registration in the relevant portfolio module.
6. **Reports & Audit Log** — Coming soon.
7. **Cheque deletes** — Soft delete; most other deletes are permanent.

---

## Appendix — Module implementation status

| Area | Status |
|------|--------|
| Dashboard | Available |
| Public Markets (basic) | Partial |
| PE/VC (Companies + Assets) | Partial |
| Fund LP | Partial |
| Real Estate (Lands + Assets) | Available / Partial |
| Cash Management (Bank + Cheques + Expenses) | Available |
| Assets registry | Available |
| Lands, Cars, Companies | Available |
| Loans, Cheques, Expenses | Available |
| Proposals | Available |
| Documents | Available |
| Family & Succession | Planned |
| Contacts directory | Planned |
| Reports | Planned |
| Audit Log UI | Planned |

---

*Jawan Investments Family Office Platform · User Guide v2.0 · July 2026*
