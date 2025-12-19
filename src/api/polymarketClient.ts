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
   * Fetch all market information
   */
  async getMarkets(): Promise<TokenPair[]> {
    try {
      const pairs: TokenPair[] = [];
      let offset = 0;
      const limit = 1000; // Maximum number of items to fetch at once
      let hasMore = true;

      while (hasMore) {
        // Polymarket Gamma API endpoint - filter only open markets
        const response = await this.client.get<MarketsResponse>("/markets", {
          params: {
            closed: false, // Only non-closed markets
            limit: limit,
            offset: offset,
            order: "createdAt", // Sort by creation date
            ascending: false, // Newest first
          },
        });

        // Check if response is an array
        if (!Array.isArray(response.data)) {
          throw new Error("Invalid API response format: expected array");
        }

        // Exit if no more data
        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const market of response.data) {
          // Basic required conditions: only process active and non-archived markets
          // closed is already filtered by query parameter
          if (!market.active || market.archived) {
            continue;
          }

          // Skip markets without conditionId
          if (!market.conditionId) {
            continue;
          }

          // Skip markets without clobTokenIds
          if (!market.clobTokenIds) {
            continue;
          }

          // Parse clobTokenIds (JSON array or comma-separated string)
          let tokenIds: string[] = [];
          try {
            // Check if it's a JSON array
            if (market.clobTokenIds.startsWith("[")) {
              tokenIds = JSON.parse(market.clobTokenIds);
            } else {
              // Comma-separated string
              tokenIds = market.clobTokenIds.split(",");
            }
          } catch {
            // If parsing fails, try splitting by comma
            tokenIds = market.clobTokenIds.split(",");
          }

          // Clean token IDs (remove spaces, brackets, quotes)
          tokenIds = tokenIds
            .map((id) => {
              // Extract only numbers from string
              const cleaned = id.trim().replace(/[\[\]"]/g, "");
              return cleaned;
            })
            .filter((id) => id.length > 0); // Remove empty strings

          if (tokenIds.length < 2) {
            continue;
          }

          // Parse outcomes (if available)
          let outcomes: string[] = [];
          if (market.outcomes) {
            outcomes = market.outcomes.split(",").map((o) => o.trim());
          }

          // Find Yes/No tokens
          let yesTokenId: string | undefined;
          let noTokenId: string | undefined;

          if (outcomes.length >= 2) {
            // Find Yes/No in outcomes array
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

          // If Yes/No not found, use first and second tokens
          if (!yesTokenId || !noTokenId) {
            yesTokenId = tokenIds[0];
            noTokenId = tokenIds[1];
          }

          if (yesTokenId && noTokenId) {
            // Create separate Buy and Sell opportunities for each market
            pairs.push({
              marketId: market.conditionId,
              conditionId: market.conditionId,
              type: "buy", // Buy opportunity
              yesToken: yesTokenId,
              noToken: noTokenId,
              question: market.question,
              slug: market.slug, // For generating Polymarket link
            });
            pairs.push({
              marketId: market.conditionId,
              conditionId: market.conditionId,
              type: "sell", // Sell opportunity
              yesToken: yesTokenId,
              noToken: noTokenId,
              question: market.question,
              slug: market.slug, // For generating Polymarket link
            });
          }
        }

        // Move to next page
        offset += response.data.length;

        // If fetched data is less than limit, it's the last page
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
   * Fetch orderbook for a specific token
   */
  async getOrderbook(tokenId: string): Promise<OrderbookResponse | null> {
    try {
      // Polymarket CLOB API endpoint (uses clob.polymarket.com)
      // Different domain from gamma-api, so separate client may be needed
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
      return null;
    }
  }

  /**
   * Get price data for Buy opportunity check (asks only)
   */
  async getBuyPriceData(pair: TokenPair): Promise<number | null> {
    const [yesOrderbook, noOrderbook] = await Promise.all([
      this.getOrderbook(pair.yesToken),
      this.getOrderbook(pair.noToken),
    ]);

    if (!yesOrderbook || !noOrderbook) {
      return null;
    }

    // Ask price (immediate buy price)
    const yesAskPrice = this.getBestAsk(yesOrderbook.asks);
    const noAskPrice = this.getBestAsk(noOrderbook.asks);

    if (yesAskPrice === null || noAskPrice === null) {
      return null;
    }

    return (yesAskPrice + noAskPrice) * 100;
  }

  /**
   * Get price data for Sell opportunity check (bids only)
   */
  async getSellPriceData(pair: TokenPair): Promise<number | null> {
    const [yesOrderbook, noOrderbook] = await Promise.all([
      this.getOrderbook(pair.yesToken),
      this.getOrderbook(pair.noToken),
    ]);

    if (!yesOrderbook || !noOrderbook) {
      return null;
    }

    // Bid price (immediate sell price)
    const yesBidPrice = this.getBestBid(yesOrderbook.bids);
    const noBidPrice = this.getBestBid(noOrderbook.bids);

    if (yesBidPrice === null || noBidPrice === null) {
      return null;
    }

    return (yesBidPrice + noBidPrice) * 100;
  }

  /**
   * Get full price data for token pair (both Buy/Sell)
   * @deprecated Use getBuyPriceData/getSellPriceData to check Buy/Sell separately
   */
  async getPriceData(pair: TokenPair): Promise<PriceData | null> {
    const [yesOrderbook, noOrderbook] = await Promise.all([
      this.getOrderbook(pair.yesToken),
      this.getOrderbook(pair.noToken),
    ]);

    if (!yesOrderbook || !noOrderbook) {
      return null;
    }

    // Ask price (immediate buy price) - for Buy opportunity check
    const yesAskPrice = this.getBestAsk(yesOrderbook.asks);
    const noAskPrice = this.getBestAsk(noOrderbook.asks);

    // Bid price (immediate sell price) - for Sell opportunity check
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

    // Calculate fullset price
    // Buy opportunity: if asks sum < 100, arbitrage (buy Yes + No to create fullset)
    // Sell opportunity: if bids sum > 100, arbitrage (sell Yes + No to sell fullset)
    // Note: If Polymarket price is 0-1 range, multiply by 100; if 0-100 range, use as is
    const fullsetBuyPrice = yesAskPrice + noAskPrice; // asks sum
    const fullsetSellPrice = yesBidPrice + noBidPrice; // bids sum

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
   * Return lowest ask price (immediate buy price)
   */
  private getBestAsk(asks: Order[]): number | null {
    if (!asks || asks.length === 0) return null;
    const prices = asks.map((ask) => parseFloat(ask.price));
    return Math.min(...prices);
  }

  /**
   * Return highest bid price (immediate sell price)
   */
  private getBestBid(bids: Order[]): number | null {
    if (!bids || bids.length === 0) return null;
    const prices = bids.map((bid) => parseFloat(bid.price));
    return Math.max(...prices);
  }
}
