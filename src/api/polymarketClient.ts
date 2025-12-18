import axios, { AxiosInstance } from "axios";
import {
  MarketsResponse,
  TokenPair,
  PriceData,
  Order,
  OrderbookResponse,
} from "../types/polymarket";

export class PolymarketClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = "https://gamma-api.polymarket.com") {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers,
    });
  }

  /**
   * 모든 마켓 정보 가져오기
   */
  async getMarkets(): Promise<TokenPair[]> {
    try {
      const pairs: TokenPair[] = [];
      let offset = 0;
      const limit = 1000; // 한 번에 가져올 최대 개수
      let hasMore = true;

      while (hasMore) {
        // Polymarket Gamma API 엔드포인트 - 열려있는 마켓만 필터링
        const response = await this.client.get<MarketsResponse>("/markets", {
          params: {
            closed: false, // 닫히지 않은 마켓만
            limit: limit,
            offset: offset,
            order: "createdAt", // 생성일 기준 정렬
            ascending: false, // 최신순
          },
        });

        // 응답이 배열인지 확인
        if (!Array.isArray(response.data)) {
          throw new Error("Invalid API response format: expected array");
        }

        // 더 이상 데이터가 없으면 종료
        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const market of response.data) {
          // 기본 필수 조건: 활성화되고 아카이브되지 않은 마켓만 처리
          // closed는 이미 쿼리 파라미터로 필터링됨
          if (!market.active || market.archived) {
            continue;
          }

          // conditionId가 없는 마켓은 건너뛰기
          if (!market.conditionId) {
            continue;
          }

          // clobTokenIds가 없는 마켓은 건너뛰기
          if (!market.clobTokenIds) {
            continue;
          }

          // clobTokenIds 파싱 (JSON 배열 또는 콤마로 구분된 문자열)
          let tokenIds: string[] = [];
          try {
            // JSON 배열인지 확인
            if (market.clobTokenIds.startsWith("[")) {
              tokenIds = JSON.parse(market.clobTokenIds);
            } else {
              // 콤마로 구분된 문자열
              tokenIds = market.clobTokenIds.split(",");
            }
          } catch {
            // 파싱 실패 시 콤마로 분리 시도
            tokenIds = market.clobTokenIds.split(",");
          }

          // 토큰 ID 정리 (공백, 대괄호, 따옴표 제거)
          tokenIds = tokenIds
            .map((id) => {
              // 문자열에서 숫자만 추출
              const cleaned = id.trim().replace(/[\[\]"]/g, "");
              return cleaned;
            })
            .filter((id) => id.length > 0); // 빈 문자열 제거

          if (tokenIds.length < 2) {
            continue;
          }

          // outcomes 파싱 (있는 경우)
          let outcomes: string[] = [];
          if (market.outcomes) {
            outcomes = market.outcomes.split(",").map((o) => o.trim());
          }

          // Yes/No 토큰 찾기
          let yesTokenId: string | undefined;
          let noTokenId: string | undefined;

          if (outcomes.length >= 2) {
            // outcomes 배열에서 Yes/No 찾기
            const yesIndex = outcomes.findIndex(
              (o) => o.toLowerCase() === "yes" || o === "1"
            );
            const noIndex = outcomes.findIndex(
              (o) => o.toLowerCase() === "no" || o === "0"
            );

            if (yesIndex >= 0 && yesIndex < tokenIds.length) {
              yesTokenId = tokenIds[yesIndex];
            }
            if (noIndex >= 0 && noIndex < tokenIds.length) {
              noTokenId = tokenIds[noIndex];
            }
          }

          // Yes/No를 찾지 못한 경우 첫 번째와 두 번째 토큰 사용
          if (!yesTokenId || !noTokenId) {
            yesTokenId = tokenIds[0];
            noTokenId = tokenIds[1];
          }

          if (yesTokenId && noTokenId) {
            pairs.push({
              marketId: market.conditionId,
              conditionId: market.conditionId,
              yesToken: yesTokenId,
              noToken: noTokenId,
              question: market.question,
              slug: market.slug, // Polymarket 링크 생성용
            });
          }
        }

        // 다음 페이지로 이동
        offset += response.data.length;

        // 가져온 데이터가 limit보다 적으면 마지막 페이지
        if (response.data.length < limit) {
          hasMore = false;
        }
      }

      return pairs;
    } catch (error: any) {
      console.error("Error fetching markets:", error.message);
      throw error;
    }
  }

  /**
   * 특정 토큰의 오더북 가져오기
   */
  async getOrderbook(tokenId: string): Promise<OrderbookResponse | null> {
    try {
      // Polymarket CLOB API 엔드포인트 (clob.polymarket.com 사용)
      // gamma-api와는 다른 도메인이므로 별도 클라이언트 필요할 수 있음
      const clobClient = axios.create({
        baseURL: "https://clob.polymarket.com",
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const response = await clobClient.get<OrderbookResponse>(`/book`, {
        params: { token_id: tokenId },
      });

      if (!response.data || !response.data.bids || !response.data.asks) {
        return null;
      }

      return response.data;
    } catch (error: any) {
      console.error(
        `Error fetching orderbook for token ${tokenId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Buy 기회 체크용 가격 데이터 가져오기 (asks만)
   */
  async getBuyPriceData(pair: TokenPair): Promise<number | null> {
    const [yesOrderbook, noOrderbook] = await Promise.all([
      this.getOrderbook(pair.yesToken),
      this.getOrderbook(pair.noToken),
    ]);

    if (!yesOrderbook || !noOrderbook) {
      return null;
    }

    // Ask 가격 (즉시 구매 가격)
    const yesAskPrice = this.getBestAsk(yesOrderbook.asks);
    const noAskPrice = this.getBestAsk(noOrderbook.asks);

    if (yesAskPrice === null || noAskPrice === null) {
      return null;
    }

    console.log("ask: " + (yesAskPrice + noAskPrice) * 100);
    return (yesAskPrice + noAskPrice) * 100;
  }

  /**
   * Sell 기회 체크용 가격 데이터 가져오기 (bids만)
   */
  async getSellPriceData(pair: TokenPair): Promise<number | null> {
    const [yesOrderbook, noOrderbook] = await Promise.all([
      this.getOrderbook(pair.yesToken),
      this.getOrderbook(pair.noToken),
    ]);

    if (!yesOrderbook || !noOrderbook) {
      return null;
    }

    // Bid 가격 (즉시 판매 가격)
    const yesBidPrice = this.getBestBid(yesOrderbook.bids);
    const noBidPrice = this.getBestBid(noOrderbook.bids);

    if (yesBidPrice === null || noBidPrice === null) {
      return null;
    }

    console.log("bid: " + (yesBidPrice + noBidPrice) * 100);
    return (yesBidPrice + noBidPrice) * 100;
  }

  /**
   * 토큰 페어의 전체 가격 데이터 가져오기 (Buy/Sell 모두)
   * @deprecated Buy/Sell을 각각 체크하려면 getBuyPriceData/getSellPriceData 사용 권장
   */
  async getPriceData(pair: TokenPair): Promise<PriceData | null> {
    const [yesOrderbook, noOrderbook] = await Promise.all([
      this.getOrderbook(pair.yesToken),
      this.getOrderbook(pair.noToken),
    ]);

    if (!yesOrderbook || !noOrderbook) {
      return null;
    }

    // Ask 가격 (즉시 구매 가격) - Buy 기회 체크용
    const yesAskPrice = this.getBestAsk(yesOrderbook.asks);
    const noAskPrice = this.getBestAsk(noOrderbook.asks);

    // Bid 가격 (즉시 판매 가격) - Sell 기회 체크용
    const yesBidPrice = this.getBestBid(yesOrderbook.bids);
    const noBidPrice = this.getBestBid(noOrderbook.bids);

    if (
      yesAskPrice === null ||
      noAskPrice === null ||
      yesBidPrice === null ||
      noBidPrice === null
    ) {
      return null;
    }

    // Fullset 가격 계산
    // Buy 기회: asks 합 < 100 이면 아비트라지 (Yes + No를 모두 구매해서 fullset 생성)
    // Sell 기회: bids 합 > 100 이면 아비트라지 (Yes + No를 모두 판매해서 fullset 판매)
    // 주의: Polymarket 가격이 0-1 범위면 100을 곱해야 함, 0-100 범위면 그대로 사용
    const fullsetBuyPrice = yesAskPrice + noAskPrice; // asks 합
    const fullsetSellPrice = yesBidPrice + noBidPrice; // bids 합

    return {
      yesToken: pair.yesToken,
      noToken: pair.noToken,
      yesAskPrice,
      yesBidPrice,
      noAskPrice,
      noBidPrice,
      fullsetBuyPrice,
      fullsetSellPrice,
    };
  }

  /**
   * 가장 낮은 ask 가격 반환 (즉시 구매 가격)
   */
  private getBestAsk(asks: Order[]): number | null {
    if (!asks || asks.length === 0) return null;
    const prices = asks.map((ask) => parseFloat(ask.price));
    return Math.min(...prices);
  }

  /**
   * 가장 높은 bid 가격 반환 (즉시 판매 가격)
   */
  private getBestBid(bids: Order[]): number | null {
    if (!bids || bids.length === 0) return null;
    const prices = bids.map((bid) => parseFloat(bid.price));
    return Math.max(...prices);
  }
}
