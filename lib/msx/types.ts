export type ParsedHolding = {
  symbol: string;
  name?: string;
  quantity: number;
  costBasis?: number;
  marketPrice?: number;
  marketValue?: number;
  unrealisedPnl?: number;
  currency?: string;
};

export type ParseReportResult = {
  broker: string;
  accountNumber?: string;
  asOfDate?: Date;
  holdings: ParsedHolding[];
  warnings: string[];
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
  error?: string;
};
