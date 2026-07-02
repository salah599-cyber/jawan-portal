export type ParsedHolding = {
  symbol: string;
  name?: string;
  quantity: number;
  costBasis?: number;
  marketPrice?: number;
  marketValue?: number;
  unrealisedPnl?: number;
  currency?: string;
  exchange?: string;
  isin?: string;
  cusip?: string;
  sedol?: string;
  country?: string;
};

export type ParseReportResult = {
  broker: string;
  accountNumber?: string;
  asOfDate?: Date;
  holdings: ParsedHolding[];
  warnings: string[];
  parserId: string;
};

export type BrokerReportFile = {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
};

export type ImportFileResult = {
  fileName: string;
  broker: string;
  accountNumber?: string;
  asOfDate?: string;
  holdingsImported: number;
  warnings: string[];
  parserId?: string;
  error?: string;
};

export type ManualHoldingInput = {
  symbol: string;
  name?: string;
  quantity: number;
  costBasis?: number;
  marketPrice?: number;
  marketValue?: number;
  unrealisedPnl?: number;
  broker?: string;
  accountNumber?: string;
  exchange?: string;
  isin?: string;
  cusip?: string;
  sedol?: string;
  asOfDate?: string;
};
