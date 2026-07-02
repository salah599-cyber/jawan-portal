export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  REAL_ESTATE: "Real Estate",
  PRIVATE_EQUITY: "Private Equity",
  PUBLIC_EQUITY: "Public Equity",
  FIXED_ASSET: "Fixed Asset",
  BONDS: "Bonds",
  CASH: "Cash",
  OTHER: "Other",
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MONITOR: "Monitor",
  EXITED: "Exited",
  DEFERRED: "Deferred",
};

export const EDITABLE_ASSET_STATUS_ENTRIES = Object.entries(ASSET_STATUS_LABELS).filter(
  ([value]) => value !== "EXITED",
);

export const EXIT_TYPE_LABELS: Record<string, string> = {
  SALE: "Sale",
  TRANSFER: "Transfer",
  LIQUIDATION: "Liquidation",
  WRITE_OFF: "Write-off",
  OTHER: "Other",
};

export const ASSET_EXIT_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SALE_AGREEMENT: "Sale Agreement",
  TRANSFER_DEED: "Transfer Deed",
  CLOSING_STATEMENT: "Closing Statement",
  OTHER: "Other",
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  KYC: "KYC",
  LEGAL: "Legal",
  PROPERTY: "Property",
  CORPORATE: "Corporate",
  TAX: "Tax",
  BANKING: "Banking",
  OTHER: "Other",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  VALID: "Valid",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Expired",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  OVERDUE: "Overdue",
};

export const EXPENSE_CATEGORY_OPTIONS = [
  "Operations",
  "Property",
  "Legal",
  "Tax",
  "Insurance",
  "Utilities",
  "Professional Fees",
  "Other",
] as const;

export const EXPENSE_ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  PAYMENT_SLIP: "Payment Slip",
  CHEQUE_COPY: "Cheque Copy",
  OTHER: "Other",
};

export const LAND_USE_LABELS: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  AGRICULTURAL: "Agricultural",
  INDUSTRIAL: "Industrial",
  MIXED: "Mixed Use",
  OTHER: "Other",
};

export const LAND_LOCATION_TYPE_LABELS: Record<string, string> = {
  OMAN: "Oman",
  INTERNATIONAL: "Outside Oman",
};

export const LAND_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  KROOKI: "Krooki",
  MULKIA: "Mulkia",
  OTHER: "Other",
};

export const LAND_SALE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  POWER_OF_ATTORNEY: "Power of Attorney",
  SPA: "Sale & Purchase Agreement (SPA)",
  BUYER_ID: "Buyer ID",
  OTHER: "Other",
};

export const VEHICLE_CLASS_LABELS: Record<string, string> = {
  PRIVATE: "Private",
  COMMERCIAL: "Commercial",
  GOVERNMENT: "Government",
  DIPLOMATIC: "Diplomatic",
  OTHER: "Other",
};

export const VEHICLE_BODY_TYPE_LABELS: Record<string, string> = {
  SALOON: "Saloon",
  SUV: "SUV / 4WD",
  PICKUP: "Pickup",
  COUPE: "Coupe",
  VAN: "Van",
  MOTORCYCLE: "Motorcycle",
  OTHER: "Other",
};

export const VEHICLE_FUEL_TYPE_LABELS: Record<string, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  ELECTRIC: "Electric",
  HYBRID: "Hybrid",
  OTHER: "Other",
};

export const VEHICLE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  MULKIA: "Motor Vehicle License (Mulkia)",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

export const COMPANY_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  REGISTRATION_COPY: "Registration Copy",
  CHAMBER_COPY: "Chamber of Commerce Copy",
  FINANCIALS: "Financial Statements",
  OTHER: "Other",
};

export const LIABILITY_TYPE_LABELS: Record<string, string> = {
  MORTGAGE: "Mortgage",
  LOAN: "Term Loan",
  CREDIT: "Credit Facility",
  OTHER: "Other",
};

export const LIABILITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PAID_OFF: "Paid Off",
  DEFAULTED: "Defaulted",
};

export const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-Annual",
  ANNUAL: "Annual",
  BULLET: "Bullet (lump sum)",
  OTHER: "Other",
};

export const LOAN_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  LOAN_AGREEMENT: "Loan Agreement",
  PAYMENT_SCHEDULE: "Payment Schedule",
  STATEMENT: "Statement",
  OTHER: "Other",
};

export const LOAN_PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  DIRECT_DEBIT: "Direct Debit",
  OTHER: "Other",
};

export const CHEQUE_DIRECTION_LABELS: Record<string, string> = {
  ISSUED: "Issued (outgoing)",
  RECEIVED: "Received (incoming)",
};

export const CHEQUE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  DEPOSITED: "Deposited",
  CLEARED: "Cleared",
  BOUNCED: "Bounced",
  CANCELLED: "Cancelled",
  STOPPED: "Stop Payment",
};

export const CHEQUE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CHEQUE_COPY: "Cheque Copy",
  DEPOSIT_SLIP: "Deposit Slip",
  BANK_CONFIRMATION: "Bank Confirmation",
  OTHER: "Other",
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  RETURNED: "Returned",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const PROPOSAL_DECISION_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
};

export const PROPOSAL_COMMENT_KIND_LABELS: Record<string, string> = {
  NOTE: "Note",
  RETURN: "Return",
  REJECT: "Reject",
  APPROVE: "Approve",
  RESUBMIT: "Resubmit",
};

export const PE_STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea",
  PRE_SEED: "Pre-Seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  GROWTH: "Growth",
  MATURE: "Mature",
};

export const PE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  FOLLOW_ON_PENDING: "Follow-on Pending",
  WATCHLIST: "Watchlist",
  EXITED: "Exited",
  WRITTEN_OFF: "Written Off",
};

export const PE_INSTRUMENT_LABELS: Record<string, string> = {
  ORDINARY_SHARES: "Ordinary Shares",
  PREFERENCE_SHARES: "Preference Shares",
  CONVERTIBLE_NOTE: "Convertible Note",
  SAFE: "SAFE",
  WARRANT: "Warrant",
  DIRECT_LOAN: "Direct Loan",
  OTHER: "Other",
};

export const PE_SHAREHOLDER_TYPE_LABELS: Record<string, string> = {
  FOUNDER: "Founder",
  FAMILY_OFFICE: "Family Office",
  ANGEL: "Angel",
  VC_FUND: "VC Fund",
  CORPORATE: "Corporate",
  ESOP_POOL: "ESOP Pool",
  OTHER: "Other",
};

export const PE_DILUTION_EVENT_LABELS: Record<string, string> = {
  NEW_ROUND: "New Round",
  ESOP_GRANT: "ESOP Grant",
  WARRANT_EXERCISE: "Warrant Exercise",
  CONVERTIBLE_CONVERSION: "Convertible Conversion",
  SECONDARY_SALE: "Secondary Sale",
  SPLIT: "Split",
  OTHER: "Other",
};

export const PE_VALUATION_METHOD_LABELS: Record<string, string> = {
  LAST_ROUND: "Last Round",
  REVENUE_MULTIPLE: "Revenue Multiple",
  DCF: "DCF",
  BOOK_VALUE: "Book Value",
  WRITE_OFF: "Write-off",
  OTHER: "Other",
};

export const PE_DISTRIBUTION_TYPE_LABELS: Record<string, string> = {
  DIVIDEND: "Dividend",
  RETURN_OF_CAPITAL: "Return of Capital",
  EXIT_PROCEEDS: "Exit Proceeds",
  INTEREST: "Interest",
};

export const PE_EXIT_TYPE_LABELS: Record<string, string> = {
  TRADE_SALE: "Trade Sale",
  IPO: "IPO",
  SECONDARY: "Secondary",
  BUYBACK: "Buyback",
  WRITE_OFF: "Write-off",
};

export const PE_CONTACT_ROLE_LABELS: Record<string, string> = {
  FOUNDER: "Founder",
  CEO: "CEO",
  CFO: "CFO",
  BOARD_MEMBER: "Board Member",
  LEAD_INVESTOR: "Lead Investor",
  LEGAL_COUNSEL: "Legal Counsel",
  OTHER: "Other",
};

export const PE_ANTI_DILUTION_LABELS: Record<string, string> = {
  NONE: "None",
  BROAD_BASED: "Broad-Based Weighted Average",
  FULL_RATCHET: "Full Ratchet",
};

export const PE_REPORT_TYPE_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
  AD_HOC: "Ad Hoc",
};

export const PE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SHA: "Shareholders Agreement",
  TERM_SHEET: "Term Sheet",
  CAP_TABLE_SNAPSHOT: "Cap Table Snapshot",
  BOARD_RESOLUTION: "Board Resolution",
  FINANCIAL_STATEMENTS: "Financial Statements",
  IC_MEMO: "IC Memo",
  WARRANT_AGREEMENT: "Warrant Agreement",
  CONVERTIBLE_NOTE: "Convertible Note",
  OTHER: "Other",
};

export const RE_PROPERTY_TYPE_LABELS: Record<string, string> = {
  VILLA: "Villa",
  APARTMENT_BUILDING: "Apartment Building",
  COMMERCIAL_BUILDING: "Commercial Building",
  MIXED_USE: "Mixed Use",
  LAND: "Land",
  WAREHOUSE: "Warehouse",
  OTHER: "Other",
};

export const RE_OWNERSHIP_STATUS_LABELS: Record<string, string> = {
  OWNED: "Owned",
  JOINTLY_OWNED: "Jointly Owned",
  MORTGAGED: "Mortgaged",
};

export const RE_PROPERTY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  UNDER_RENOVATION: "Under Renovation",
  FOR_SALE: "For Sale",
  SOLD: "Sold",
};

export const RE_UNIT_TYPE_LABELS: Record<string, string> = {
  FLAT: "Flat",
  APARTMENT: "Apartment",
  OFFICE: "Office",
  SHOWROOM: "Showroom",
  SHOP: "Shop",
  WAREHOUSE: "Warehouse",
  VILLA: "Villa",
  STUDIO: "Studio",
  PENTHOUSE: "Penthouse",
  PARKING: "Parking",
  STORAGE: "Storage",
  OTHER: "Other",
};

export const RE_OCCUPANCY_STATUS_LABELS: Record<string, string> = {
  RENTED: "Rented",
  VACANT: "Vacant",
  OWNER_OCCUPIED: "Owner Occupied",
  UNDER_RENOVATION: "Under Renovation",
  RESERVED: "Reserved",
};

export const RE_FURNISHING_STATUS_LABELS: Record<string, string> = {
  FURNISHED: "Furnished",
  SEMI_FURNISHED: "Semi-Furnished",
  UNFURNISHED: "Unfurnished",
};

export const RE_LEASE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
  PENDING: "Pending",
  RENEWED: "Renewed",
};

export const RE_PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-Annual",
  ANNUAL: "Annual",
};

export const RE_PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  PDC: "Post-Dated Cheque (PDC)",
};

export const RE_RENT_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
  PARTIALLY_PAID: "Partially Paid",
  WAIVED: "Waived",
};

export const RE_PDC_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CLEARED: "Cleared",
  BOUNCED: "Bounced",
  REPLACED: "Replaced",
};

export const RE_MAINTENANCE_CATEGORY_LABELS: Record<string, string> = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  AC_HVAC: "AC / HVAC",
  PAINTING: "Painting",
  FLOORING: "Flooring",
  STRUCTURE: "Structure",
  PEST_CONTROL: "Pest Control",
  CLEANING: "Cleaning",
  APPLIANCE: "Appliance",
  DOOR_WINDOW: "Door / Window",
  ELEVATOR: "Elevator",
  COMMON_AREA: "Common Area",
  OTHER: "Other",
};

export const RE_MAINTENANCE_PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const RE_MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING_PARTS: "Pending Parts",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const RE_PROPERTY_EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: "Maintenance",
  INSURANCE: "Insurance",
  MUNICIPALITY_FEE: "Municipality Fee",
  SERVICE_CHARGE: "Service Charge",
  MANAGEMENT_FEE: "Management Fee",
  LEGAL: "Legal",
  MORTGAGE: "Mortgage",
  RENOVATION: "Renovation",
  LANDSCAPING: "Landscaping",
  SECURITY: "Security",
  CLEANING: "Cleaning",
  UTILITY: "Utility",
  OTHER: "Other",
};

export const RE_PROPERTY_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  TITLE_DEED: "Title Deed",
  LEASE_CONTRACT: "Lease Contract",
  NOC: "NOC",
  MUNICIPALITY_CERTIFICATE: "Municipality Certificate",
  INSURANCE_POLICY: "Insurance Policy",
  MORTGAGE_DOCUMENT: "Mortgage Document",
  VALUATION_REPORT: "Valuation Report",
  MAINTENANCE_INVOICE: "Maintenance Invoice",
  UTILITY_BILL: "Utility Bill",
  TENANT_ID: "Tenant ID",
  FLOOR_PLAN: "Floor Plan",
  PHOTO: "Photo",
  OTHER: "Other",
};

export const RE_VALUATION_METHOD_LABELS: Record<string, string> = {
  MARKET_APPRAISAL: "Market Appraisal",
  COST: "Cost",
  INCOME: "Income",
  SELF_ASSESSED: "Self-Assessed",
};
