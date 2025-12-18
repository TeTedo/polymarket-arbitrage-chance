import { AppDataSource } from "../config/database";
import { ArbitrageOpportunity } from "../entities/ArbitrageOpportunity";
import { PolymarketClient } from "../api/polymarketClient";
import { TokenPair, PriceData } from "../types/polymarket";

/**
 * Polymarket 마켓 링크 생성
 */
export function getPolymarketLink(marketId: string, slug?: string): string {
  if (slug) {
    return `https://polymarket.com/event/${slug}`;
  }
  // slug가 없으면 conditionId로 링크 생성 (덜 정확할 수 있음)
  return `https://polymarket.com/market/${marketId}`;
}

export class ArbitrageService {
  private client: PolymarketClient;

  constructor(client: PolymarketClient) {
    this.client = client;
  }

  /**
   * 모든 마켓에서 아비트라지 기회를 스캔하고 DB에 저장
   */
  async scanAndSaveOpportunities(): Promise<void> {
    try {
      console.log("마켓 정보를 가져오는 중...");
      const markets = await this.client.getMarkets();
      console.log(`총 ${markets.length}개의 마켓을 발견했습니다.`);

      const opportunities: Array<{
        marketId: string;
        yesToken: string;
        noToken: string;
        buyPrice: number;
        sellPrice: number;
        type: string;
      }> = [];

      for (const market of markets) {
        try {
          // Buy 기회와 Sell 기회를 각각 체크
          // Buy는 asks만, Sell은 bids만 필요하므로 각각 필요한 가격만 가져옴
          const [buyPrice, sellPrice] = await Promise.all([
            this.client.getBuyPriceData(market),
            this.client.getSellPriceData(market),
          ]);

          // 1. Buy 기회 확인: asks 합이 100 미만인 경우
          if (buyPrice !== null && buyPrice < 100) {
            opportunities.push({
              marketId: market.marketId,
              yesToken: market.yesToken,
              noToken: market.noToken,
              buyPrice: buyPrice,
              sellPrice: sellPrice || 0, // Sell 가격이 없을 수 있음
              type: "buy",
            });
            const marketLink = getPolymarketLink(market.marketId, market.slug);
            console.log(
              `[구매 기회] ${market.marketId}: 구매가 ${buyPrice.toFixed(
                4
              )} | ${marketLink}`
            );
          }

          // 2. Sell 기회 확인: bids 합이 100 초과인 경우
          if (sellPrice !== null && sellPrice > 100) {
            opportunities.push({
              marketId: market.marketId,
              yesToken: market.yesToken,
              noToken: market.noToken,
              buyPrice: buyPrice || 0, // Buy 가격이 없을 수 있음
              sellPrice: sellPrice,
              type: "sell",
            });
            const marketLink = getPolymarketLink(market.marketId, market.slug);
            console.log(
              `[판매 기회] ${market.marketId}: 판매가 ${sellPrice.toFixed(
                4
              )} | ${marketLink}`
            );
          }

          // API 호출 제한을 고려한 딜레이
          await this.delay(100);
        } catch (error) {
          console.error(`마켓 ${market.marketId} 처리 중 오류:`, error);
        }
      }

      // DB에 저장
      if (opportunities.length > 0) {
        await this.saveOpportunities(opportunities);
        console.log(
          `${opportunities.length}개의 아비트라지 기회를 DB에 저장했습니다.`
        );
      } else {
        console.log("아비트라지 기회가 발견되지 않았습니다.");
      }
    } catch (error) {
      console.error("아비트라지 스캔 중 오류:", error);
      throw error;
    }
  }

  /**
   * 아비트라지 기회를 DB에 저장
   */
  private async saveOpportunities(
    opportunities: Array<{
      marketId: string;
      yesToken: string;
      noToken: string;
      buyPrice: number;
      sellPrice: number;
      type: string;
    }>
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(ArbitrageOpportunity);

      // 기존 기회와 중복 체크를 위해 배치로 저장
      for (const opp of opportunities) {
        const entity = repository.create({
          marketId: opp.marketId,
          yesToken: opp.yesToken,
          noToken: opp.noToken,
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          type: opp.type,
        });

        try {
          await repository.save(entity);
        } catch (error: any) {
          // 중복 키 에러는 무시 (이미 존재하는 기회)
          if (error.code !== "ER_DUP_ENTRY") {
            console.error("기회 저장 중 오류:", error);
          }
        }
      }
    } catch (error) {
      console.error("DB 저장 중 오류:", error);
      throw error;
    }
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
