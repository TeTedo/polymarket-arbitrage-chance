// Polymarket API response type definitions

// gamma-api.polymarket.com response is a direct array
export type MarketsResponse = Market[];

export interface Market {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  clobTokenIds?: string; // Comma-separated token ID string
  outcomes?: string; // Comma-separated outcome string
  outcomePrices?: string; // Comma-separated price string
  enableOrderBook: boolean;
  active: boolean;
  closed: boolean;
  archived: boolean;
  acceptingOrders: boolean;
  endDateIso?: string;
  [key: string]: any; // Other fields
}

export interface TokenInfo {
  tokenId: string;
  outcome: string; // "Yes" or "No" or other outcome name
  price?: number;
  [key: string]: any; // Other fields
}

export interface OrderbookResponse {
  bids: Order[];
  asks: Order[];
}

export interface Order {
  price: string;
  size: string;
  maker?: string;
  timestamp?: number;
}

export interface TokenPair {
  marketId: string;
  conditionId: string;
  type: "buy" | "sell"; // Buy opportunity or Sell opportunity
  yesToken: string;
  noToken: string;
  question: string;
  slug?: string; // Polymarket market slug (for generating link)
}

export interface PriceData {
  yesToken: string;
  noToken: string;
  yesAskPrice: number; // Yes token ask price (immediate buy price)
  yesBidPrice: number; // Yes token bid price (immediate sell price)
  noAskPrice: number; // No token ask price (immediate buy price)
  noBidPrice: number; // No token bid price (immediate sell price)
  fullsetBuyPrice: number; // Asks sum (yesAskPrice + noAskPrice) - for Buy opportunity check
  fullsetSellPrice: number; // Bids sum (yesBidPrice + noBidPrice) - for Sell opportunity check
}
