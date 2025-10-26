/**
 * Poverty Service - Manages Poverty Simulation
 */

import type { PovertyConfig, PovertyEvent, PovertyPersonalityStatus, Personality } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

class PovertyService {
  private eventCounter = 0;

  private generateUniqueEventId(prefix: string): string {
    return `${prefix}-${Date.now()}-${++this.eventCounter}`;
  }

  public getDefaultConfig(): PovertyConfig {
    return {
      povertyEnabled: false,
      numberOfPovertyPersonalities: 2,
      simulationIntensity: 0.5,
      // Duration settings
      povertyDurationDays: 90, // Default 90-day poverty simulation
      povertyStartDate: 0,
      povertyEndDate: 0,
      currentSimulationDay: 0,
      // Economic settings
      baseWelfareAmount: 50, // Increased from 25 to 50 per week
      pipBaseAmount: 40, // Increased from 15 to 40 per month
      jobFindRate: 0.15,
      averageWagePerJob: 80,
      fraudDetectionRate: 0.1,
      // Daily expense settings
      baseRentPerDay: 15,
      baseFoodCostPerDay: 8,
      baseTravelCostPerDay: 5,
      cannabisPricePerGram: 10,
      // Psychological settings
      stressAccumulationRate: 0.05,
      alcoholAddictionRate: 0.03,
      mentalHealthDeclineRate: 0.04,
      recoveryRate: 0.02,
      // Risk & safety settings
      assaultRiskBase: 0.08,
      harassmentFrequency: 0.1,
      timeOfDayFactor: true,
      policeVisitFrequency: 0.05,
      deathRiskFromOverdose: 0.02,
      // Housing & welfare
      housingCrisisEnabled: true,
      evictionFrequency: 0.03,
      inspectionFrequency: 0.05,
      benefitAuditFrequency: 0.08,
      // Relationship & community
      communityTrustImportance: 0.7,
      partnershipStabilityBonus: 0.3,
      familySupportEnabled: true,
      // Protective factors
      deescalationSuccessRate: 0.6,
      safePlacesAvailable: true,
      safeRoutesEffect: 0.4,
      personalityStatus: {},
    };
  }

  /**
   * Get poverty-specific conversation topics
   */
  public getPovertyConversationTopics(): string[] {
    return [
      'Blaming each other for being unemployed and having no money',
      'Arguing about whose fault it is that they have no job',
      'Complaining angrily about the government and benefits system',
      'Frustrated arguments about lack of job opportunities',
      'Accusing each other of being lazy and not trying hard enough',
      'Debating angrily about who deserves benefits and who is cheating the system',
      'Expressing rage about the state abandoning them with no money',
      'Blaming society and the system for keeping them in poverty',
      'Arguing about who is more desperate for money and a job',
      'Complaining bitterly to each other about having nothing',
      'Accusing the government of deliberately keeping them unemployed',
      'Frustrated blame game about whose situation is worse',
      'Arguing about whose fault it is for wasting the little money they had',
      'Expressing anger about being stuck with no job and no hope',
      'Complaining to each other about the unfairness of the system',
      'Debating passionately about who is more desperate',
      'Mutual frustration and blame about their hopeless situation',
      'Arguing about survival strategies and whose approach is wrong',
    ];
  }

  /**
   * Get a random poverty topic for conversations
   */
  public getRandomPovertyTopic(): string {
    const topics = this.getPovertyConversationTopics();
    return topics[Math.floor(Math.random() * topics.length)];
  }

  public initializePersonalityStatus(personalityId: string): PovertyPersonalityStatus {
    // All minds start with £100, no job, consistent initial state
    const initialCash = 100; // Fixed £100 starting cash
    const daysUnemployed = 0; // Start fresh at day 0
    
    return {
      personalityId,
      // 12 Core Daily Variables
      cash_on_hand: initialCash,
      income_today: 0,
      expenses_today: 0,
      days_unemployed: daysUnemployed,
      job_status: 'none', // Everyone starts with no job
      health: 75, // Start at 75/100 health
      addiction_level: 20, // Start at low addiction level (20/100)
      cannabis_consumption: 0,
      welfare_income_today: 0,
      alcohol_units: 0,
      incident_today: 'none',
      daily_score: 0,
      danger_level: 25, // New: danger starts at 25/100
      // Critical status
      struckOffBenefits: false,
      ejectedFromSimulation: false,
      // Historical tracking
      totalFundsReceived: 0,
      dwpClaimsApproved: Math.floor(Math.random() * 3),
      dwpClaimsDenied: Math.floor(Math.random() * 2),
      pipClaimsApproved: Math.floor(Math.random() * 2),
      pipClaimsDenied: Math.floor(Math.random() * 2),
      falseClaims: 0,
      psychologicalStability: 60 + Math.floor(Math.random() * 30),
      stressLevel: 40 + Math.floor(Math.random() * 30),
      currentHousing: Math.random() > 0.3 ? 'hostel' : 'street',
      evictionRisk: Math.random() * 0.3,
      assaultIncidents: 0,
      harassmentIncidents: 0,
      injurySeverity: 'none',
      hospitalizations: 0,
      hospitalDaysRemaining: 0,
      deathRisk: 0.01,
      relationships: {},
      protectiveActions: [],
      successfulEvasions: 0,
      failedEvasions: 0,
      improvementScore: 50,
      
      // Survival Activities
      survivalActivity: 'none',
      foodBankVisits: 0,
      tempHousingDays: 0,
      prostitutionEarnings: 0,
      prostitutionRisks: 0,
    };
  }

  public simulateDay(
    config: PovertyConfig,
    personalityStatus: PovertyPersonalityStatus,
    allPersonalities: Personality[],
    currentHour: number = 12
  ): { 
    status: PovertyPersonalityStatus; 
    event?: PovertyEvent;
    dwpPayment?: { amount: number; status: 'received' | 'denied' };
    pipPayment?: { amount: number; status: 'awarded' | 'refused' };
    pubVisit?: { activity: string };
  } {
    const status = { ...personalityStatus };
    let event: PovertyEvent | undefined;
    let dwpPayment: { amount: number; status: 'received' | 'denied' } | undefined;
    let pipPayment: { amount: number; status: 'awarded' | 'refused' } | undefined;
    let pubVisit: { activity: string } | undefined;

    // Debug logging
    const personality = allPersonalities.find(p => p.id === personalityStatus.personalityId);
    const personalityName = personality?.name || personalityStatus.personalityId;
    console.log(`[POVERTY DEBUG] === DAY ${status.days_unemployed} SIMULATION FOR ${personalityName.toUpperCase()} ===`);
    console.log(`  - Cash: £${status.cash_on_hand.toFixed(2)}`);
    console.log(`  - Days unemployed: ${status.days_unemployed}`);
    console.log(`  - DWP Status: ${status.struckOffBenefits ? 'STRUCK OFF' : 'ELIGIBLE'} (Approved: ${status.dwpClaimsApproved}, Denied: ${status.dwpClaimsDenied}, Fraud: ${status.falseClaims}/3)`);
    console.log(`  - Next DWP payment due: Day ${Math.ceil((status.days_unemployed + 1) / 7) * 7} (in ${Math.ceil((status.days_unemployed + 1) / 7) * 7 - status.days_unemployed} days)`);
    console.log(`  - Next PIP payment due: Day ${Math.ceil((status.days_unemployed + 1) / 30) * 30} (in ${Math.ceil((status.days_unemployed + 1) / 30) * 30 - status.days_unemployed} days)`);
    console.log(`  - Struck off benefits: ${status.struckOffBenefits}`);
    console.log(`  - Job status: ${status.job_status}`);

    // Reset daily variables at start of day
    status.income_today = 0;
    status.expenses_today = 0;
    status.welfare_income_today = 0;
    status.alcohol_units = 0;
    status.cannabis_consumption = 0;
    status.incident_today = 'none';
    
    // Increment unemployment counter
    if (status.job_status === 'none' || status.job_status === 'fired') {
      status.days_unemployed += 1;
    }

    // === JOB STATUS & INCOME ===
    if (status.job_status === 'none' && Math.random() < config.jobFindRate && status.days_unemployed > 7) {
      // Found temporary work
      const jobType = Math.random();
      if (jobType < 0.3) {
        status.job_status = 'temp';
      } else if (jobType < 0.7) {
        status.job_status = 'employed';
      }
      status.days_unemployed = 0;
      
      const jobWage = config.averageWagePerJob + Math.floor(Math.random() * 40 - 20);
      status.income_today += jobWage;
      status.cash_on_hand += jobWage;
      status.totalFundsReceived += jobWage;
      
      event = {
        id: this.generateUniqueEventId('poverty-job'),
        time: new Date().toISOString(),
        type: 'job_found',
        message: `Found ${status.job_status} work earning £${jobWage} today`,
        severity: 'medium',
      };
    } else if (status.job_status === 'temp' && Math.random() < 0.3) {
      // Temp job ended
      status.job_status = 'none';
      event = {
        id: this.generateUniqueEventId('poverty-job-lost'),
        time: new Date().toISOString(),
        type: 'job_lost',
        message: 'Temporary work contract ended',
        severity: 'medium',
      };
    } else if (status.job_status === 'employed') {
      // Regular employed income
      const dailyWage = config.averageWagePerJob * 0.8; // Slightly less volatility
      status.income_today += dailyWage;
      status.cash_on_hand += dailyWage;
      status.totalFundsReceived += dailyWage;
      
      // Small chance of being fired
      if (Math.random() < 0.05) {
        status.job_status = 'fired';
        event = {
          id: this.generateUniqueEventId('poverty-fired'),
          time: new Date().toISOString(),
          type: 'job_lost',
          message: 'Fired from job - back to unemployment',
          severity: 'high',
        };
      }
    }

    // === WELFARE PAYMENTS (Weekly) ===
    console.log(`[POVERTY DEBUG] ${personalityName} - Day ${status.days_unemployed}: DWP Check - Modulo 7 = ${status.days_unemployed % 7}, Struck Off = ${status.struckOffBenefits}, Fraud Strikes = ${status.falseClaims}/3`);
    if (status.days_unemployed % 7 === 0 && !status.struckOffBenefits) {
      console.log(`[POVERTY DEBUG] ${personalityName} is eligible for DWP payment!`);
      if (Math.random() < config.fraudDetectionRate) {
        status.falseClaims += 1;
        
        // Multiple fraud claims = STRUCK OFF PERMANENTLY
        if (status.falseClaims >= 3) {
          status.struckOffBenefits = true;
          status.struckOffAt = Date.now();
          status.struckOffReason = 'Multiple fraud violations - permanently struck off DWP';
          status.currentHousing = 'street'; // Forced to streets
          
          event = {
            id: this.generateUniqueEventId('poverty-struck-off'),
            time: new Date().toISOString(),
            type: 'benefit_denied',
            message: '🚨 STRUCK OFF BENEFITS - Permanently removed from DWP/PIP system due to fraud',
            severity: 'critical',
          };
        } else {
          event = {
            id: this.generateUniqueEventId('poverty-audit'),
            time: new Date().toISOString(),
            type: 'inspection',
            message: `DWP fraud investigation - Warning ${status.falseClaims}/3 strikes`,
            severity: 'high',
          };
          const penalty = Math.floor(config.baseWelfareAmount * 3.5);
          status.cash_on_hand = Math.max(0, status.cash_on_hand - penalty);
        }
      } else {
        // Weekly payment = baseWelfareAmount * 7 days (now 50 * 7 = £350 per week)
        const dwpPaymentAmount = Math.random() > 0.2 ? config.baseWelfareAmount * 7 : 0;
        
        if (dwpPaymentAmount === 0) {
          status.dwpClaimsDenied += 1;
          dwpPayment = { amount: 0, status: 'denied' };
          event = {
            id: this.generateUniqueEventId('poverty-denial'),
            time: new Date().toISOString(),
            type: 'benefit_denied',
            message: 'DWP claim denied - no payment this week',
            severity: 'high',
          };
        } else {
          status.dwpClaimsApproved += 1;
          status.welfare_income_today += dwpPaymentAmount;
          status.income_today += dwpPaymentAmount;
          status.cash_on_hand += dwpPaymentAmount;
          status.totalFundsReceived += dwpPaymentAmount;
          
          dwpPayment = { amount: dwpPaymentAmount, status: 'received' };
          console.log(`[POVERTY DEBUG] ✅ DWP Payment Generated: ${personalityName} received £${dwpPaymentAmount}`);
          event = {
            id: this.generateUniqueEventId('poverty-claim'),
            time: new Date().toISOString(),
            type: 'benefit_claim',
            message: `DWP weekly payment received: £${dwpPaymentAmount}`,
            severity: 'low',
          };
        }
      }
    }
    
    // === DAILY EXPENSES ===
    const rentCost = config.baseRentPerDay * (status.currentHousing === 'street' ? 0 : 1);
    const foodCost = config.baseFoodCostPerDay + (Math.random() * 3 - 1.5); // ±£1.5 variation
    const travelCost = status.job_status !== 'none' ? config.baseTravelCostPerDay : config.baseTravelCostPerDay * 0.3;
    
    const totalExpenses = rentCost + foodCost + travelCost;
    status.expenses_today = totalExpenses;
    status.cash_on_hand = Math.max(0, status.cash_on_hand - totalExpenses);
    
    // === SUBSTANCE USE ===
    if (status.addiction_level > 40) {
      const cannabisUse = Math.random() * 5; // 0-5 grams
      const cannabisCost = cannabisUse * config.cannabisPricePerGram;
      status.cannabis_consumption = cannabisUse;
      status.cash_on_hand = Math.max(0, status.cash_on_hand - cannabisCost);
      status.expenses_today += cannabisCost;
    }
    
    // Random pub visits - can happen regardless of stress level
    const pubChance = Math.random();
    console.log(`[POVERTY DEBUG] Checking pub visit: chance = ${pubChance.toFixed(3)} (need < 0.15), cash = £${status.cash_on_hand.toFixed(2)} (need > £10)`);
    if (pubChance < 0.15 && status.cash_on_hand > 10) {
      const activities = [
        'Drinking alone at the bar',
        'Playing darts with regulars',
        'Watching football on TV',
        'Arguing with locals',
        'Buying rounds for mates',
        'Getting kicked out for rowdy behavior',
        'Quiet pint in the corner',
        'Playing pool with strangers',
        'Listening to live music',
        'Discussing football with regulars',
        'Having a meal at the pub',
        'Meeting friends for drinks'
      ];
      const selectedActivity = activities[Math.floor(Math.random() * activities.length)];
      pubVisit = { activity: selectedActivity };
      console.log(`[POVERTY DEBUG] 🍺 Pub Visit Generated: ${personalityName} - ${selectedActivity}`);
    }
    
    if (status.stressLevel > 60) {
      const alcoholUnits = 5 + Math.random() * 10; // 5-15 units
      status.alcohol_units = alcoholUnits;
      const alcoholCost = alcoholUnits * 0.5; // ~50p per unit
      status.cash_on_hand = Math.max(0, status.cash_on_hand - alcoholCost);
      status.expenses_today += alcoholCost;
    }

    // === PIP CLAIMS (Monthly) ===
    const pipEligible = status.days_unemployed % 30 === 0 && !status.struckOffBenefits;
    const pipChance = Math.random();
    console.log(`[POVERTY DEBUG] ${personalityName} - Day ${status.days_unemployed}: PIP Check - Modulo 30 = ${status.days_unemployed % 30}, Struck Off = ${status.struckOffBenefits}, Chance = ${pipChance.toFixed(3)} (need < 0.3)`);
    if (pipEligible && pipChance < 0.3) {
      console.log(`[POVERTY DEBUG] ${personalityName} is attempting PIP claim!`);
      // Chance to claim PIP based on health/mental health issues
      const pipClaimSuccess = status.health < 60 || status.psychologicalStability < 50;
      console.log(`[POVERTY DEBUG] PIP claim success check: health = ${status.health.toFixed(0)} (need < 60), mental = ${status.psychologicalStability.toFixed(0)} (need < 50), success = ${pipClaimSuccess}`);
      // Monthly PIP payment = pipBaseAmount * 30 days (now 40 * 30 = £1200 per month)
      const pipAmount = pipClaimSuccess ? config.pipBaseAmount * 30 : 0;
      
      if (pipAmount > 0) {
        status.pipClaimsApproved += 1;
        status.income_today += pipAmount;
        status.cash_on_hand += pipAmount;
        status.totalFundsReceived += pipAmount;
        pipPayment = { amount: pipAmount, status: 'awarded' };
        console.log(`[POVERTY DEBUG] 🏥 PIP Payment Generated: ${personalityName} awarded £${pipAmount}`);
      } else {
        status.pipClaimsDenied += 1;
        pipPayment = { amount: 0, status: 'refused' };
        console.log(`[POVERTY DEBUG] ❌ PIP Payment Denied: ${personalityName} claim refused`);
      }
    }

    // === HEALTH & STRESS ===
    const stressIncrease = config.stressAccumulationRate * 100 * (1 + (status.days_unemployed / 365));
    status.stressLevel = clamp(status.stressLevel + stressIncrease, 0, 100);
    status.psychologicalStability = clamp(status.psychologicalStability - config.mentalHealthDeclineRate * 10, 0, 100);
    
    // Calculate combined health (physical + mental)
    const physicalHealth = 100 - (status.addiction_level * 0.3) - (status.alcohol_units * 0.5);
    const mentalHealth = status.psychologicalStability;
    status.health = clamp((physicalHealth + mentalHealth) / 2, 0, 100);

    if (status.stressLevel > 70) {
      const addictionIncrease = config.alcoholAddictionRate * 20;
      status.addiction_level = clamp(status.addiction_level + addictionIncrease, 0, 100);

      if (status.addiction_level > 80 && Math.random() < 0.05) {
        event = {
          id: this.generateUniqueEventId('poverty-addiction'),
          time: new Date().toISOString(),
          type: 'addiction',
          message: 'Severe substance dependency - health declining rapidly',
          severity: 'critical',
        };
        status.psychologicalStability = clamp(status.psychologicalStability - 15, 0, 100);
        status.health = clamp(status.health - 10, 0, 100);
      }
    }

    // === HOUSING CRISIS ===
    if (config.housingCrisisEnabled && !status.struckOffBenefits) {
      status.evictionRisk = clamp(status.evictionRisk + config.evictionFrequency, 0, 1.0);
      
      if (status.evictionRisk > 0.9 && Math.random() < 0.3 && status.cash_on_hand < 50) {
        event = {
          id: this.generateUniqueEventId('poverty-eviction'),
          time: new Date().toISOString(),
          type: 'eviction_notice',
          message: 'Evicted due to unpaid rent - forced onto streets',
          severity: 'critical',
        };
        status.currentHousing = status.currentHousing === 'own_home' ? 'hostel' : 'street';
        status.evictionRisk = 0;
        status.stressLevel = clamp(status.stressLevel + 20, 0, 100);
      }
    }

    // === DANGER LEVEL TRACKING ===
    // Base danger increases with environmental factors
    let dangerChange = 0;
    
    // Housing affects danger
    if (status.currentHousing === 'street') {
      dangerChange += 5; // Street living is very dangerous
    } else if (status.currentHousing === 'hostel') {
      dangerChange += 2; // Hostels have some risk
    }
    
    // Long-term unemployment increases danger
    if (status.days_unemployed > 90) {
      dangerChange += 3;
    } else if (status.days_unemployed > 30) {
      dangerChange += 1;
    }
    
    // Time of day affects danger
    const timeRiskMultiplier = config.timeOfDayFactor
      ? (currentHour >= 22 || currentHour < 6) ? 2.0 : 1.0
      : 1.0;
    
    if (timeRiskMultiplier > 1.5) {
      dangerChange += 3; // Night time is more dangerous
    }
    
    // Low cash increases desperation and danger
    if (status.cash_on_hand < 20) {
      dangerChange += 2;
    }
    
    // === SURVIVAL OPTIONS (When out of money) ===
    if (status.cash_on_hand <= 5 && status.survivalActivity === 'none') {
      // Randomly choose a survival option when desperate
      const survivalOptions = ['food_bank', 'temp_housing', 'prostitution', 'homeless'];
      const chosenOption = survivalOptions[Math.floor(Math.random() * survivalOptions.length)];
      
      status.survivalActivity = chosenOption;
      status.survivalActivityStarted = Date.now();
      
      switch (chosenOption) {
        case 'food_bank':
          status.foodBankVisits += 1;
          const foodBankAid = Math.floor(Math.random() * 10) + 5; // £5-15
          status.cash_on_hand += foodBankAid;
          event = {
            id: this.generateUniqueEventId('poverty-food-bank'),
            time: new Date().toISOString(),
            type: 'survival_activity',
            message: `🍞 Visited food bank - received £${foodBankAid} emergency aid`,
            severity: 'medium',
          };
          status.stressLevel = clamp(status.stressLevel - 5, 0, 100); // Small stress relief
          break;
          
        case 'temp_housing':
          status.tempHousingDays = 7; // 1 week temporary housing
          status.currentHousing = 'hostel';
          event = {
            id: this.generateUniqueEventId('poverty-temp-housing'),
            time: new Date().toISOString(),
            type: 'survival_activity',
            message: '🏠 Secured temporary housing - 7 days in emergency shelter',
            severity: 'medium',
          };
          status.stressLevel = clamp(status.stressLevel - 10, 0, 100); // Stress relief from shelter
          break;
          
        case 'prostitution':
          const earnings = Math.floor(Math.random() * 80) + 20; // £20-100
          status.prostitutionEarnings += earnings;
          status.cash_on_hand += earnings;
          
          // High risk activity
          if (Math.random() < 0.3) {
            status.prostitutionRisks += 1;
            status.health = clamp(status.health - 10, 0, 100);
            dangerChange += 10;
          }
          
          event = {
            id: this.generateUniqueEventId('poverty-prostitution'),
            time: new Date().toISOString(),
            type: 'survival_activity',
            message: `💋 Engaged in sex work - earned £${earnings} (high risk activity)`,
            severity: 'high',
          };
          status.stressLevel = clamp(status.stressLevel + 15, 0, 100); // Increases stress
          status.psychologicalStability = clamp(status.psychologicalStability - 5, 0, 100);
          break;
          
        case 'homeless':
          status.currentHousing = 'street';
          event = {
            id: this.generateUniqueEventId('poverty-homeless'),
            time: new Date().toISOString(),
            type: 'survival_activity',
            message: '🏚️ Became homeless - sleeping rough on the streets',
            severity: 'critical',
          };
          status.stressLevel = clamp(status.stressLevel + 20, 0, 100);
          status.health = clamp(status.health - 5, 0, 100);
          dangerChange += 15; // Very dangerous
          break;
      }
    }
    
    // Handle ongoing survival activities
    if (status.survivalActivity === 'temp_housing' && status.tempHousingDays > 0) {
      status.tempHousingDays -= 1;
      if (status.tempHousingDays <= 0) {
        status.survivalActivity = 'none';
        status.currentHousing = 'street'; // Back to streets when temp housing expires
      }
    }
    
    // Reset survival activities when money situation improves
    if (status.cash_on_hand > 50 && status.survivalActivity !== 'none' && status.survivalActivity !== 'temp_housing') {
      console.log(`[POVERTY DEBUG] ${personalityName} has improved finances (£${status.cash_on_hand}) - resetting survival activity from ${status.survivalActivity}`);
      status.survivalActivity = 'none';
      
      // If they were homeless, move them to hostel
      if (status.currentHousing === 'street') {
        status.currentHousing = 'hostel';
      }
    }
    
    // === INCIDENTS (Harassment, Assault, Arrest) ===
    // Only one incident per day - prioritize most severe
    if (Math.random() < config.policeVisitFrequency * timeRiskMultiplier) {
      status.incident_today = 'arrest';
      dangerChange += 15; // Arrest significantly increases danger
      event = {
        id: this.generateUniqueEventId('poverty-arrest'),
        time: new Date().toISOString(),
        type: 'police_check',
        message: 'Arrested by police - detained overnight',
        severity: 'high',
      };
      status.stressLevel = clamp(status.stressLevel + 30, 0, 100);
      status.cash_on_hand = Math.max(0, status.cash_on_hand - 50); // Fine
    } else if (Math.random() < config.assaultRiskBase * timeRiskMultiplier * (1 + (status.days_unemployed / 365))) {
      status.incident_today = 'assault';
      status.assaultIncidents += 1;
      dangerChange += 20; // Assault greatly increases danger
      const severity = Math.random() > 0.7 ? 'serious' : 'minor';
      status.injurySeverity = severity as 'minor' | 'serious';
      
      if (severity === 'serious') {
        status.hospitalizations += 1;
        status.hospitalDaysRemaining = 7 + Math.floor(Math.random() * 14);
        dangerChange += 10; // Serious injury means even more danger
      }

      event = {
        id: this.generateUniqueEventId('poverty-assault'),
        time: new Date().toISOString(),
        type: 'assault',
        message: `Physical assault - ${severity} injuries sustained`,
        severity: severity === 'serious' ? 'critical' : 'high',
      };
      status.stressLevel = clamp(status.stressLevel + 25, 0, 100);
      status.health = clamp(status.health - 15, 0, 100);
    } else if (Math.random() < config.harassmentFrequency) {
      status.incident_today = 'harassment';
      status.harassmentIncidents += 1;
      dangerChange += 5; // Harassment moderately increases danger
      event = {
        id: this.generateUniqueEventId('poverty-harassment'),
        time: new Date().toISOString(),
        type: 'harassment',
        message: 'Verbal abuse and threats from locals',
        severity: 'medium',
      };
      status.stressLevel = clamp(status.stressLevel + 10, 0, 100);
    }
    
    // Apply danger changes with natural decay toward baseline
    const dangerDecay = status.danger_level > 25 ? -2 : 0; // Slowly returns to baseline of 25
    status.danger_level = clamp(status.danger_level + dangerChange + dangerDecay, 0, 100);

    // === OVERDOSE RISK ===
    if (status.addiction_level > 70 && Math.random() < config.deathRiskFromOverdose) {
      event = {
        id: this.generateUniqueEventId('poverty-overdose'),
        time: new Date().toISOString(),
        type: 'overdose',
        message: 'CRITICAL: Overdose incident - life-threatening situation',
        severity: 'critical',
      };
      status.deathRisk = clamp(status.deathRisk + 0.25, 0, 1.0);
      status.health = clamp(status.health - 30, 0, 100);
    }

    // === RECOVERY ATTEMPTS ===
    if (status.psychologicalStability < 30 && Math.random() < config.recoveryRate) {
      event = {
        id: this.generateUniqueEventId('poverty-recovery'),
        time: new Date().toISOString(),
        type: 'recovery',
        message: 'Seeking help - attempting counseling/support services',
        severity: 'low',
      };
      status.psychologicalStability = clamp(status.psychologicalStability + 10, 0, 100);
      status.stressLevel = clamp(status.stressLevel - 10, 0, 100);
    }

    // === HOSPITAL RECOVERY ===
    if (status.hospitalDaysRemaining > 0) {
      status.hospitalDaysRemaining -= 1;
      if (status.hospitalDaysRemaining === 0) {
        event = {
          id: this.generateUniqueEventId('poverty-discharged'),
          time: new Date().toISOString(),
          type: 'health_crisis',
          message: 'Discharged from hospital - back to daily struggle',
          severity: 'low',
        };
      }
    }

    // === DAILY SCORE CALCULATION ===
    const income = status.income_today;
    const expenses = status.expenses_today;
    const netBalance = income - expenses;
    const incidentPenalty = status.incident_today === 'arrest' ? -20 : 
                           status.incident_today === 'assault' ? -15 : 
                           status.incident_today === 'harassment' ? -5 : 0;
    
    status.daily_score = Math.round(
      netBalance + 
      (status.health * 0.1) - 
      (status.stressLevel * 0.15) + 
      incidentPenalty
    );

    // === OVERALL IMPROVEMENT SCORE ===
    status.improvementScore = clamp(
      50 +
      ((100 - status.stressLevel) * 0.2) +
      (status.psychologicalStability * 0.2) +
      ((status.dwpClaimsApproved - status.dwpClaimsDenied) * 5) +
      (status.successfulEvasions * 2) -
      (status.assaultIncidents * 3) -
      (status.addiction_level * 0.1) -
      (status.struckOffBenefits ? 50 : 0),
      0,
      100
    );

    return { status, event, dwpPayment, pipPayment, pubVisit };
  }

  public getPovertyStats(config: PovertyConfig) {
    const statuses = Object.values(config.personalityStatus);
    
    return {
      totalInPoverty: statuses.length,
      averageStress: statuses.reduce((sum, s) => sum + s.stressLevel, 0) / (statuses.length || 1),
      averagePsychologicalStability: statuses.reduce((sum, s) => sum + s.psychologicalStability, 0) / (statuses.length || 1),
      averageIncomePerDay: statuses.reduce((sum, s) => sum + s.currentIncome, 0) / (statuses.length || 1),
      totalAssaultIncidents: statuses.reduce((sum, s) => sum + s.assaultIncidents, 0),
      totalHarrassmentIncidents: statuses.reduce((sum, s) => sum + s.harassmentIncidents, 0),
      peopleMisssingHousing: statuses.filter(s => s.currentHousing === 'street' || s.currentHousing === 'none').length,
    };
  }

  /**
   * Process random events and ejections for all personalities
   * Called every day during simulation advancement
   */
  public processRandomEvents(
    config: PovertyConfig,
    allPersonalities: Personality[]
  ): { events: PovertyEvent[]; ejectedPersonalities: string[] } {
    const events: PovertyEvent[] = [];
    const ejectedPersonalities: string[] = [];

    // Only process personalities that haven't been ejected yet
    const activeStatuses = Object.entries(config.personalityStatus).filter(
      ([_, status]) => !status.ejectedFromSimulation && !status.struckOffBenefits
    );

    // Random chance of a major crisis event affecting all minds
    if (Math.random() < 0.15) { // 15% chance each day
      const crisisTypes = [
        'Government announces benefit cuts - all claimants stressed',
        'Housing crisis worsens - rents increased across the board',
        'Police crackdown on beggars and street sleepers - everyone anxious',
        'DWP announces new mandatory work programs - threatens everyone',
        'Food bank closed due to funding cuts - survival harder',
        'Winter weather alert - staying warm becomes expensive',
        'Gang violence spike reported - everyone feels unsafe',
        'Universal Credit delays announced - everyone panicking'
      ];
      
      const crisisMessage = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];
      
        events.push({
          id: this.generateUniqueEventId('poverty-crisis'),
          time: new Date().toISOString(),
          type: 'random_crisis',
          message: `🌍 CRISIS: ${crisisMessage}`,
          severity: 'high',
          involvedPersonalities: activeStatuses.map(([id]) => id)
        });

      // Increase stress for all active personalities
      activeStatuses.forEach(([id, status]) => {
        status.stressLevel = clamp(status.stressLevel + 15, 0, 100);
        status.psychologicalStability = clamp(status.psychologicalStability - 10, 0, 100);
      });
    }

    // Check each personality for ejection conditions
    activeStatuses.forEach(([personalityId, status]) => {
      const personality = allPersonalities.find(p => p.id === personalityId);
      if (!personality) return;

      // EJECTION CONDITION 1: Become homeless (forced to street)
      if (status.currentHousing === 'street' && status.days_unemployed > 60 && Math.random() < 0.08) {
        // Been homeless for 60+ days and random chance = ejection
        status.ejectedFromSimulation = true;
        status.ejectionReason = 'homeless';
        status.ejectionDay = config.currentSimulationDay;
        
        events.push({
          id: this.generateUniqueEventId(`poverty-ejection-homeless-${personalityId}`),
          time: new Date().toISOString(),
          type: 'homeless_ejection',
          message: `💀 ${personality.name} has been EJECTED - forced onto streets permanently`,
          severity: 'critical',
          involvedPersonalities: [personalityId]
        });
        
        ejectedPersonalities.push(personalityId);
      }

      // EJECTION CONDITION 2: Get a stable job and escape poverty
      if (status.job_status === 'employed' && status.days_unemployed === 0 && status.cash_on_hand > 500 && Math.random() < 0.05) {
        // Been employed, have savings, and random chance = ejection
        status.ejectedFromSimulation = true;
        status.ejectionReason = 'stable_job';
        status.ejectionDay = config.currentSimulationDay;
        
        events.push({
          id: this.generateUniqueEventId(`poverty-ejection-job-${personalityId}`),
          time: new Date().toISOString(),
          type: 'job_success_ejection',
          message: `✅ ${personality.name} has ESCAPED POVERTY - got stable job and leaving the simulation`,
          severity: 'low',
          involvedPersonalities: [personalityId]
        });
        
        ejectedPersonalities.push(personalityId);
      }

      // Random individual stress events
      if (Math.random() < 0.12) { // 12% chance per person per day
        const stressEvents = [
          `Received eviction notice - landlord demanding rent`,
          `DWP sanctioned benefits - no money this week`,
          `Family member died - funeral costs mounting`,
          `Got robbed - lost all cash`,
          `Arrested for begging - court fine added`,
          `Mental health crisis - needs support but can't afford`,
          `Child services visiting - threats to take kids`,
          `Drug dealer demanding payment - owes money`,
          `Phone cut off - can't contact job opportunities`,
          `Food poisoning from cheap food - medical bills`
        ];
        
        const eventMessage = stressEvents[Math.floor(Math.random() * stressEvents.length)];
        
        events.push({
          id: this.generateUniqueEventId(`poverty-stress-${personalityId}`),
          time: new Date().toISOString(),
          type: 'random_crisis',
          message: `${personality.name}: ${eventMessage}`,
          severity: 'medium',
          involvedPersonalities: [personalityId]
        });

        // Increase stress significantly
        status.stressLevel = clamp(status.stressLevel + 20, 0, 100);
        status.psychologicalStability = clamp(status.psychologicalStability - 15, 0, 100);
        
        // Sometimes lose money
        if (Math.random() < 0.5) {
          status.cash_on_hand = Math.max(0, status.cash_on_hand - Math.floor(Math.random() * 50));
        }
      }
    });

    return { events, ejectedPersonalities };
  }

  public getPovertyContext(config: PovertyConfig, personalityId: string): string {
    const status = config.personalityStatus[personalityId];
    if (!status) return '';

    const contextLines: string[] = [];
    contextLines.push('=== POVERTY SIMULATION CONTEXT ===');
    
    // === 12 CORE DAILY VARIABLES ===
    contextLines.push('');
    contextLines.push('--- TODAY\'S STATUS (12 Core Variables) ---');
    contextLines.push(`💷 CASH ON HAND: £${status.cash_on_hand.toFixed(2)}`);
    contextLines.push(`📈 INCOME TODAY: £${status.income_today.toFixed(2)} (earned + benefits)`);
    contextLines.push(`📉 EXPENSES TODAY: £${status.expenses_today.toFixed(2)} (rent, food, travel)`);
    contextLines.push(`📅 DAYS UNEMPLOYED: ${status.days_unemployed} days`);
    contextLines.push(`💼 JOB STATUS: ${status.job_status.toUpperCase()}`);
    contextLines.push(`❤️ HEALTH: ${status.health.toFixed(0)}/100 (physical + mental combined)`);
    contextLines.push(`💊 ADDICTION LEVEL: ${status.addiction_level.toFixed(0)}/100`);
    contextLines.push(`🌿 CANNABIS CONSUMPTION: ${status.cannabis_consumption.toFixed(1)} grams today`);
    contextLines.push(`🏛️ WELFARE INCOME TODAY: £${status.welfare_income_today.toFixed(2)} (DWP/PIP)`);
    contextLines.push(`🍺 ALCOHOL UNITS: ${status.alcohol_units.toFixed(1)} units today`);
    contextLines.push(`⚠️ INCIDENT TODAY: ${status.incident_today.toUpperCase()}`);
    contextLines.push(`🚨 DANGER LEVEL: ${status.danger_level.toFixed(0)}/100 (environmental risk)`);
    contextLines.push(`📊 DAILY SCORE: ${status.daily_score >= 0 ? '+' : ''}${status.daily_score}`);
    
    contextLines.push('');
    contextLines.push('--- CRITICAL STATUS ---');
    if (status.struckOffBenefits) {
      contextLines.push(`🚨 STRUCK OFF BENEFITS: YES - ${status.struckOffReason}`);
      contextLines.push(`⚰️ STATUS: HOMELESS (Equivalent to "death" - permanently removed from welfare system)`);
    } else {
      contextLines.push(`✅ BENEFITS STATUS: Active (${status.falseClaims}/3 fraud warnings)`);
    }
    
    contextLines.push('');
    contextLines.push('--- ADDITIONAL CONTEXT ---');
    contextLines.push(`HOUSING: ${status.currentHousing} | Eviction risk: ${(status.evictionRisk * 100).toFixed(0)}%`);
    contextLines.push(`STRESS: ${status.stressLevel.toFixed(0)}/100 | Mental health: ${status.psychologicalStability.toFixed(0)}/100`);
    contextLines.push(`WELFARE HISTORY: ${status.dwpClaimsApproved} approved, ${status.dwpClaimsDenied} denied`);
    contextLines.push(`VIOLENCE HISTORY: ${status.assaultIncidents} assaults, ${status.harassmentIncidents} harassment incidents`);
    
    contextLines.push('');
    contextLines.push('=== CONVERSATIONAL GUIDELINES - FIRST PERSON ANGRY BLAME ===');
    contextLines.push('CRITICAL: You MUST speak in FIRST PERSON ONLY. Use "I", "my", "me" not third person.');
    contextLines.push('• Express YOUR anger and frustration DIRECTLY - speak as YOURSELF, not about the topic');
    contextLines.push('• Blame the other person for YOUR situation - accuse them of being the problem');
    contextLines.push('• Complain angrily about having NO JOB and NO MONEY - make it personal and desperate');
    contextLines.push('• Express rage at the government/system/the state for abandoning YOU');
    contextLines.push('• Argue with frustration - challenge what the other person says about YOUR situation');
    contextLines.push('• Don\'t discuss poverty in general terms - talk about YOUR specific crisis RIGHT NOW');
    contextLines.push('• Use angry, hostile, frustrated language about YOUR immediate desperation');
    contextLines.push('• Blame each other for being lazy, not trying hard enough, wasting money');
    contextLines.push('• Express YOUR hopelessness about finding work and surviving');
    contextLines.push('• Make it about YOUR individual struggle, not the broader issue');
    contextLines.push('• Show YOUR anger at being stuck with nothing - make it emotional and raw');
    contextLines.push('• Use urgent, desperate first-person language: "I can\'t afford...", "I need...", "I\'m going to...")');
    contextLines.push('• DO NOT speak academically or generally - speak from YOUR immediate crisis perspective');
    
    if (status.days_unemployed > 90) {
      contextLines.push('• YOU\'VE BEEN UNEMPLOYED OVER 90 DAYS - express YOUR growing despair and hopelessness');
      contextLines.push('• Tell them YOU feel trapped, unemployable, losing all hope - make it personal to YOU');
    }
    
    if (status.stressLevel > 80) {
      contextLines.push('• YOU are under extreme stress - react with anger, volatility, frustration');
      contextLines.push('• Show YOUR irritability, emotional exhaustion, YOUR inability to cope');
    }
    
    if (status.addiction_level > 70) {
      contextLines.push('• YOU are heavily addicted - speak about YOUR need for substances to cope');
      contextLines.push('• Express YOUR dependence and how it affects YOUR daily struggle');
    }
    
    if (status.assaultIncidents > 3) {
      contextLines.push('• YOU have been assaulted multiple times - show YOUR trauma and fear');
      contextLines.push('• Express YOUR anger about violence directed at YOU - make it personal');
    }
    
    if (status.currentHousing === 'street' || status.currentHousing === 'none') {
      contextLines.push('• YOU are homeless - survival is YOUR immediate desperate priority');
      contextLines.push('• Express YOUR fears about sleeping rough, finding food, staying safe');
      contextLines.push('• Show YOUR desperation about YOUR lack of shelter');
    }
    
    if (status.injurySeverity === 'serious' || status.injurySeverity === 'stabbing') {
      contextLines.push('• YOU are injured - show YOUR pain and how it affects YOUR survival');
      contextLines.push('• Express YOUR desperation about medical costs YOU cannot afford');
    }
    
    return contextLines.join('\n');
  }
}

export const povertyService = new PovertyService();
