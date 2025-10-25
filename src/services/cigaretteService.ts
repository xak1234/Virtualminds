/**
 * Cigarette Trading Service - Manages Cigarette Dealing & Trading System
 * 
 * This service handles:
 * - Cigarette inventory management
 * - Deal negotiations between personalities
 * - Violence escalation and stabbing mechanics
 * - Profit calculation
 * - Police involvement and arrest risk
 * - Reputation tracking
 */

import type { CigaretteConfig, CigaretteDeal, CigarettePersonalityStatus, Personality } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

class CigaretteService {
  /**
   * Initialize default cigarette trading configuration
   */
  public getDefaultConfig(): CigaretteConfig {
    return {
      cigaretteTradingEnabled: false,
      tradingIntensity: 0.5,
      
      // Economic
      basePrice: 2.5, // £ per cigarette
      priceVariation: 0.3, // 30% variation
      marginTarget: 0.4, // 40% profit margin target
      
      // Deal Outcomes
      successRate: 0.65, // 65% smooth deals
      violenceRate: 0.15, // 15% violence escalation
      arrestRate: 0.1, // 10% police involvement
      negotiationRate: 0.25, // 25% negotiated price
      
      // Violence
      stabbingDamage: 5, // Moderate injury
      recoveryDays: 7,
      deathFromStabbing: 0.05, // 5% fatal
      
      // Environmental
      policePresence: 0.2, // 20% base
      timeOfDayFactor: true,
      reputationMechanics: true,
      
      personalityStatus: {},
    };
  }

  /**
   * Initialize personality for cigarette trading
   */
  public initializePersonalityStatus(personalityId: string): CigarettePersonalityStatus {
    return {
      personalityId,
      cigaretteInventory: Math.floor(Math.random() * 100),
      totalSold: 0,
      totalBought: 0,
      totalProfit: 0,
      totalSpent: 0,
      successfulDeals: 0,
      violentDeals: 0,
      stabbings: 0,
      stabbed: false,
      daysUntilHealed: 0,
      reputation: 50 + Math.floor(Math.random() * 40),
      suspicion: Math.floor(Math.random() * 20),
      wantedLevel: 0,
    };
  }

  /**
   * Process a cigarette deal between two personalities
   */
  public processDeal(
    config: CigaretteConfig,
    sellerStatus: CigarettePersonalityStatus,
    buyerStatus: CigarettePersonalityStatus,
    seller: Personality,
    buyer: Personality,
    quantity: number,
    currentHour: number = 12
  ): { deal: CigaretteDeal; updatedSeller: CigarettePersonalityStatus; updatedBuyer: CigarettePersonalityStatus } {
    const updatedSeller = { ...sellerStatus };
    const updatedBuyer = { ...buyerStatus };

    // Check inventory
    if (updatedSeller.cigaretteInventory < quantity) {
      const deal: CigaretteDeal = {
        id: \cig-deal-\\,
        time: new Date().toISOString(),
        seller: seller.id,
        sellerName: seller.name,
        buyer: buyer.id,
        buyerName: buyer.name,
        quantity,
        pricePerCig: config.basePrice,
        totalPrice: 0,
        outcome: 'rejected',
        details: 'Deal rejected - seller lacks inventory',
        witnessed: false,
      };
      return { deal, updatedSeller, updatedBuyer };
    }

    // Calculate price with variation
    const priceVariation = (Math.random() - 0.5) * 2 * config.priceVariation;
    const basePrice = config.basePrice * (1 + priceVariation);
    const pricePerCig = Math.max(0.5, basePrice);

    // Determine outcome
    const outcomeRoll = Math.random();
    let outcome: 'success' | 'violence' | 'arrest' | 'negotiated';
    let injuryType: 'none' | 'minor' | 'serious' | 'stabbing' = 'none';
    let details = '';

    const timeRiskMultiplier = config.timeOfDayFactor && (currentHour >= 22 || currentHour < 6) ? 1.5 : 1.0;

    if (outcomeRoll < config.violenceRate * timeRiskMultiplier) {
      // Violence escalates
      outcome = 'violence';
      const stabbingRoll = Math.random();
      
      if (stabbingRoll < 0.7) {
        // Stabbing occurs
        injuryType = 'stabbing';
        updatedBuyer.stabbed = true;
        updatedBuyer.stabbedBy = seller.name;
        updatedBuyer.stabbings += 1;
        updatedBuyer.daysUntilHealed = config.recoveryDays;
        updatedBuyer.suspicion = clamp(updatedBuyer.suspicion + 15, 0, 100);
        updatedSeller.suspicion = clamp(updatedSeller.suspicion + 25, 0, 100);
        updatedSeller.wantedLevel = clamp(updatedSeller.wantedLevel + 20, 0, 100);
        
        details = \\ was stabbed by \ during cigarette deal altercation!\;
      } else {
        injuryType = 'serious';
        details = \Physical fight broke out during deal between \ and \\;
      }
    } else if (outcomeRoll < config.arrestRate) {
      // Police involvement
      outcome = 'arrest';
      updatedSeller.wantedLevel = clamp(updatedSeller.wantedLevel + 35, 0, 100);
      updatedSeller.suspicion = clamp(updatedSeller.suspicion + 50, 0, 100);
      details = \Police arrested \ during cigarette transaction. Deal failed.\;
    } else if (outcomeRoll < config.negotiationRate) {
      // Price negotiation
      outcome = 'negotiated';
      const negotiatedPrice = pricePerCig * 0.7; // 30% discount from negotiation
      const totalPrice = negotiatedPrice * quantity;
      
      updatedSeller.cigaretteInventory -= quantity;
      updatedSeller.totalSold += quantity;
      updatedBuyer.cigaretteInventory += quantity;
      updatedBuyer.totalBought += quantity;

      const cost = config.basePrice * quantity;
      const profit = totalPrice - cost;
      updatedSeller.totalProfit += profit;
      updatedSeller.successfulDeals += 1;
      updatedBuyer.totalSpent += totalPrice;

      // Reputation boost for successful negotiation
      updatedBuyer.reputation = clamp(updatedBuyer.reputation + 5, 0, 100);

      details = \Successful negotiation between \ and \. Price reduced to £\/cig.\;

      const deal: CigaretteDeal = {
        id: \cig-deal-\\,
        time: new Date().toISOString(),
        seller: seller.id,
        sellerName: seller.name,
        buyer: buyer.id,
        buyerName: buyer.name,
        quantity,
        pricePerCig: negotiatedPrice,
        totalPrice,
        outcome,
        profitForSeller: profit,
        injuryType,
        details,
        witnessed: Math.random() < 0.3,
      };
      return { deal, updatedSeller, updatedBuyer };
    } else {
      // Successful smooth deal
      outcome = 'success';
      const totalPrice = pricePerCig * quantity;
      
      updatedSeller.cigaretteInventory -= quantity;
      updatedSeller.totalSold += quantity;
      updatedBuyer.cigaretteInventory += quantity;
      updatedBuyer.totalBought += quantity;

      const cost = config.basePrice * quantity;
      const profit = totalPrice - cost;
      updatedSeller.totalProfit += profit;
      updatedSeller.successfulDeals += 1;
      updatedBuyer.totalSpent += totalPrice;

      details = \Smooth cigarette transaction: \ sold \ cigs to \ for £\\;
    }

    const totalPrice = pricePerCig * quantity;

    const deal: CigaretteDeal = {
      id: \cig-deal-\\,
      time: new Date().toISOString(),
      seller: seller.id,
      sellerName: seller.name,
      buyer: buyer.id,
      buyerName: buyer.name,
      quantity,
      pricePerCig,
      totalPrice,
      outcome,
      injuryType: outcome === 'violence' ? injuryType : 'none',
      details,
      witnessed: Math.random() < 0.3,
    };

    return { deal, updatedSeller, updatedBuyer };
  }

  /**
   * Get aggregate cigarette trading statistics
   */
  public getStats(config: CigaretteConfig) {
    const statuses = Object.values(config.personalityStatus);
    return {
      totalPeople: statuses.length,
      averageInventory: statuses.reduce((sum, s) => sum + s.cigaretteInventory, 0) / (statuses.length || 1),
      totalDealsCompleted: statuses.reduce((sum, s) => sum + s.successfulDeals, 0),
      totalViolentDeals: statuses.reduce((sum, s) => sum + s.violentDeals, 0),
      totalStabbings: statuses.reduce((sum, s) => sum + s.stabbings, 0),
      totalProfit: statuses.reduce((sum, s) => sum + s.totalProfit, 0),
      currentlyWounded: statuses.filter(s => s.stabbed).length,
      averageSuspicion: statuses.reduce((sum, s) => sum + s.suspicion, 0) / (statuses.length || 1),
      highestWantedLevel: Math.max(...statuses.map(s => s.wantedLevel), 0),
    };
  }
}

export const cigaretteService = new CigaretteService();
