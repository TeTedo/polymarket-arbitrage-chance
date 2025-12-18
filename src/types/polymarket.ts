// Polymarket API 응답 타입 정의

// gamma-api.polymarket.com 응답은 직접 배열
export type MarketsResponse = Market[];

export interface Market {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  clobTokenIds?: string; // 콤마로 구분된 토큰 ID 문자열
  outcomes?: string; // 콤마로 구분된 outcome 문자열
  outcomePrices?: string; // 콤마로 구분된 가격 문자열
  enableOrderBook: boolean;
  active: boolean;
  closed: boolean;
  archived: boolean;
  acceptingOrders: boolean;
  endDateIso?: string;
  [key: string]: any; // 기타 필드들
}

export interface TokenInfo {
  tokenId: string;
  outcome: string; // "Yes" or "No" 또는 다른 outcome 이름
  price?: number;
  [key: string]: any; // 기타 필드들
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
  yesToken: string;
  noToken: string;
  question: string;
  slug?: string; // Polymarket 마켓 slug (링크 생성용)
}

export interface PriceData {
  yesToken: string;
  noToken: string;
  yesAskPrice: number; // yes 토큰 ask 가격 (즉시 구매 가격)
  yesBidPrice: number; // yes 토큰 bid 가격 (즉시 판매 가격)
  noAskPrice: number; // no 토큰 ask 가격 (즉시 구매 가격)
  noBidPrice: number; // no 토큰 bid 가격 (즉시 판매 가격)
  fullsetBuyPrice: number; // asks 합 (yesAskPrice + noAskPrice) - Buy 기회 체크용
  fullsetSellPrice: number; // bids 합 (yesBidPrice + noBidPrice) - Sell 기회 체크용
}
