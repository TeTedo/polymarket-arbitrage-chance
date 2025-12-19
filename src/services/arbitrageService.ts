import { AppDataSource } from "../config/database";
import { ArbitrageOpportunity } from "../entities/ArbitrageOpportunity";
import { PolymarketClient } from "../api/polymarketClient";
import { TokenPair, PriceData } from "../types/polymarket";

/**
 * Generate Polymarket market link
 */
export function getPolymarketLink(marketId: string, slug?: string): string {
  if (slug) {
    return `https://polymarket.com/event/${slug}`;
  }
  // If slug is not available, use conditionId (may be less accurate)
  return `https://polymarket.com/market/${marketId}`;
}

export class ArbitrageService {
  private client: PolymarketClient;

  constructor(client: PolymarketClient) {
    this.client = client;
  }

  /**
   * Scan all markets for arbitrage opportunities and save to database
   */
  async scanAndSaveOpportunities(): Promise<void> {
    try {
      console.log("Fetching market information...");
      const markets = await this.client.getMarkets();
      console.log(`Found ${markets.length} markets.`);

      const opportunities: Array<{
        marketId: string;
        yesToken: string;
        noToken: string;
        buyPrice: number;
        sellPrice: number;
        type: string;
        link: string;
        question: string;
      }> = [];

      for (const market of markets) {
        try {
          // Check only Buy or Sell opportunity based on market.type
          if (market.type === "buy") {
            // Buy opportunity: check if asks sum is less than 100
            const buyPrice = await this.client.getBuyPriceData(market);

            if (buyPrice !== null && buyPrice < 100) {
              // Also fetch sell price for reference
              const sellPrice = await this.client.getSellPriceData(market);
              const marketLink = getPolymarketLink(
                market.marketId,
                market.slug
              );

              opportunities.push({
                marketId: market.marketId,
                yesToken: market.yesToken,
                noToken: market.noToken,
                buyPrice: buyPrice,
                sellPrice: sellPrice || 0,
                type: "buy",
                link: marketLink,
                question: market.question,
              });
              console.log(
                `[Buy Opportunity] ${
                  market.marketId
                }: Buy price ${buyPrice.toFixed(4)} | ${marketLink}`
              );
            }
          } else if (market.type === "sell") {
            // Sell opportunity: check if bids sum is greater than 100
            const sellPrice = await this.client.getSellPriceData(market);

            if (sellPrice !== null && sellPrice > 100) {
              // Also fetch buy price for reference
              const buyPrice = await this.client.getBuyPriceData(market);
              const marketLink = getPolymarketLink(
                market.marketId,
                market.slug
              );

              opportunities.push({
                marketId: market.marketId,
                yesToken: market.yesToken,
                noToken: market.noToken,
                buyPrice: buyPrice || 0,
                sellPrice: sellPrice,
                type: "sell",
                link: marketLink,
                question: market.question,
              });
              console.log(
                `[Sell Opportunity] ${
                  market.marketId
                }: Sell price ${sellPrice.toFixed(4)} | ${marketLink}`
              );
            }
          }

          // Delay to respect API rate limits
          await this.delay(100);
        } catch (error) {
          console.error(
            `Error processing market ${market.marketId} (${market.type}):`,
            error
          );
        }
      }

      // Save to database
      if (opportunities.length > 0) {
        await this.saveOpportunities(opportunities);
        console.log(
          `Saved ${opportunities.length} arbitrage opportunities to database.`
        );
      } else {
        console.log("No arbitrage opportunities found.");
      }
    } catch (error) {
      console.error("Error scanning arbitrage opportunities:", error);
      throw error;
    }
  }

  /**
   * Save arbitrage opportunities to database
   */
  private async saveOpportunities(
    opportunities: Array<{
      marketId: string;
      yesToken: string;
      noToken: string;
      buyPrice: number;
      sellPrice: number;
      type: string;
      link: string;
      question: string;
    }>
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(ArbitrageOpportunity);

      // Save in batch to check for duplicates
      for (const opp of opportunities) {
        const entity = repository.create({
          marketId: opp.marketId,
          yesToken: opp.yesToken,
          noToken: opp.noToken,
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          type: opp.type,
          link: opp.link,
          question: opp.question,
        });

        try {
          await repository.save(entity);
        } catch (error: any) {
          // Ignore duplicate key errors (opportunity already exists)
          if (error.code !== "ER_DUP_ENTRY") {
            console.error("Error saving opportunity:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error saving to database:", error);
      throw error;
    }
  }

  /**
   * Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
