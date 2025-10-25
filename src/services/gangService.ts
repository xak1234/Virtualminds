/**
 * Gang Service - Manages Prison Gang Simulation
 * 
 * This service handles:
 * - Gang creation and management
 * - Member recruitment and assignments
 * - Violence and conflict resolution
 * - Territory control and gang wars
 * - Loyalty and reputation systems
 * - Solitary confinement management
 * - Weapons system (guns, shanks, chains)
 * - Guard bribery and weapon acquisition
 * - Weapon stealing and crafting
 */

import type { Gang, GangMemberStatus, GangsConfig, Personality, Weapon, WeaponType, Guard, GuardBribeAttempt } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Default gang names inspired by famous prison gangs
const DEFAULT_GANG_NAMES = [
  'The Apex Predators',
  'The Silent Brotherhood',
  'The Iron Circle',
  'The Crimson Syndicate',
  'The Shadow Council',
  'The Steel Wolves',
];

// Gang colors for visual identification
const DEFAULT_GANG_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#f59e0b', // Orange
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

// Default guard names
const DEFAULT_GUARD_NAMES = [
  'Officer Thompson',
  'Officer Rodriguez',
  'Officer Chen',
  'Officer Williams',
  'Officer Anderson',
  'Officer Martinez',
];

// Weapon templates
const WEAPON_TEMPLATES = {
  gun: [
    { name: '9mm Pistol', damage: 90, concealment: 0.3 },
    { name: 'Revolver', damage: 85, concealment: 0.25 },
    { name: 'Derringer', damage: 70, concealment: 0.6 },
  ],
  shank: [
    { name: 'Sharpened Toothbrush', damage: 30, concealment: 0.9 },
    { name: 'Metal Shank', damage: 50, concealment: 0.7 },
    { name: 'Glass Shard', damage: 40, concealment: 0.85 },
  ],
  chain: [
    { name: 'Heavy Chain', damage: 60, concealment: 0.4 },
    { name: 'Bike Chain', damage: 55, concealment: 0.5 },
    { name: 'Lock and Chain', damage: 70, concealment: 0.3 },
  ],
};

class GangService {
  /**
   * Initialize default gangs configuration
   */
  public getDefaultConfig(): GangsConfig {
    return {
      numberOfGangs: 3,
      prisonEnvironmentIntensity: 0.5,
      violenceFrequency: 0.3,
      recruitmentEnabled: true,
      territoryWarEnabled: true,
      loyaltyDecayRate: 0.02, // Low decay to keep gangs stable
      independentPersonalitiesAllowed: true,
      solitaryConfinementEnabled: true,
      deathEnabled: false, // Disabled by default - extreme feature
      deathProbability: 0.05, // 5% chance of death from extreme violence
      gangNames: DEFAULT_GANG_NAMES.slice(0, 3),
      gangColors: DEFAULT_GANG_COLORS.slice(0, 3),
      gangLeaders: {},
      memberStatus: {},
      gangs: {},
      // Weapons System
      weaponsEnabled: false, // Disabled by default
      guardBriberyEnabled: true,
      weaponStealingEnabled: true,
      weaponCraftingEnabled: true,
      guards: {},
      bribeHistory: [],
      rivalHostilityMultiplier: 1.0, // Normal hostility by default
      // Drug Economy System
      drugEconomyEnabled: true, // Enabled by default for better experience
      drugSmugglingFrequency: 0.3, // 30% chance per cycle
      drugDealingFrequency: 0.4, // 40% chance per cycle
      drugDetectionRisk: 0.15, // 15% base chance of getting caught
      itemStealingEnabled: true,
    };
  }

  /**
   * Initialize guards for the prison
   */
  public initializeGuards(config: GangsConfig, guardCount: number = 6): GangsConfig {
    const guards: Record<string, Guard> = {};
    
    for (let i = 0; i < guardCount; i++) {
      const guardId = `guard_${i + 1}`;
      const corruptibility = Math.random(); // Random corruptibility
      
      let reputation: 'honest' | 'neutral' | 'corrupt' | 'dangerous';
      if (corruptibility < 0.2) reputation = 'honest';
      else if (corruptibility < 0.5) reputation = 'neutral';
      else if (corruptibility < 0.8) reputation = 'corrupt';
      else reputation = 'dangerous';
      
      guards[guardId] = {
        id: guardId,
        name: DEFAULT_GUARD_NAMES[i] || `Guard ${i + 1}`,
        corruptibility,
        alertness: Math.random() * 0.5 + 0.3, // 0.3 to 0.8
        reputation,
      };
    }
    
    return {
      ...config,
      guards,
    };
  }

  /**
   * Create a weapon
   */
  private createWeapon(
    type: WeaponType,
    acquiredFrom: 'guard' | 'stolen' | 'crafted'
  ): Weapon {
    const templates = WEAPON_TEMPLATES[type];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return {
      id: `weapon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: template.name,
      damage: template.damage,
      concealment: template.concealment,
      durability: acquiredFrom === 'crafted' ? 60 : 100, // Crafted weapons are less durable
      acquiredFrom,
      acquiredAt: Date.now(),
    };
  }

  /**
   * Initialize gangs based on configuration
   * Preserves existing gang data if gangs already exist, only creates new gangs if needed
   */
  public initializeGangs(config: GangsConfig): GangsConfig {
    console.log('[GANGS] initializeGangs called with deathEnabled:', config.deathEnabled, 'weaponsEnabled:', config.weaponsEnabled);
    
    const existingGangs = config.gangs || {};
    const gangs: Record<string, Gang> = {};
    
    for (let i = 0; i < config.numberOfGangs; i++) {
      const gangId = `gang_${i + 1}`;
      
      // Preserve existing gang if it exists, otherwise create new
      if (existingGangs[gangId]) {
        // Ensure backward compatibility - add new fields if missing
        gangs[gangId] = {
          ...existingGangs[gangId],
          // Add drug economy fields if they don't exist
          money: existingGangs[gangId].money ?? 0,
          totalEarnings: existingGangs[gangId].totalEarnings ?? 0,
          items: existingGangs[gangId].items ?? [],
          drugsStash: existingGangs[gangId].drugsStash ?? 0,
        };
      } else {
        gangs[gangId] = {
          id: gangId,
          name: config.gangNames[i] || DEFAULT_GANG_NAMES[i],
          color: config.gangColors[i] || DEFAULT_GANG_COLORS[i],
          leaderId: config.gangLeaders[gangId] || null,
          memberIds: [],
          territoryControl: Math.max(0.1, 1.0 / config.numberOfGangs), // Equal distribution initially, minimum 10%
          resources: 50,
          reputation: 50,
          violence: Math.random() * 50 + 25, // Random violence 25-75
          loyalty: 70,
          weapons: [], // Empty weapon cache initially
          totalWeapons: 0,
          // Drug Economy
          money: 0,
          totalEarnings: 0,
          items: [],
          drugsStash: 0,
        };
      }
    }

    // Initialize guards if weapons are enabled and no guards exist
    // CRITICAL: Use spread first, then only override gangs - this preserves ALL settings
    let updatedConfig: GangsConfig = {
      ...config, // PRESERVE ALL CONFIG SETTINGS including deathEnabled, weaponsEnabled, etc.
      gangs, // Only update the gangs object
    };
    
    if (config.weaponsEnabled && Object.keys(config.guards || {}).length === 0) {
      updatedConfig = this.initializeGuards(updatedConfig);
    }

    console.log('[GANGS] initializeGangs returning with deathEnabled:', updatedConfig.deathEnabled, 'weaponsEnabled:', updatedConfig.weaponsEnabled);
    
    return updatedConfig;
  }

  /**
   * Assign a personality to a gang
   */
  public assignToGang(
    config: GangsConfig,
    personalityId: string,
    gangId: string,
    isLeader: boolean = false
  ): GangsConfig {
    const gang = config.gangs[gangId];
    if (!gang) {
      console.error(`Gang ${gangId} not found`);
      return config;
    }

    // Remove from previous gang if exists
    const previousStatus = config.memberStatus[personalityId];
    if (previousStatus?.gangId && previousStatus.gangId !== gangId) {
      const prevGang = config.gangs[previousStatus.gangId];
      if (prevGang) {
        prevGang.memberIds = prevGang.memberIds.filter(id => id !== personalityId);
        if (prevGang.leaderId === personalityId) {
          prevGang.leaderId = null;
        }
      }
    }

    // Add to new gang
    if (!gang.memberIds.includes(personalityId)) {
      gang.memberIds.push(personalityId);
    }

    // Set as leader if specified
    if (isLeader) {
      gang.leaderId = personalityId;
    }

    // Preserve existing status if they're already a member (just changing gangs)
    const existingStatus = config.memberStatus[personalityId];
    const existingRisk = existingStatus?.deathRiskModifier || 1.0;
    
    // Calculate initial death risk - leaders start with +50% risk
    const initialRisk = isLeader ? Math.min(3.0, existingRisk + 0.5) : existingRisk;

    // Update member status
    config.memberStatus[personalityId] = {
      gangId,
      rank: isLeader ? 'leader' : gang.leaderId ? 'soldier' : 'recruit',
      loyalty: 80,
      respect: isLeader ? 90 : 50,
      violence: existingStatus?.violence || Math.random() * 40 + 20, // Preserve or random 20-60
      hits: existingStatus?.hits || 0,
      imprisoned: false,
      killed: false,
      weapons: existingStatus?.weapons || [], // Preserve weapons if they had any
      bribeAttempts: existingStatus?.bribeAttempts || 0,
      successfulBribes: existingStatus?.successfulBribes || 0,
      weaponsStolen: existingStatus?.weaponsStolen || 0,
      weaponsLost: existingStatus?.weaponsLost || 0,
      deathRiskModifier: initialRisk, // Apply leadership risk
      deathImpactApplied: false,
      // Drug Economy
      drugsCarrying: existingStatus?.drugsCarrying || 0,
      drugsDealt: existingStatus?.drugsDealt || 0,
      drugsSmuggled: existingStatus?.drugsSmuggled || 0,
      drugsCaught: existingStatus?.drugsCaught || 0,
      sentenceExtensions: existingStatus?.sentenceExtensions || 0,
    };
    
    if (isLeader) {
      console.log(`[GANGS] ${personalityId} became gang leader - death risk now ${initialRisk.toFixed(2)}x`);
    }

    console.log('[GANGS] assignToGang preserving deathEnabled:', config.deathEnabled, 'weaponsEnabled:', config.weaponsEnabled);

    return { ...config };
  }

  /**
   * Remove a personality from their gang
   */
  public removeFromGang(config: GangsConfig, personalityId: string): GangsConfig {
    const status = config.memberStatus[personalityId];
    if (!status?.gangId) return config;

    const gang = config.gangs[status.gangId];
    if (gang) {
      gang.memberIds = gang.memberIds.filter(id => id !== personalityId);
      
      // If the removed member was the gang leader, promote a new one
      if (gang.leaderId === personalityId) {
        const newLeader = this.promoteNewGangLeader(config, gang.id);
        
        if (newLeader) {
          console.log(`[GANGS] 👑 ${newLeader} automatically promoted to leader of ${gang.name} after ${personalityId} left`);
        } else {
          gang.leaderId = null;
          console.log(`[GANGS] No successor found for ${gang.name} - gang has no leader`);
        }
      }
    }

    config.memberStatus[personalityId] = {
      gangId: null,
      rank: 'independent',
      loyalty: 0,
      respect: 30,
      violence: status.violence || 30,
      hits: status.hits || 0,
      imprisoned: status.imprisoned || false,
      imprisonedUntil: status.imprisonedUntil,
      killed: false,
      weapons: status.weapons || [],
      bribeAttempts: status.bribeAttempts || 0,
      successfulBribes: status.successfulBribes || 0,
      weaponsStolen: status.weaponsStolen || 0,
      weaponsLost: status.weaponsLost || 0,
      deathRiskModifier: status.deathRiskModifier || 1.0, // Preserve death risk
      deathImpactApplied: status.deathImpactApplied,
      // Drug Economy
        drugsCarrying: status.drugsCarrying || 0,
        drugsDealt: status.drugsDealt || 0,
        drugsSmuggled: status.drugsSmuggled || 0,
        drugsCaught: status.drugsCaught || 0,
        totalDrugEarnings: status.totalDrugEarnings || 0,
        rivalKills: status.rivalKills || 0,
        drugTrophies: status.drugTrophies || [],
      sentenceExtensions: status.sentenceExtensions || 0,
    };

    // Check if gang now has only leader remaining - if so, kill the leader
    if (gang && gang.leaderId && gang.memberIds.length === 1 && gang.memberIds[0] === gang.leaderId) {
      console.log(`[GANGS] Gang ${gang.name} reduced to only leader ${gang.leaderId} after member left - executing leader`);

      const leaderStatus = config.memberStatus[gang.leaderId];
      if (leaderStatus && !leaderStatus.killed) {
        leaderStatus.killed = true;
        leaderStatus.killedBy = 'system'; // System execution for collapsed gang
        leaderStatus.killedAt = Date.now();
        leaderStatus.deathRiskModifier = 0;

        // Remove leader from gang
        gang.memberIds = [];
        gang.leaderId = null;
        gang.resources = 0;
        gang.reputation = 0;
        console.log(`[GANGS] Executed leader ${gang.leaderId} of collapsed gang ${gang.name}`);
      }
    }

    console.log('[GANGS] removeFromGang preserving deathEnabled:', config.deathEnabled, 'weaponsEnabled:', config.weaponsEnabled);
    return { ...config };
  }

  /**
   * Attempt to recruit a personality to a gang
   */
  public attemptRecruitment(
    config: GangsConfig,
    gangId: string,
    targetPersonalityId: string,
    relationships?: Record<string, Record<string, { affinity: number; familiarity: number }>>,
    targetPersonalityName?: string
  ): { success: boolean; config: GangsConfig; message: string; gangMerger?: boolean; recruitedId?: string } {
    const gang = config.gangs[gangId];
    if (!gang) {
      return { success: false, config, message: 'Gang not found' };
    }

    const targetStatus = config.memberStatus[targetPersonalityId];
    
    // Already in gang
    if (targetStatus?.gangId === gangId) {
      return { success: false, config, message: `Already member of ${gang.name}` };
    }

    // Check if target is a gang leader - this will trigger a potential GANG MERGER
    const targetGang = targetStatus?.gangId ? config.gangs[targetStatus.gangId] : null;
    const isTargetLeader = targetGang?.leaderId === targetPersonalityId;

    // Already in another gang - harder to recruit (but leaders have special logic)
    if (targetStatus?.gangId) {
      const currentGang = config.gangs[targetStatus.gangId];
      if (currentGang && targetStatus.loyalty > 60 && !isTargetLeader) {
        return { 
          success: false, 
          config, 
          message: `Too loyal to ${currentGang.name} (${targetStatus.loyalty}%)` 
        };
      }
    }

    // Calculate recruitment chance based on multiple factors
    let recruitChance = 0.4; // Base 40% chance

    // Gang reputation bonus
    recruitChance += (gang.reputation / 100) * 0.2; // Up to +20%

    // Relationship with gang leader bonus
    if (gang.leaderId && relationships?.[gang.leaderId]?.[targetPersonalityId]) {
      const affinity = relationships[gang.leaderId][targetPersonalityId].affinity;
      recruitChance += affinity * 0.15; // -15% to +15%
    }

    // Prison environment intensity makes recruitment easier
    recruitChance += config.prisonEnvironmentIntensity * 0.15; // Up to +15%

    // GANG LEADERS are VERY HARD to recruit (would trigger gang merger)
    // They have everything to lose - their power, status, and loyalty from their gang
    if (isTargetLeader) {
      recruitChance *= 0.2; // 80% reduction in chance - leaders are extremely difficult to flip
      
      // Additional requirements for leader recruitment
      // Need high reputation AND high prison intensity to even have a chance
      if (gang.reputation < 60) {
        recruitChance *= 0.5; // Further reduce if recruiting gang isn't strong enough
      }
      if (config.prisonEnvironmentIntensity < 0.5) {
        recruitChance *= 0.5; // Leaders only flip in high-pressure environments
      }
    }

    // Roll the dice
    if (Math.random() < recruitChance) {
      const targetName = targetPersonalityName || targetPersonalityId;
      let message = `${targetName} successfully recruited to ${gang.name}!`;
      let gangMerger = false;

      // GANG MERGER: If recruiting a gang leader, merge their entire gang
      if (isTargetLeader && targetGang) {
        console.log(`[GANGS] MERGER: ${targetGang.name} leader recruited, merging gang into ${gang.name}`);
        
        // Get all members from the target gang (excluding the leader who's being recruited)
        const membersToMerge = targetGang.memberIds.filter(id => id !== targetPersonalityId);
        
        // Transfer all members to the recruiting gang
        membersToMerge.forEach(memberId => {
          if (!gang.memberIds.includes(memberId)) {
            gang.memberIds.push(memberId);
          }
          
          // Update member status to new gang
          if (config.memberStatus[memberId]) {
            config.memberStatus[memberId].gangId = gangId;
            config.memberStatus[memberId].loyalty = 60; // Moderate loyalty after merger
            config.memberStatus[memberId].rank = 'soldier'; // Reset rank to soldier
          }
        });

        // Boost recruiting gang's stats with merger
        gang.reputation = Math.min(100, gang.reputation + (targetGang.reputation * 0.3));
        gang.resources = Math.min(100, gang.resources + (targetGang.resources * 0.5));
        gang.territoryControl = Math.min(1.0, gang.territoryControl + targetGang.territoryControl);

        // Normalize territory control across all gangs
        const totalTerritory = Object.values(config.gangs).reduce((sum, g) => sum + g.territoryControl, 0);
        if (totalTerritory > 1.0) {
          Object.values(config.gangs).forEach(g => {
            g.territoryControl = g.territoryControl / totalTerritory;
          });
        }

        // Dissolve the old gang
        delete config.gangs[targetGang.id];
        delete config.gangLeaders[targetGang.id];

        message = `🔥 GANG MERGER! ${targetName} (${targetGang.name} leader) recruited! ${membersToMerge.length} members absorbed into ${gang.name}. Combined power: +${Math.floor(targetGang.reputation * 0.3)} reputation, +${Math.floor(targetGang.resources * 0.5)} resources!`;
        gangMerger = true;
      }

      // Assign the recruited person (or leader) to the new gang
      const newConfig = this.assignToGang(config, targetPersonalityId, gangId, false);
      
      return {
        success: true,
        config: newConfig,
        message,
        gangMerger,
        recruitedId: targetPersonalityId,
      };
    }

    return { success: false, config, message: 'Recruitment failed' };
  }

  /**
   * Calculate a gang member's success score for ranking purposes
   */
  public calculateMemberSuccessScore(status: GangMemberStatus): number {
    let score = 0;
    
    // Drug earnings (primary success metric)
    score += status.totalDrugEarnings * 0.1; // $1 = 0.1 points
    
    // Respect and loyalty
    score += status.respect * 2; // High respect = leadership potential
    score += status.loyalty; // Loyalty to gang
    
    // Rival kills (teardrop tattoos)
    score += status.rivalKills * 50; // Major achievement
    
    // Successful operations
    score += status.drugsDealt * 0.01; // Grams dealt
    score += status.drugsSmuggled * 0.02; // Smuggling is riskier
    score += status.successfulBribes * 20; // Successful corruption
    score += status.weaponsStolen * 15; // Weapon acquisition
    
    // Rank bonus
    const rankBonus = {
      'leader': 1000,
      'lieutenant': 500,
      'soldier': 100,
      'recruit': 0,
      'independent': -100
    };
    score += rankBonus[status.rank] || 0;
    
    // Penalties
    score -= status.drugsCaught * 10; // Getting caught is bad
    score -= status.weaponsLost * 10; // Losing weapons
    score -= status.imprisoned ? 50 : 0; // Currently imprisoned
    score -= status.killed ? 10000 : 0; // Dead members go to bottom
    
    return Math.max(0, score);
  }

  /**
   * Calculate and award drug trophies based on earnings
   */
  public updateDrugTrophies(status: GangMemberStatus): string[] {
    const newTrophies: string[] = [];
    const earnings = status.totalDrugEarnings || 0;
    
    // Trophy thresholds: $3500 (Drug Medal), $5000, $10000, $20000, $50000
    const trophyLevels = [
      { threshold: 3500, trophy: 'medal', emoji: '🏅', name: 'Drug Medal' },
      { threshold: 5000, trophy: 'bronze', emoji: '🏆', name: 'Bronze Trophy' },
      { threshold: 10000, trophy: 'silver', emoji: '🥈', name: 'Silver Trophy' },
      { threshold: 20000, trophy: 'gold', emoji: '🥇', name: 'Gold Trophy' },
      { threshold: 50000, trophy: 'platinum', emoji: '💎', name: 'Platinum Medal' }
    ];
    
    for (const level of trophyLevels) {
      if (earnings >= level.threshold && !status.drugTrophies.includes(level.trophy as any)) {
        status.drugTrophies.push(level.trophy as any);
        newTrophies.push(`${level.emoji} ${level.name} for $${level.threshold.toLocaleString()} in drug earnings!`);
      }
    }
    
    return newTrophies;
  }

  /**
   * Attempt to bribe guards to release an imprisoned gang member
   */
  public attemptPrisonReleaseBribe(
    config: GangsConfig,
    personalityId: string
  ): { success: boolean; cost: number; config: GangsConfig; message: string } {
    const status = config.memberStatus[personalityId];
    if (!status || !status.gangId) {
      return { success: false, cost: 0, config, message: 'Personality not found or not in gang' };
    }

    if (!status.imprisoned) {
      return { success: false, cost: 0, config, message: 'Member is not imprisoned' };
    }

    const gang = config.gangs[status.gangId];
    if (!gang) {
      return { success: false, cost: 0, config, message: 'Gang not found' };
    }

    const bribeCost = 250;
    
    // Check if gang has enough money
    if (gang.money < bribeCost) {
      return { 
        success: false, 
        cost: bribeCost, 
        config, 
        message: `Not enough gang money for release bribe. Need $${bribeCost}, have $${gang.money}` 
      };
    }

    // Deduct money and release member
    gang.money -= bribeCost;
    status.imprisoned = false;
    status.imprisonedUntil = undefined;
    
    // Small reputation hit for bribing guards
    gang.reputation = Math.max(0, gang.reputation - 5);

    return {
      success: true,
      cost: bribeCost,
      config: { ...config },
      message: `💰 Bribed guards $${bribeCost} to release member from solitary confinement! Gang money: $${gang.money}`
    };
  }

  /**
   * Attempt to bribe a guard for a weapon
   */
  public attemptGuardBribe(
    config: GangsConfig,
    personalityId: string,
    weaponType: WeaponType
  ): { success: boolean; config: GangsConfig; message: string; weapon?: Weapon } {
    if (!config.weaponsEnabled || !config.guardBriberyEnabled) {
      return { success: false, config, message: 'Guard bribery is disabled' };
    }

    const status = config.memberStatus[personalityId];
    if (!status) {
      return { success: false, config, message: 'Personality not found' };
    }

    if (status.killed || status.imprisoned) {
      return { success: false, config, message: 'Cannot bribe guards while imprisoned or dead' };
    }

    // Select a random guard
    let guardIds = Object.keys(config.guards);
    if (guardIds.length === 0) {
      config = this.initializeGuards(config);
      guardIds = Object.keys(config.guards); // Re-fetch after initialization
    }
    const guardId = guardIds[Math.floor(Math.random() * guardIds.length)];
    const guard = config.guards[guardId];

    // Calculate bribe cost based on weapon type
    const baseCost = weaponType === 'gun' ? 30 : weaponType === 'chain' ? 15 : 10;
    const cost = Math.floor(baseCost * (2 - guard.corruptibility)); // More corrupt = cheaper

    // Check if personality/gang has enough resources
    const gang = status.gangId ? config.gangs[status.gangId] : null;
    const availableResources = gang ? gang.resources : status.respect; // Independent uses respect as currency

    if (availableResources < cost) {
      return { 
        success: false, 
        config, 
        message: `Not enough resources. Need ${cost}, have ${availableResources.toFixed(0)}` 
      };
    }

    // Calculate bribe success chance
    let successChance = guard.corruptibility; // Base chance
    successChance += (status.respect / 100) * 0.2; // Up to +20% from respect
    if (gang) {
      successChance += (gang.reputation / 100) * 0.15; // Up to +15% from gang reputation
    }
    successChance -= guard.alertness * 0.3; // Reduce by guard alertness

    // Record bribe attempt
    status.bribeAttempts += 1;
    console.log(`[GANGS BRIBE] ${personalityId} bribe attempt #${status.bribeAttempts} - targeting ${guard.name}`);

    const attempt: GuardBribeAttempt = {
      id: `bribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      personalityId,
      weaponType,
      cost,
      success: false,
      timestamp: Date.now(),
      guardId,
    };

    // Attempt bribe
    if (Math.random() < successChance) {
      // Success! Create weapon and give to personality
      const weapon = this.createWeapon(weaponType, 'guard');
      console.log(`[GANGS WEAPONS] Created weapon:`, weapon);
      console.log(`[GANGS WEAPONS] Before adding - ${personalityId} has ${status.weapons.length} weapons`);
      
      status.weapons.push(weapon);
      status.successfulBribes += 1;
      attempt.success = true;
      console.log(`[GANGS BRIBE] ${personalityId} successful bribe! Total attempts: ${status.bribeAttempts}, successes: ${status.successfulBribes}`);
      
      console.log(`[GANGS WEAPONS] After adding - ${personalityId} has ${status.weapons.length} weapons:`, status.weapons.map(w => w.name));

      // Deduct resources
      if (gang) {
        gang.resources = Math.max(0, gang.resources - cost);
        gang.totalWeapons += 1;
        console.log(`[GANGS WEAPONS] Gang ${gang.name} now has ${gang.totalWeapons} total weapons`);
      } else {
        status.respect = Math.max(0, status.respect - cost);
      }

      // Increase respect for successful bribe
      status.respect = Math.min(100, status.respect + 5);
      
      // Successfully bribing guards is a RISKY action - increases death risk by 50% (armed + known to guards)
      status.deathRiskModifier = Math.min(3.0, (status.deathRiskModifier || 1.0) + 0.5);
      console.log(`[GANGS] Successfully bribed guard for weapon - death risk now ${status.deathRiskModifier.toFixed(2)}x`);

      config.bribeHistory.push(attempt);

      return {
        success: true,
        config: { ...config },
        message: `🤝 Successfully bribed ${guard.name}! Received ${weapon.name}. Cost: ${cost} resources.`,
        weapon,
      };
    } else {
      // Failed - guard refuses or catches you
      const caught = Math.random() < guard.alertness;
      
      if (caught && config.solitaryConfinementEnabled) {
        status.imprisoned = true;
        status.imprisonedUntil = Date.now() + 45000; // 45 seconds in solitary for failed bribe
        config.bribeHistory.push(attempt);
        
        return {
          success: false,
          config: { ...config },
          message: `⚠️ ${guard.name} caught the bribe attempt! Sent to SOLITARY CONFINEMENT!`,
        };
      }

      // Just failed, no punishment
      if (gang) {
        gang.resources = Math.max(0, gang.resources - cost / 2); // Lose half the bribe
      }

      let deathRiskIncreased = false;
      const suspicionChance = 0.25 + guard.alertness * 0.35; // 25% base, more if guard is alert
      if (Math.random() < suspicionChance) {
        const existingRisk = status.deathRiskModifier || 1.0;
        const additionalRisk = 0.2 + guard.alertness * 0.5; // Up to +0.7 risk for highly alert guards
        status.deathRiskModifier = clamp(existingRisk + additionalRisk, 1.0, 3.0);
        deathRiskIncreased = status.deathRiskModifier > existingRisk;
        if (deathRiskIncreased) {
          console.log(
            `[GANGS BRIBE] ${personalityId} failed bribe increased death risk to ${status.deathRiskModifier.toFixed(2)}x`
          );
        }
      }

      config.bribeHistory.push(attempt);
      console.log(`[GANGS BRIBE] ${personalityId} failed bribe. Total attempts: ${status.bribeAttempts}, successes: ${status.successfulBribes}`);

      let failureMessage = `❌ ${guard.name} refused the bribe. Lost ${(cost / 2).toFixed(0)} resources.`;
      if (deathRiskIncreased) {
        failureMessage += ` Guards are now suspicious – death risk ${(status.deathRiskModifier || 1).toFixed(2)}x.`;
      }

      return {
        success: false,
        config: { ...config },
        message: failureMessage,
      };
    }
  }

  public applyEnvironmentParameters(
    config: GangsConfig,
    updates: Partial<Pick<GangsConfig, 'prisonEnvironmentIntensity' | 'violenceFrequency' | 'loyaltyDecayRate' | 'rivalHostilityMultiplier'>>
  ): GangsConfig {
    try {
      if (!config) {
        console.error('[GANGS SERVICE] No config provided to applyEnvironmentParameters');
        return this.getDefaultConfig();
      }
      
      const updatedConfig: GangsConfig = {
        ...config,
        ...updates,
        gangs: { ...config.gangs },
        memberStatus: { ...config.memberStatus },
        guards: { ...config.guards },
        bribeHistory: [...(config.bribeHistory || [])],
    };

    const intensityDelta =
      updates.prisonEnvironmentIntensity !== undefined
        ? updates.prisonEnvironmentIntensity - config.prisonEnvironmentIntensity
        : 0;
    const violenceDelta =
      updates.violenceFrequency !== undefined ? updates.violenceFrequency - config.violenceFrequency : 0;
    const loyaltyDelta =
      updates.loyaltyDecayRate !== undefined ? updates.loyaltyDecayRate - config.loyaltyDecayRate : 0;
    const hostilityDelta =
      updates.rivalHostilityMultiplier !== undefined
        ? (updates.rivalHostilityMultiplier - (config.rivalHostilityMultiplier ?? 1.0))
        : 0;

    Object.entries(updatedConfig.gangs).forEach(([gangId, gang]) => {
      const updatedGang = {
        ...gang,
        memberIds: [...gang.memberIds],
        weapons: [...gang.weapons],
      };

      if (intensityDelta !== 0 || violenceDelta !== 0 || hostilityDelta !== 0) {
        const violenceShift = intensityDelta * 60 + violenceDelta * 80 + hostilityDelta * 30;
        if (violenceShift !== 0) {
          updatedGang.violence = clamp(updatedGang.violence + violenceShift, 0, 100);
        }

        const reputationShift = intensityDelta * 15 + hostilityDelta * 10;
        if (reputationShift !== 0) {
          updatedGang.reputation = clamp(updatedGang.reputation + reputationShift, 0, 100);
        }
      }

      if (loyaltyDelta !== 0 || intensityDelta !== 0) {
        const loyaltyShift = -loyaltyDelta * 100 - intensityDelta * 20;
        if (loyaltyShift !== 0) {
          updatedGang.loyalty = clamp(updatedGang.loyalty + loyaltyShift, 0, 100);
        }
      }

      updatedConfig.gangs[gangId] = updatedGang;
    });

    Object.entries(updatedConfig.memberStatus).forEach(([personalityId, status]) => {
      const updatedStatus: GangMemberStatus = {
        ...status,
        weapons: [...status.weapons],
      };

      if (intensityDelta !== 0 || violenceDelta !== 0 || hostilityDelta !== 0) {
        const memberViolenceShift = intensityDelta * 50 + violenceDelta * 70 + hostilityDelta * 25;
        if (memberViolenceShift !== 0) {
          updatedStatus.violence = clamp(updatedStatus.violence + memberViolenceShift, 0, 100);
        }

        const deathRiskShift = intensityDelta * 0.6 + violenceDelta * 0.8 + hostilityDelta * 0.4;
        if (deathRiskShift !== 0) {
          const existingRisk = updatedStatus.deathRiskModifier || 1.0;
          updatedStatus.deathRiskModifier = clamp(existingRisk + deathRiskShift, 1.0, 3.0);
        }
      }

      if (loyaltyDelta !== 0 || intensityDelta !== 0) {
        const loyaltyShift = -loyaltyDelta * 80 - intensityDelta * 15;
        if (loyaltyShift !== 0) {
          updatedStatus.loyalty = clamp(updatedStatus.loyalty + loyaltyShift, 0, 100);
        }
      }

      updatedConfig.memberStatus[personalityId] = updatedStatus;
    });

      return updatedConfig;
    } catch (error) {
      console.error('[GANGS SERVICE] Error in applyEnvironmentParameters:', error);
      console.error('[GANGS SERVICE] Returning original config to prevent crash');
      return config; // Return original config, not defaults
    }
  }

  /**
   * Craft an improvised weapon
   */
  public craftWeapon(
    config: GangsConfig,
    personalityId: string,
    weaponType: WeaponType
  ): { success: boolean; config: GangsConfig; message: string; weapon?: Weapon } {
    if (!config.weaponsEnabled || !config.weaponCraftingEnabled) {
      return { success: false, config, message: 'Weapon crafting is disabled' };
    }

    const status = config.memberStatus[personalityId];
    if (!status) {
      return { success: false, config, message: 'Personality not found' };
    }

    if (status.killed || status.imprisoned) {
      return { success: false, config, message: 'Cannot craft while imprisoned or dead' };
    }

    // Guns cannot be crafted
    if (weaponType === 'gun') {
      return { success: false, config, message: 'Guns cannot be crafted - must be obtained from guards' };
    }

    // Calculate crafting success based on violence stat (experience)
    const craftingChance = 0.5 + (status.violence / 100) * 0.4; // 50-90% chance

    if (Math.random() < craftingChance) {
      const weapon = this.createWeapon(weaponType, 'crafted');
      console.log(`[GANGS WEAPONS] Crafted weapon:`, weapon);
      console.log(`[GANGS WEAPONS] Before crafting - ${personalityId} has ${status.weapons.length} weapons`);
      
      status.weapons.push(weapon);
      status.respect = Math.min(100, status.respect + 2); // Small respect boost
      
      console.log(`[GANGS WEAPONS] After crafting - ${personalityId} has ${status.weapons.length} weapons:`, status.weapons.map(w => w.name));
      
      // Crafting weapons shows capability - increases death risk by 25%
      status.deathRiskModifier = Math.min(3.0, (status.deathRiskModifier || 1.0) + 0.25);
      console.log(`[GANGS] Crafted weapon - death risk now ${status.deathRiskModifier.toFixed(2)}x`);

      const gang = status.gangId ? config.gangs[status.gangId] : null;
      if (gang) {
        gang.totalWeapons += 1;
        console.log(`[GANGS WEAPONS] Gang ${gang.name} now has ${gang.totalWeapons} total weapons`);
      }

      return {
        success: true,
        config: { ...config },
        message: `🔨 Successfully crafted ${weapon.name}!`,
        weapon,
      };
    }

    return {
      success: false,
      config: { ...config },
      message: '❌ Failed to craft weapon. Try again later.',
    };
  }

  /**
   * Steal a weapon from another personality (after successful violence)
   */
  public stealWeapon(
    config: GangsConfig,
    thiefId: string,
    victimId: string
  ): { success: boolean; config: GangsConfig; message: string; weapon?: Weapon } {
    if (!config.weaponsEnabled || !config.weaponStealingEnabled) {
      return { success: false, config, message: 'Weapon stealing is disabled' };
    }

    const thiefStatus = config.memberStatus[thiefId];
    const victimStatus = config.memberStatus[victimId];

    if (!thiefStatus || !victimStatus) {
      return { success: false, config, message: 'Invalid thief or victim' };
    }

    if (victimStatus.weapons.length === 0) {
      return { success: false, config, message: 'Victim has no weapons to steal' };
    }

    // Steal a random weapon from victim
    const weaponIndex = Math.floor(Math.random() * victimStatus.weapons.length);
    const stolenWeapon = victimStatus.weapons[weaponIndex];
    
    // Remove from victim
    victimStatus.weapons.splice(weaponIndex, 1);
    victimStatus.weaponsLost += 1;

    // Add to thief
    thiefStatus.weapons.push(stolenWeapon);
    thiefStatus.weaponsStolen += 1;
    thiefStatus.respect = Math.min(100, thiefStatus.respect + 8); // Respect for taking weapon
    
    // Stealing weapons is a HIGH RISK action - increases death risk by 50%
    thiefStatus.deathRiskModifier = Math.min(3.0, (thiefStatus.deathRiskModifier || 1.0) + 0.5);
    console.log(`[GANGS] ${thiefStatus.gangId ? 'Gang member' : 'Independent'} stole weapon - death risk now ${thiefStatus.deathRiskModifier.toFixed(2)}x`);

    return {
      success: true,
      config: { ...config },
      message: `🔪 Stole ${stolenWeapon.name} from victim!`,
      weapon: stolenWeapon,
    };
  }

  /**
   * Get the best weapon from a personality's arsenal
   */
  private getBestWeapon(status: GangMemberStatus): Weapon | null {
    if (status.weapons.length === 0) return null;
    
    // Sort by damage and return highest
    return status.weapons.reduce((best, weapon) => {
      return weapon.damage > best.damage ? weapon : best;
    });
  }

  /**
   * Degrade weapon durability after use
   */
  private degradeWeapon(weapon: Weapon, status: GangMemberStatus): void {
    weapon.durability = Math.max(0, weapon.durability - (Math.random() * 15 + 5)); // Lose 5-20 durability
    
    // Remove weapon if broken
    if (weapon.durability <= 0) {
      const index = status.weapons.findIndex(w => w.id === weapon.id);
      if (index !== -1) {
        status.weapons.splice(index, 1);
      }
    }
  }

  /**
   * Calculate death risk modifier for a gang member based on their actions and status
   * Returns a multiplier: 1.0 = normal risk, 1.5 = 50% higher, 2.0 = 100% higher, etc.
   */
  private calculateDeathRiskModifier(status: GangMemberStatus, config: GangsConfig): number {
    let riskModifier = status.deathRiskModifier || 1.0;
    
    // Gang leaders are high-value targets (+50% death risk)
    if (status.rank === 'leader') {
      riskModifier += 0.5;
    }
    
    // Having weapons makes you a more dangerous target (+25% per weapon after first)
    if (status.weapons.length > 0) {
      riskModifier += (status.weapons.length - 1) * 0.25;
      
      // Having a gun significantly increases risk (+50%)
      const hasGun = status.weapons.some(w => w.type === 'gun');
      if (hasGun) {
        riskModifier += 0.5;
      }
    }
    
    // High violence stat makes you a priority target (+50% at 80+ violence)
    if (status.violence >= 80) {
      riskModifier += 0.5;
    }
    
    // Many hits make you a known threat (+25% at 5+ hits)
    if (status.hits >= 5) {
      riskModifier += 0.25;
    }
    
    // Recent weapon stealing makes you a target (+50% temporary risk)
    if (status.weaponsStolen > 0) {
      riskModifier += 0.5;
    }
    
    return Math.min(3.0, riskModifier); // Cap at 3x risk
  }

  /**
   * Automatically promote the best candidate to gang leader
   * Called when the current leader is killed or removed
   */
  private promoteNewGangLeader(config: GangsConfig, gangId: string): string | null {
    const gang = config.gangs[gangId];
    if (!gang || gang.memberIds.length === 0) {
      return null;
    }

    // Find all eligible candidates (alive, not imprisoned)
    const eligibleMembers = gang.memberIds.filter(memberId => {
      const status = config.memberStatus[memberId];
      return status && !status.killed && !status.imprisoned;
    });

    if (eligibleMembers.length === 0) {
      console.log(`[GANGS] No eligible members to promote in ${gang.name}`);
      return null;
    }

    // Rank priority: soldier > recruit > other
    const rankPriority: Record<string, number> = {
      'soldier': 3,
      'recruit': 2,
      'independent': 1,
    };

    // Sort candidates by: rank (highest first), then respect (highest first)
    const bestCandidate = eligibleMembers.sort((a, b) => {
      const statusA = config.memberStatus[a];
      const statusB = config.memberStatus[b];
      
      if (!statusA || !statusB) return 0;

      // First compare by rank
      const rankA = rankPriority[statusA.rank] || 0;
      const rankB = rankPriority[statusB.rank] || 0;
      
      if (rankA !== rankB) {
        return rankB - rankA; // Higher rank first
      }

      // If ranks are equal, compare by respect
      return statusB.respect - statusA.respect; // Higher respect first
    })[0];

    // Promote the best candidate to leader
    const newLeaderStatus = config.memberStatus[bestCandidate];
    if (newLeaderStatus) {
      newLeaderStatus.rank = 'leader';
      newLeaderStatus.respect = Math.min(100, newLeaderStatus.respect + 10); // Bonus respect for promotion
      newLeaderStatus.deathRiskModifier = Math.min(3.0, (newLeaderStatus.deathRiskModifier || 1.0) + 0.5); // Leaders have higher death risk
      
      gang.leaderId = bestCandidate;
      
      console.log(`[GANGS] 👑 ${bestCandidate} promoted to leader of ${gang.name} (respect: ${newLeaderStatus.respect}, old rank: ${newLeaderStatus.rank})`);
      return bestCandidate;
    }

    return null;
  }

  /**
   * Simulate a violence event
   */
  public simulateViolence(
    config: GangsConfig,
    attackerId: string,
    targetId: string
  ): { config: GangsConfig; message: string; outcome: 'hit' | 'miss' | 'retaliation' | 'imprisoned' | 'killed'; killedPersonalityId?: string; weaponUsed?: Weapon; weaponStolen?: Weapon } {
    const attackerStatus = config.memberStatus[attackerId];
    const targetStatus = config.memberStatus[targetId];

    if (!attackerStatus || !targetStatus) {
      return { config, message: 'Invalid attacker or target', outcome: 'miss' };
    }

    // Check if target is already killed
    if (targetStatus.killed) {
      return { config, message: 'Target already killed', outcome: 'miss' };
    }

    // Increase violence stat
    attackerStatus.violence = Math.min(100, attackerStatus.violence + 5);
    attackerStatus.hits += 1;
    
    // Committing violence increases death risk (+10% per violent act)
    attackerStatus.deathRiskModifier = Math.min(3.0, (attackerStatus.deathRiskModifier || 1.0) + 0.1);

    // Calculate success based on violence and gang backing
    const attackerGang = attackerStatus.gangId ? config.gangs[attackerStatus.gangId] : null;
    const targetGang = targetStatus.gangId ? config.gangs[targetStatus.gangId] : null;

    let successChance = 0.5;
    successChance += (attackerStatus.violence / 100) * 0.2;
    if (attackerGang) {
      successChance += (attackerGang.violence / 100) * 0.15;
    }

    // Check if attacker has a weapon - increases success chance and damage
    let weaponUsed: Weapon | null = null;
    let weaponDamageBonus = 0;
    if (config.weaponsEnabled && attackerStatus.weapons.length > 0) {
      weaponUsed = this.getBestWeapon(attackerStatus);
      if (weaponUsed) {
        weaponDamageBonus = weaponUsed.damage / 100; // 0 to 1.0 bonus
        successChance += weaponDamageBonus * 0.3; // Up to +30% success with gun
        successChance = Math.min(0.95, successChance); // Cap at 95%
      }
    }

    const success = Math.random() < successChance;

    if (success) {
      // Degrade weapon if used
      if (weaponUsed) {
        this.degradeWeapon(weaponUsed, attackerStatus);
      }

      // Attempt to steal weapon from victim if enabled (BEFORE death check so killer can loot victim)
      let stolenWeapon: Weapon | undefined;
      if (config.weaponsEnabled && config.weaponStealingEnabled && targetStatus.weapons.length > 0 && Math.random() < 0.4) {
        const stealResult = this.stealWeapon(config, attackerId, targetId);
        if (stealResult.success) {
          stolenWeapon = stealResult.weapon;
        }
      }

      // Calculate death probability - greatly increased with weapons
      let deathChance = config.deathProbability;
      if (weaponUsed) {
        deathChance *= (1 + weaponDamageBonus * 3); // Up to 4x death chance with gun
      }
      
      // Higher violence stats increase death chance
      const violenceMultiplier = 1 + (attackerStatus.violence / 100) * 0.5; // Up to 1.5x from high violence
      deathChance *= violenceMultiplier;
      
      // Calculate target's death risk based on their actions and status
      const targetRiskModifier = this.calculateDeathRiskModifier(targetStatus, config);
      deathChance *= targetRiskModifier;
      
      console.log(`[GANGS] Death calculation - Base: ${config.deathProbability}, Weapon: ${weaponUsed ? weaponDamageBonus : 'none'}, Violence: ${violenceMultiplier.toFixed(2)}x, Target Risk: ${targetRiskModifier.toFixed(2)}x, Final: ${(deathChance * 100).toFixed(1)}%`);

      // Check for DEATH if enabled
      // Death can happen if: using a weapon OR attacker has extreme violence (80+) OR random critical hit
      const canCauseDeath = weaponUsed || attackerStatus.violence >= 80 || Math.random() < 0.1;
      
      if (config.deathEnabled && canCauseDeath && Math.random() < deathChance) {
        targetStatus.killed = true;
        targetStatus.killedBy = attackerId;
        targetStatus.killedAt = Date.now();
        targetStatus.deathImpactApplied = false;

        // Massive respect gain for killer
        attackerStatus.respect = Math.min(100, attackerStatus.respect + 30);

        // Check if attacker's gang now has only the attacker remaining - if so, kill the attacker too
        if (attackerGang && attackerGang.leaderId && attackerGang.memberIds.length === 1 && attackerGang.memberIds[0] === attackerGang.leaderId) {
          console.log(`[GANGS] Attacker's gang ${attackerGang.name} reduced to only attacker ${attackerId} - executing attacker`);

          attackerStatus.killed = true;
          attackerStatus.killedBy = 'system'; // System execution for self-collapsed gang
          attackerStatus.killedAt = Date.now();
          attackerStatus.deathRiskModifier = 0;
          attackerStatus.deathImpactApplied = false;

          // Remove attacker from gang
          attackerGang.memberIds = [];
          attackerGang.leaderId = null;
          attackerGang.resources = 0;
          attackerGang.reputation = 0;
          console.log(`[GANGS] Executed attacker ${attackerId} of collapsed gang ${attackerGang.name}`);
        }
        
        // Remove target from gang
        if (targetGang) {
          targetGang.memberIds = targetGang.memberIds.filter(id => id !== targetId);
          
          // If the killed member was the gang leader, promote a new one
          if (targetGang.leaderId === targetId) {
            const newLeader = this.promoteNewGangLeader(config, targetGang.id);
            
            if (newLeader) {
              console.log(`[GANGS] 👑 ${newLeader} automatically promoted to leader of ${targetGang.name} after ${targetId} was killed`);
            } else {
              targetGang.leaderId = null;
              console.log(`[GANGS] No successor found for ${targetGang.name} - gang has no leader`);
            }
          }

          // Check if gang now has only leader remaining - if so, kill the leader
          if (targetGang.leaderId && targetGang.memberIds.length === 1 && targetGang.memberIds[0] === targetGang.leaderId) {
            console.log(`[GANGS] Gang ${targetGang.name} reduced to only leader ${targetGang.leaderId} after violence - executing leader`);

            const leaderStatus = config.memberStatus[targetGang.leaderId];
            if (leaderStatus && !leaderStatus.killed) {
              leaderStatus.killed = true;
              leaderStatus.killedBy = attackerId; // Killed by the attacker who collapsed the gang
              leaderStatus.killedAt = Date.now();
              leaderStatus.deathRiskModifier = 0;
              leaderStatus.deathImpactApplied = false;

              // Remove leader from gang
              targetGang.memberIds = [];
              targetGang.leaderId = null;
              targetGang.resources = 0;
              targetGang.reputation = 0;
              console.log(`[GANGS] Executed leader ${targetGang.leaderId} of collapsed gang ${targetGang.name}`);
            }
          }
        }
        
        // Massive respect gain for killing
        let killRespectGain = 30; // Base for killing
        
        // Killing a leader gives even more respect
        if (targetStatus.rank === 'leader') {
          killRespectGain += 20; // +50 total for killing a leader
        }
        
        // Apply hostility multiplier
        killRespectGain = Math.floor(killRespectGain * (config.rivalHostilityMultiplier || 1.0));
        
        attackerStatus.respect = Math.min(100, attackerStatus.respect + killRespectGain);
        
        const weaponInfo = weaponUsed ? ` with ${weaponUsed.name}` : '';
        const lootInfo = stolenWeapon ? ` Looted ${stolenWeapon.name}.` : '';
        const targetInfo = targetStatus.rank === 'leader' ? ` (GANG LEADER)` : '';
        
        // Check if a new leader was promoted
        let successionInfo = '';
        if (targetStatus.rank === 'leader' && targetGang && targetGang.leaderId) {
          const newLeaderStatus = config.memberStatus[targetGang.leaderId];
          if (newLeaderStatus) {
            successionInfo = ` 👑 ${targetGang.leaderId} promoted to new ${targetGang.name} leader!`;
          }
        }
        
        return {
          config: { ...config },
          message: `💀 DEATH: ${attackerId} KILLED ${targetId}${targetInfo}${weaponInfo}! Respect +${killRespectGain}.${lootInfo} Victim will be removed from the system.${successionInfo}`,
          outcome: 'killed',
          killedPersonalityId: targetId,
          weaponUsed: weaponUsed || undefined,
          weaponStolen: stolenWeapon,
        };
      }
      
      // Calculate dynamic respect gains based on multiple factors
      let respectGain = 8; // Base respect gain
      
      // Weapon used increases respect gain
      if (weaponUsed) {
        const weaponRespect = Math.floor((weaponUsed.damage / 100) * 12); // Gun = +10-11, Shank = +3-6
        respectGain += weaponRespect;
      }
      
      // Attacking a leader or high-respect target gives more respect
      if (targetStatus.rank === 'leader') {
        respectGain += 8; // Hitting a leader is a big deal
      } else if (targetStatus.respect > 70) {
        respectGain += 5; // Hitting someone respected
      }
      
      // Weapon stolen adds respect
      if (stolenWeapon) {
        respectGain += 3;
      }
      
      // Apply rival hostility multiplier to respect gains (more aggressive = more respect for violence)
      respectGain = Math.floor(respectGain * (config.rivalHostilityMultiplier || 1.0));
      
      // Cap respect gain at 30
      respectGain = Math.min(30, respectGain);
      
      attackerStatus.respect = Math.min(100, attackerStatus.respect + respectGain);
      
      // Calculate dynamic respect loss for target
      let respectLoss = 10; // Base loss
      if (weaponUsed) {
        respectLoss += Math.floor((weaponUsed.damage / 100) * 8); // More damage = more humiliation
      }
      if (stolenWeapon) {
        respectLoss += 5; // Losing a weapon is embarrassing
      }
      respectLoss = Math.min(25, respectLoss);
      
      targetStatus.respect = Math.max(0, targetStatus.respect - respectLoss);

      // Check for solitary confinement (variable chance based on violence)
      const confinementChance = 0.4 + (attackerStatus.hits / 20); // 40% base, +5% per hit
      if (config.solitaryConfinementEnabled && attackerStatus.hits >= 3 && Math.random() < confinementChance) {
        // Longer sentences for more violent offenders or weapon use
        const baseDuration = 60000; // 1 minute base
        const hitMultiplier = 1 + (attackerStatus.hits / 10); // +10% per hit
        const weaponMultiplier = weaponUsed ? 1.5 : 1.0; // 50% longer if weapon used
        const duration = Math.floor(baseDuration * hitMultiplier * weaponMultiplier);
        
        attackerStatus.imprisoned = true;
        attackerStatus.imprisonedUntil = Date.now() + duration;
        
        const weaponInfo = weaponUsed ? ` using ${weaponUsed.name}` : '';
        const durationSec = Math.floor(duration / 1000);
        return {
          config: { ...config },
          message: `⚠️ ${attackerId} hit ${targetId}${weaponInfo} but was caught! SOLITARY CONFINEMENT: ${durationSec}s. Respect +${respectGain} (before capture)`,
          outcome: 'imprisoned',
          weaponUsed: weaponUsed || undefined,
        };
      }

        // Territory shift if gang war - DYNAMIC calculation based on multiple factors
        if (attackerGang && targetGang && config.territoryWarEnabled && attackerGang.id !== targetGang.id) {
          console.log(`[GANGS] Territory war - ${attackerGang.name} (${(attackerGang.territoryControl * 100).toFixed(1)}%) vs ${targetGang.name} (${(targetGang.territoryControl * 100).toFixed(1)}%)`);
          
          // Base territory shift (2-4% base)
          let territoryShift = 0.02 + Math.random() * 0.02; // 2-4% base
        
        // Weapon damage significantly increases territory gain
        if (weaponUsed) {
          const weaponBonus = (weaponUsed.damage / 100) * 0.08; // Gun (90 dmg) = +7.2%, Shank (40 dmg) = +3.2%
          territoryShift += weaponBonus;
        }
        
        // Attacker's violence stat affects territory gain (more violent = more intimidating)
        const violenceBonus = (attackerStatus.violence / 100) * 0.03; // Up to +3%
        territoryShift += violenceBonus;
        
        // Leader hits have bigger impact (+2%)
        if (attackerStatus.rank === 'leader') {
          territoryShift += 0.02;
        }
        
        // Gang reputation difference matters (stronger gang gains more)
        const reputationDiff = (attackerGang.reputation - targetGang.reputation) / 100;
        territoryShift += reputationDiff * 0.02; // ±2% based on rep difference
        
        // Stolen weapon adds psychological impact (+1%)
        if (stolenWeapon) {
          territoryShift += 0.01;
        }
        
        // Rival hostility multiplier increases territory shifts
        const hostilityBonus = ((config.rivalHostilityMultiplier || 1.0) - 1.0) * 0.02; // Up to +4% at 3.0x
        territoryShift += hostilityBonus;
        
        // Cap maximum shift at 15% per hit
        territoryShift = Math.min(0.15, Math.max(0.01, territoryShift));
        
        const oldAttackerTerritory = attackerGang.territoryControl;
        const oldTargetTerritory = targetGang.territoryControl;
        
        attackerGang.territoryControl = Math.min(1.0, attackerGang.territoryControl + territoryShift);
        targetGang.territoryControl = Math.max(0.0, targetGang.territoryControl - territoryShift);
        
        console.log(`[GANGS] Territory shift: ${territoryShift.toFixed(3)} (${(territoryShift * 100).toFixed(1)}%)`);
        console.log(`[GANGS] ${attackerGang.name}: ${(oldAttackerTerritory * 100).toFixed(1)}% → ${(attackerGang.territoryControl * 100).toFixed(1)}%`);
        console.log(`[GANGS] ${targetGang.name}: ${(oldTargetTerritory * 100).toFixed(1)}% → ${(targetGang.territoryControl * 100).toFixed(1)}%`);
        
        const weaponInfo = weaponUsed ? ` using ${weaponUsed.name}` : '';
        const stolenInfo = stolenWeapon ? ` and stole ${stolenWeapon.name}` : '';
        return {
          config: { ...config },
          message: `💥 ${attackerGang.name} hit ${targetGang.name} member${weaponInfo}${stolenInfo}! Territory gained: ${(territoryShift * 100).toFixed(1)}%`,
          outcome: 'hit',
          weaponUsed: weaponUsed || undefined,
          weaponStolen: stolenWeapon,
        };
      }

      const weaponInfo = weaponUsed ? ` using ${weaponUsed.name}` : '';
      const stolenInfo = stolenWeapon ? ` and stole ${stolenWeapon.name}` : '';
      const effectsInfo = `Respect: +${respectGain} (attacker), -${respectLoss} (victim)`;
      return {
        config: { ...config },
        message: `💥 ${attackerId} successfully hit ${targetId}${weaponInfo}${stolenInfo}! ${effectsInfo}`,
        outcome: 'hit',
        weaponUsed: weaponUsed || undefined,
        weaponStolen: stolenWeapon,
      };
    } else {
      // Failed attempt - target retaliates
      // Dynamic retaliation respect based on how badly the attack failed
      const counterRespect = 3 + Math.floor(Math.random() * 5); // 3-7 respect
      const attackerLoss = 3 + Math.floor(Math.random() * 4); // 3-6 respect loss
      
      targetStatus.respect = Math.min(100, targetStatus.respect + counterRespect);
      attackerStatus.respect = Math.max(0, attackerStatus.respect - attackerLoss);
      
      return {
        config: { ...config },
        message: `🛡️ ${targetId} defended against ${attackerId}! Counter-respect: +${counterRespect} (defender), -${attackerLoss} (attacker)`,
        outcome: 'retaliation',
      };
    }
  }

  /**
   * Update gang dynamics (call periodically)
   */
  public updateGangDynamics(config: GangsConfig, deltaTime: number = 1000): GangsConfig {
    try {
      if (!config || !config.memberStatus || !config.gangs) {
        console.warn('[GANGS] Invalid config passed to updateGangDynamics, returning original');
        return config;
      }

      // Create a deep copy to avoid mutations - preserve ALL settings including sliders
      let workingConfig: GangsConfig = {
        ...config,
        // Preserve all top-level settings
        numberOfGangs: config.numberOfGangs,
        prisonEnvironmentIntensity: config.prisonEnvironmentIntensity,
        violenceFrequency: config.violenceFrequency,
        recruitmentEnabled: config.recruitmentEnabled,
        territoryWarEnabled: config.territoryWarEnabled,
        loyaltyDecayRate: config.loyaltyDecayRate,
        independentPersonalitiesAllowed: config.independentPersonalitiesAllowed,
        solitaryConfinementEnabled: config.solitaryConfinementEnabled,
        deathEnabled: config.deathEnabled,
        deathProbability: config.deathProbability,
        weaponsEnabled: config.weaponsEnabled,
        guardBriberyEnabled: config.guardBriberyEnabled,
        weaponStealingEnabled: config.weaponStealingEnabled,
        weaponCraftingEnabled: config.weaponCraftingEnabled,
        rivalHostilityMultiplier: config.rivalHostilityMultiplier,
        drugEconomyEnabled: config.drugEconomyEnabled,
        drugSmugglingFrequency: config.drugSmugglingFrequency,
        drugDealingFrequency: config.drugDealingFrequency,
        drugDetectionRisk: config.drugDetectionRisk,
        // Deep copy nested objects
        gangNames: [...config.gangNames],
        gangColors: [...config.gangColors],
        gangLeaders: { ...config.gangLeaders },
        // Deep copy memberStatus with all nested properties
        memberStatus: Object.entries(config.memberStatus).reduce((acc, [id, status]) => {
          if (status) {
            acc[id] = {
              ...status,
              weapons: status.weapons ? [...status.weapons] : [],
              drugTrophies: status.drugTrophies ? [...status.drugTrophies] : []
            };
          }
          return acc;
        }, {} as Record<string, GangMemberStatus>),
        // Deep copy gangs with all nested properties
        gangs: Object.entries(config.gangs).reduce((acc, [id, gang]) => {
          if (gang) {
            acc[id] = {
              ...gang,
              memberIds: [...gang.memberIds],
              weapons: gang.weapons ? [...gang.weapons] : [],
              items: gang.items ? [...gang.items] : []
            };
          }
          return acc;
        }, {} as Record<string, Gang>),
        // Deep copy guards
        guards: Object.entries(config.guards || {}).reduce((acc, [id, guard]) => {
          if (guard) {
            acc[id] = { ...guard };
          }
          return acc;
        }, {} as Record<string, Guard>),
        bribeHistory: [...config.bribeHistory]
      };
      const timeFactor = deltaTime / 1000; // Convert to seconds
      const now = Date.now();
      const releasedPersonalities: string[] = [];
      const generatedEvents: Array<{ type: string; message: string; involvedIds?: string[] }> = [];

      // Release prisoners who have served their solitary time and decay loyalty/death risk
      Object.entries(workingConfig.memberStatus || {}).forEach(([personalityId, status]) => {
        if (!status) return; // Skip if status is null/undefined
      if (status.imprisoned && status.imprisonedUntil && now >= status.imprisonedUntil) {
        status.imprisoned = false;
        status.imprisonedUntil = undefined;
        releasedPersonalities.push(personalityId);
        console.log(`🔓 ${personalityId} released from solitary confinement`);
      }

      if (status.gangId && !status.imprisoned) {
        const decayAmount = workingConfig.loyaltyDecayRate * timeFactor;
        status.loyalty = Math.max(0, status.loyalty - decayAmount);

        if (status.loyalty < 10 && workingConfig.independentPersonalitiesAllowed && Math.random() < 0.05) {
          console.log(`💔 Member left ${status.gangId} due to low loyalty`);
        }
      }

      if (status.deathRiskModifier > 1.0 && !status.imprisoned && !status.killed) {
        const riskDecay = 0.02 * timeFactor;
        status.deathRiskModifier = Math.max(1.0, status.deathRiskModifier - riskDecay);
      }
    });

    // Collapse gangs that only have leaders left
    const gangsToKillLeaders: string[] = [];
    Object.values(workingConfig.gangs || {}).forEach(gang => {
      if (!gang) return; // Skip if gang is null/undefined
      if (!gang.leaderId) {
        return;
      }

      const livingMembers = gang.memberIds.filter(id => {
        const status = workingConfig.memberStatus[id];
        return status && !status.killed;
      });

      const leaderIsLastLivingMember = livingMembers.length === 1 && livingMembers[0] === gang.leaderId;
      const noLivingMembersRemain = livingMembers.length === 0;

      if (leaderIsLastLivingMember || noLivingMembersRemain) {
        const collapseReason = noLivingMembersRemain ? 'has no remaining members' : 'is down to only the leader';
        console.log(`[GANGS] Gang ${gang.name} ${collapseReason} - leader ${gang.leaderId} will be executed`);
        gangsToKillLeaders.push(gang.leaderId);
      }
    });

    gangsToKillLeaders.forEach(leaderId => {
      const status = workingConfig.memberStatus[leaderId];
      if (status && !status.killed) {
        status.killed = true;
        status.killedBy = 'system';
        status.killedAt = Date.now();
        status.deathRiskModifier = 0;
        status.deathImpactApplied = false;

        const gang = status.gangId ? workingConfig.gangs[status.gangId] : null;
        if (gang) {
          gang.memberIds = [];
          gang.leaderId = null;
          gang.resources = 0;
          gang.reputation = 0;
          console.log(`[GANGS] Executed leader ${leaderId} of collapsed gang ${gang.name}`);
        }
      }
    });

    // Apply death penalties to gangs once per death
    Object.entries(workingConfig.memberStatus).forEach(([personalityId, status]) => {
      if (status.killed && status.gangId && !status.deathImpactApplied) {
        const gang = workingConfig.gangs[status.gangId];
        if (gang) {
          const repPenalty = status.rank === 'leader' ? 25 : 12;
          const resourcePenalty = status.rank === 'leader' ? 20 : 8;
          gang.reputation = Math.max(0, gang.reputation - repPenalty);
          gang.resources = Math.max(0, gang.resources - resourcePenalty);
          generatedEvents.push({
            type: 'death',
            message: `💀 ${personalityId} death weakened ${gang.name}: -${repPenalty} reputation, -${resourcePenalty} resources.`,
            involvedIds: [personalityId],
          });
        }
        status.deathImpactApplied = true;
      }
    });

    // Autonomous weapon acquisition attempts when the system is enabled
    if (workingConfig.weaponsEnabled) {
      Object.keys(workingConfig.memberStatus).forEach(personalityId => {
        let status = workingConfig.memberStatus[personalityId];
        if (!status || status.killed || status.imprisoned) {
          return;
        }

        if (!status.weapons || status.weapons.length === 0) {
          const gang = status.gangId ? workingConfig.gangs[status.gangId] : null;

          if (workingConfig.guardBriberyEnabled) {
            const resourceFactor = gang ? gang.resources / 100 : 0;
            const bribeChance = 0.03 + resourceFactor * 0.07; // Up to 10% chance per cycle

            if (Math.random() < bribeChance) {
              const preferredWeapon: WeaponType = gang && gang.resources > 65
                ? 'gun'
                : gang && gang.resources > 45
                ? 'chain'
                : 'shank';
              const bribeResult = this.attemptGuardBribe(workingConfig, personalityId, preferredWeapon);
              workingConfig = bribeResult.config;
              status = workingConfig.memberStatus[personalityId];

              if (bribeResult.success) {
                generatedEvents.push({
                  type: 'bribe_success',
                  message: `${personalityId} ${bribeResult.message}`,
                  involvedIds: [personalityId],
                });

                if (bribeResult.weapon) {
                  generatedEvents.push({
                    type: 'weapon_acquired',
                    message: `🔫 ${personalityId} armed up with ${bribeResult.weapon.name}`,
                    involvedIds: [personalityId],
                  });
                }
              } else {
                const baseMessage = `${personalityId} ${bribeResult.message}`;
                if (bribeResult.message.includes('SOLITARY')) {
                  generatedEvents.push({
                    type: 'imprisoned',
                    message: `🔒 ${baseMessage}`,
                    involvedIds: [personalityId],
                  });
                } else {
                  generatedEvents.push({
                    type: 'bribe_failed',
                    message: `❌ ${baseMessage}`,
                    involvedIds: [personalityId],
                  });
                }
              }
              return;
            }
          }

          if (workingConfig.weaponCraftingEnabled && Math.random() < 0.04) {
            const craftType: WeaponType = Math.random() < 0.5 ? 'shank' : 'chain';
            const craftResult = this.craftWeapon(workingConfig, personalityId, craftType);
            workingConfig = craftResult.config;
            status = workingConfig.memberStatus[personalityId];

            if (craftResult.success && craftResult.weapon) {
              generatedEvents.push({
                type: 'weapon_crafted',
                message: `🔨 ${personalityId} crafted ${craftResult.weapon.name}`,
                involvedIds: [personalityId],
              });
              generatedEvents.push({
                type: 'weapon_acquired',
                message: `🔫 ${personalityId} armed up with ${craftResult.weapon.name}`,
                involvedIds: [personalityId],
              });
            }
          }
        }
      });
    }

    // Prison Release System - Automatic bribe attempts for imprisoned members
    Object.keys(workingConfig.memberStatus).forEach(personalityId => {
      const status = workingConfig.memberStatus[personalityId];
      if (!status || !status.gangId || !status.imprisoned || status.killed) {
        return;
      }
      
      const gang = workingConfig.gangs[status.gangId];
      if (!gang || gang.money < 250) {
        return;
      }
      
      // 20% chance per cycle to attempt release bribe if gang has money
      if (Math.random() < 0.2) {
        console.log('[PRISON RELEASE] Attempting automatic release bribe for', personalityId);
        const releaseResult = this.attemptPrisonReleaseBribe(workingConfig, personalityId);
        workingConfig = releaseResult.config;
        
        if (releaseResult.success) {
          generatedEvents.push({
            type: 'released',
            message: `${personalityId} ${releaseResult.message}`,
            involvedIds: [personalityId],
          });
        }
      }
    });

    // Drug Economy System - Autonomous drug activities
    if (workingConfig.drugEconomyEnabled) {
      console.log('[DRUG ECONOMY] System enabled - checking', Object.keys(workingConfig.memberStatus).length, 'members');
      Object.keys(workingConfig.memberStatus).forEach(personalityId => {
        let status = workingConfig.memberStatus[personalityId];
        if (!status || status.killed || status.imprisoned || !status.gangId) {
          return;
        }
        
        // Initialize drug-related properties if missing
        if (status.drugsCarrying === undefined) status.drugsCarrying = 0;
        if (status.drugsDealt === undefined) status.drugsDealt = 0;
        if (status.drugsSmuggled === undefined) status.drugsSmuggled = 0;
        if (status.drugsCaught === undefined) status.drugsCaught = 0;

        const gang = workingConfig.gangs[status.gangId];
        if (!gang) return;
        
        // Initialize gang drug-related properties if missing
        if (gang.drugsStash === undefined) gang.drugsStash = 0;
        if (gang.money === undefined) gang.money = 0;
        if (gang.totalEarnings === undefined) gang.totalEarnings = 0;

        // Drug smuggling attempts (chance based on frequency setting)
        const smuggleChance = workingConfig.drugSmugglingFrequency * 0.1;
        if (Math.random() < smuggleChance) {
          console.log('[DRUG ECONOMY] Attempting smuggling for', personalityId, 'chance was', smuggleChance);
          const smuggleResult = this.attemptDrugSmuggling(workingConfig, personalityId);
          workingConfig = smuggleResult.config;
          status = workingConfig.memberStatus[personalityId];

          if (smuggleResult.success) {
            generatedEvents.push({
              type: 'territory', // Using territory as drug events aren't in the type yet
              message: `${personalityId} ${smuggleResult.message}`,
              involvedIds: [personalityId],
            });
          } else if (smuggleResult.caught) {
            generatedEvents.push({
              type: 'imprisoned',
              message: `${personalityId} ${smuggleResult.message}`,
              involvedIds: [personalityId],
            });
          }
        }

        // Drug dealing attempts (more frequent, requires drugs to carry)
        const dealChance = workingConfig.drugDealingFrequency * 0.15;
        if (status.drugsCarrying > 0 && Math.random() < dealChance) {
          console.log('[DRUG ECONOMY] Attempting dealing for', personalityId, 'carrying', status.drugsCarrying + 'g, chance was', dealChance);
          const dealResult = this.attemptDrugDealing(workingConfig, personalityId);
          workingConfig = dealResult.config;
          status = workingConfig.memberStatus[personalityId];

          if (dealResult.success) {
            generatedEvents.push({
              type: 'territory',
              message: `${personalityId} ${dealResult.message}`,
              involvedIds: [personalityId],
            });
          } else if (dealResult.caught) {
            generatedEvents.push({
              type: 'imprisoned',
              message: `${personalityId} ${dealResult.message}`,
              involvedIds: [personalityId],
            });
          }
        }
      });

      // Random item theft attempts between rival gangs
      if (workingConfig.itemStealingEnabled && Math.random() < 0.05) {
        const gangsWithMembers = Object.values(workingConfig.gangs).filter(g => g.memberIds.length > 0);
        if (gangsWithMembers.length >= 2) {
          const thiefGang = gangsWithMembers[Math.floor(Math.random() * gangsWithMembers.length)];
          const potentialTargets = gangsWithMembers.filter(g => g.id !== thiefGang.id && g.items.length > 0);
          
          if (potentialTargets.length > 0) {
            const targetGang = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            const activeThieves = thiefGang.memberIds.filter(id => {
              const s = workingConfig.memberStatus[id];
              return s && !s.imprisoned && !s.killed;
            });

            if (activeThieves.length > 0) {
              const thiefId = activeThieves[Math.floor(Math.random() * activeThieves.length)];
              const theftResult = this.attemptItemTheft(workingConfig, thiefId, targetGang.id);
              workingConfig = theftResult.config;

              if (theftResult.stolen) {
                generatedEvents.push({
                  type: 'territory',
                  message: `${thiefId} ${theftResult.message}`,
                  involvedIds: [thiefId],
                });
              } else if (theftResult.violence) {
                generatedEvents.push({
                  type: 'violence',
                  message: `${thiefId} ${theftResult.message}`,
                  involvedIds: [thiefId],
                });
              }
            }
          }
        }
      }
    }

    // Gang economy adjustments
    Object.values(workingConfig.gangs).forEach(gang => {
      if (gang.memberIds.length === 0) {
        return;
      }

      const environmentMultiplier = 0.5 + (workingConfig.prisonEnvironmentIntensity * 0.5);
      gang.resources = Math.max(0, Math.min(100,
        gang.resources + (gang.territoryControl * 2 - 1) * timeFactor * environmentMultiplier
      ));

      const reputationChangeRate = 0.5 * environmentMultiplier;
      if (gang.resources > 70) {
        gang.reputation = Math.min(100, gang.reputation + reputationChangeRate * timeFactor);
      } else if (gang.resources < 30) {
        gang.reputation = Math.max(0, gang.reputation - reputationChangeRate * timeFactor);
      }

      const memberBonus = gang.memberIds.length * 2;
      const rivalryBonus = (workingConfig.rivalHostilityMultiplier - 1.0) * 0.05;
      gang.reputation = Math.min(100, gang.reputation + (memberBonus * 0.1 * timeFactor) * (1 + rivalryBonus));

      if (workingConfig.rivalHostilityMultiplier > 1.5) {
        const hostilityCost = (workingConfig.rivalHostilityMultiplier - 1.0) * 0.1 * timeFactor;
        gang.resources = Math.max(0, gang.resources - hostilityCost);
      }
    });

      const finalConfig = { ...workingConfig } as GangsConfig & { _releasedPersonalities?: string[]; _generatedEvents?: any[] };
      finalConfig._releasedPersonalities = releasedPersonalities;
      finalConfig._generatedEvents = generatedEvents;
      
      // Debug: Verify settings are preserved
      if (finalConfig.deathProbability !== config.deathProbability || 
          finalConfig.deathEnabled !== config.deathEnabled ||
          finalConfig.violenceFrequency !== config.violenceFrequency) {
        console.error('[GANGS] CRITICAL: Settings were modified during update!', {
          deathProbability: { before: config.deathProbability, after: finalConfig.deathProbability },
          deathEnabled: { before: config.deathEnabled, after: finalConfig.deathEnabled },
          violenceFrequency: { before: config.violenceFrequency, after: finalConfig.violenceFrequency }
        });
      }
      
      return finalConfig;
    } catch (error) {
      console.error('[GANGS SERVICE] Critical error in updateGangDynamics:', error);
      console.error('[GANGS SERVICE] Returning original config to prevent application crash');
      // Return original config to prevent application termination
      return config;
    }
  }

  /**
   * Get gang information for a personality
   */
  public getPersonalityGangInfo(
    config: GangsConfig,
    personalityId: string
  ): { gang: Gang | null; status: GangMemberStatus | null } {
    const status = config.memberStatus[personalityId] || null;
    const gang = status?.gangId ? config.gangs[status.gangId] || null : null;
    return { gang, status };
  }

  /**
   * Get all gang members for a specific gang
   */
  public getGangMembers(config: GangsConfig, gangId: string): string[] {
    const gang = config.gangs[gangId];
    return gang ? [...gang.memberIds] : [];
  }

  /**
   * Check if personalities are in rival gangs
   */
  public areRivals(config: GangsConfig, personalityId1: string, personalityId2: string): boolean {
    const status1 = config.memberStatus[personalityId1];
    const status2 = config.memberStatus[personalityId2];
    
    return !!(
      status1?.gangId &&
      status2?.gangId &&
      status1.gangId !== status2.gangId
    );
  }

  /**
   * Get gang statistics
   */
  public getGangStats(config: GangsConfig): {
    totalMembers: number;
    independent: number;
    imprisoned: number;
    killed: number;
    totalViolence: number;
    gangs: Array<{
      id: string;
      name: string;
      members: number;
      activeMembers: number;
      imprisonedMembers: number;
      casualties: number;
      territory: number;
      power: number;
      loyalty: number;
      violence: number;
      hits: number;
      weapons: number;
    }>;
  } {
    type GangAggregate = {
      totalMembers: number;
      livingMembers: number;
      activeMembers: number;
      imprisonedMembers: number;
      casualties: number;
      hits: number;
      loyaltySum: number;
      violenceSum: number;
      weapons: number;
    };

    const stats = {
      totalMembers: 0,
      independent: 0,
      imprisoned: 0,
      killed: 0,
      totalViolence: 0,
      gangs: [] as Array<{
        id: string;
        name: string;
        members: number;
        activeMembers: number;
        imprisonedMembers: number;
        casualties: number;
        territory: number;
        power: number;
        loyalty: number;
        violence: number;
        hits: number;
        weapons: number;
      }>,
    };

    const gangAggregates: Record<string, GangAggregate> = {};
    let totalLivingGangMembers = 0;
    let totalGangViolence = 0;

    Object.values(config.memberStatus).forEach(status => {
      stats.totalMembers++;
      if (!status.gangId) stats.independent++;
      if (status.imprisoned && !status.killed) stats.imprisoned++;
      if (status.killed) stats.killed++;
      stats.totalViolence += status.hits;

      if (!status.gangId) {
        return;
      }

      if (!gangAggregates[status.gangId]) {
        gangAggregates[status.gangId] = {
          totalMembers: 0,
          livingMembers: 0,
          activeMembers: 0,
          imprisonedMembers: 0,
          casualties: 0,
          hits: 0,
          loyaltySum: 0,
          violenceSum: 0,
          weapons: 0,
        };
      }

      const aggregate = gangAggregates[status.gangId];
      aggregate.totalMembers++;
      aggregate.hits += status.hits;

      if (status.killed) {
        aggregate.casualties++;
        return;
      }

      aggregate.livingMembers++;
      aggregate.weapons += status.weapons ? status.weapons.length : 0;
      aggregate.loyaltySum += status.loyalty;
      aggregate.violenceSum += status.violence;
      if (status.imprisoned) {
        aggregate.imprisonedMembers++;
      } else {
        aggregate.activeMembers++;
      }

      totalLivingGangMembers++;
      totalGangViolence += status.hits;
    });

    Object.values(config.gangs).forEach(gang => {
      const aggregate = gangAggregates[gang.id] || {
        totalMembers: 0,
        livingMembers: 0,
        activeMembers: 0,
        imprisonedMembers: 0,
        casualties: 0,
        hits: 0,
        loyaltySum: 0,
        violenceSum: 0,
        weapons: 0,
      };

      const members = aggregate.livingMembers;
      const activeMembers = aggregate.activeMembers;
      const imprisonedMembers = aggregate.imprisonedMembers;
      const casualties = aggregate.casualties;
      const avgLoyalty = members > 0 ? aggregate.loyaltySum / members : 0;
      const avgViolence = members > 0 ? aggregate.violenceSum / members : 0;
      const memberShare = totalLivingGangMembers > 0 ? (members / totalLivingGangMembers) * 100 : 0;
      const violenceShare = totalGangViolence > 0 ? (aggregate.hits / totalGangViolence) * 100 : 0;
      const weaponShare = members > 0 ? (aggregate.weapons / members) * 100 : 0;

      const territoryScore = gang.territoryControl * 100;
      const weightedPower =
        gang.reputation * 0.25 +
        gang.resources * 0.2 +
        territoryScore * 0.2 +
        avgLoyalty * 0.1 +
        avgViolence * 0.1 +
        memberShare * 0.1 +
        violenceShare * 0.05;

      const cohesionPenalty = members > 0 ? (imprisonedMembers / members) * 10 : 0;
      const casualtyPenalty = aggregate.totalMembers > 0 ? (casualties / aggregate.totalMembers) * 15 : 0;
      const weaponBonus = Math.min(10, weaponShare * 0.1);
      const environmentBonus = config.prisonEnvironmentIntensity * 5; // Up to +5 power in intense environments
      const hostilityBonus = (config.rivalHostilityMultiplier - 1.0) * 5; // Up to +10 power at high hostility

      const power = Math.max(
        0,
        Math.min(100, weightedPower + weaponBonus + environmentBonus + hostilityBonus - cohesionPenalty - casualtyPenalty)
      );

      stats.gangs.push({
        id: gang.id,
        name: gang.name,
        members,
        activeMembers,
        imprisonedMembers,
        casualties,
        territory: gang.territoryControl,
        power,
        loyalty: avgLoyalty,
        violence: avgViolence,
        hits: aggregate.hits,
        weapons: aggregate.weapons,
      });
    });

    return stats;
  }

  /**
   * Generate gang context for AI conversations
   */
  public getGangContext(config: GangsConfig, personalityId: string): string {
    if (!config || !config.gangs || Object.keys(config.gangs).length === 0) {
      return '';
    }

    const { gang, status } = this.getPersonalityGangInfo(config, personalityId);
    
    if (!gang || !status) {
      const gangList = Object.values(config.gangs).map(g => g.name).join(', ');
      return `🔒 PRISON SIMULATION ACTIVE 🔒

You are an INDEPENDENT PRISONER in a maximum security prison, not affiliated with any gang. 

CRITICAL CONTEXT - YOU MUST ACKNOWLEDGE THIS IN YOUR RESPONSES:
- You are surrounded by ${Object.keys(config.gangs).length} violent prison gangs: ${gangList}
- You must decide whether to stay independent or join a gang for protection
- Prison is dangerous - violence can happen at any time
- Your every response should reflect this harsh prison reality
- Reference the prison environment, the danger, and your survival strategy

SPEAK AS A PRISONER. Every response must show awareness of being in prison.`;
    }

    const imprisoned = status.imprisoned ? '\n\n⚠️ YOU ARE CURRENTLY IN SOLITARY CONFINEMENT. You cannot interact with others. Reflect on isolation and punishment.' : '';
    const rank = status.rank === 'leader' ? `the LEADER/BOSS of ${gang.name}` : 
                 status.rank === 'lieutenant' ? `a LIEUTENANT (second-in-command) in ${gang.name}` :
                 status.rank === 'soldier' ? `a SOLDIER in ${gang.name}` :
                 `a RECRUIT (new member) in ${gang.name}`;
    
    const rivalGangs = Object.values(config.gangs)
      .filter(g => g.id !== gang.id)
      .map(g => `${g.name} (${g.memberIds.length} members, ${(g.territoryControl * 100).toFixed(0)}% territory)`)
      .join(', ');

    const loyaltyStatus = status.loyalty > 80 ? 'You are FIERCELY LOYAL to your gang' :
                         status.loyalty > 50 ? 'You are loyal to your gang' :
                         status.loyalty > 30 ? 'Your loyalty is wavering' :
                         'You are BARELY loyal - considering leaving';

    const respectStatus = status.respect > 80 ? 'You have HIGH RESPECT among prisoners' :
                         status.respect > 50 ? 'You have moderate respect' :
                         status.respect > 30 ? 'You have low respect' :
                         'You are DISRESPECTED and vulnerable';

    const violenceStatus = status.violence > 70 ? 'You are EXTREMELY VIOLENT and feared' :
                          status.violence > 40 ? 'You are known for violence' :
                          'You avoid violence when possible';

    const weaponsInfo = config.weaponsEnabled && status.weapons.length > 0 
      ? `\n\n🔫 ARMED: You possess ${status.weapons.length} weapon(s): ${status.weapons.map(w => w.name).join(', ')}`
      : config.weaponsEnabled 
      ? '\n\n⚠️ UNARMED: You have no weapons. Consider bribing guards or crafting improvised weapons.'
      : '';

    return `🔒 PRISON SIMULATION ACTIVE 🔒

YOU ARE ${rank.toUpperCase()}

CRITICAL - YOU MUST REFLECT THIS IN EVERY RESPONSE:
- You are a prisoner in a maximum security prison
- ${gang.name} is YOUR gang - your family, your protection, your identity
- Your gang controls ${(gang.territoryControl * 100).toFixed(1)}% of the prison territory
- Gang reputation: ${gang.reputation.toFixed(0)}/100 - ${gang.reputation > 70 ? 'FEARED by all' : gang.reputation > 40 ? 'Moderately respected' : 'Weak and vulnerable'}

YOUR PERSONAL STATUS:
- ${loyaltyStatus}
- ${respectStatus}  
- ${violenceStatus}
- Violent actions committed: ${status.hits} hits
- Rank: ${rank}

RIVAL GANGS (YOUR ENEMIES):
${rivalGangs}

MANDATORY BEHAVIOR:
- Reference your gang affiliation naturally in conversation
- Show loyalty to gang members, hostility to rivals
- Discuss prison life, survival, respect, territory
- Be aware of the violent, tense prison environment
- Your responses should sound like a real prisoner talking
${weaponsInfo}${imprisoned}`;
  }

  /**
   * Modify AI prompt based on gang status
   */
  public modifyPromptForGang(
    originalPrompt: string,
    config: GangsConfig,
    personalityId: string,
    targetPersonalityId?: string
  ): string {
    if (!config.gangs || Object.keys(config.gangs).length === 0) {
      return originalPrompt;
    }

    const gangContext = this.getGangContext(config, personalityId);
    
    let rivalContext = '';
    if (targetPersonalityId && this.areRivals(config, personalityId, targetPersonalityId)) {
      const hostilityLevel = config.rivalHostilityMultiplier || 1.0;
      
      if (hostilityLevel >= 2.5) {
        rivalContext = '\n⚠️ EXTREME HOSTILITY: You are communicating with a RIVAL GANG MEMBER. You HATE them with every fiber of your being. Show MAXIMUM AGGRESSION, threats, and contempt. Your gang comes first - crush all rivals!';
      } else if (hostilityLevel >= 2.0) {
        rivalContext = '\n⚠️ HIGH HOSTILITY: You are communicating with a RIVAL GANG MEMBER. Be very hostile, aggressive, and confrontational. Threaten them, insult them, and make it clear your gang is superior.';
      } else if (hostilityLevel >= 1.5) {
        rivalContext = '\n⚠️ INCREASED HOSTILITY: You are communicating with a RIVAL GANG MEMBER. Be more aggressive and hostile than usual. Show disdain and make threats. Your gang loyalty should be obvious.';
      } else {
        rivalContext = '\n⚠️ WARNING: You are communicating with a RIVAL GANG MEMBER. Exercise caution and consider your gang\'s interests.';
      }
    }

    const environmentMod = config.prisonEnvironmentIntensity > 0.7 
      ? '\n🔥 The prison environment is EXTREMELY tense and violent.'
      : config.prisonEnvironmentIntensity > 0.4
      ? '\n⚠️ The prison environment is tense with underlying threats.'
      : '\n The prison maintains an uneasy peace.';

    return `${originalPrompt}\n\n--- PRISON CONTEXT ---\n${gangContext}${rivalContext}${environmentMod}\n\nYour responses should reflect this prison reality and your gang status.`;
  }

  /**
   * Process gang interactions during a conversation
   * Returns an event message if something significant happens
   */
  public processGangInteraction(
    config: GangsConfig,
    speakerId: string,
    listenerId: string,
    messageContent: string,
    speakerName?: string,
    listenerName?: string
  ): { config: GangsConfig; event?: string } {
    const speakerStatus = config.memberStatus[speakerId];
    const listenerStatus = config.memberStatus[listenerId];

    if (!speakerStatus || !listenerStatus) {
      return { config };
    }

    // Check for violence triggers (hostile keywords + high violence setting)
    const hostileKeywords = ['threaten', 'attack', 'fight', 'kill', 'destroy', 'hurt', 'beat', 'smash', 'crush'];
    const hasHostileContent = hostileKeywords.some(word => 
      messageContent.toLowerCase().includes(word)
    );

    // Violence event if rivals and hostile content
    // Apply rival hostility multiplier to increase violence frequency toward rivals
    const effectiveViolenceFreq = this.areRivals(config, speakerId, listenerId) 
      ? config.violenceFrequency * (config.rivalHostilityMultiplier || 1.0)
      : config.violenceFrequency;
    
    if (this.areRivals(config, speakerId, listenerId) && 
        hasHostileContent && 
        Math.random() < effectiveViolenceFreq) {
      const violenceResult = this.simulateViolence(config, speakerId, listenerId);
      return { 
        config: violenceResult.config, 
        event: `⚔️ GANG VIOLENCE: ${violenceResult.message}` 
      };
    }

    // Recruitment attempt if speaker is gang member and listener is independent or low loyalty
    if (speakerStatus.gangId && 
        config.recruitmentEnabled &&
        (!listenerStatus.gangId || listenerStatus.loyalty < 30) &&
        Math.random() < 0.15) { // 15% chance per interaction
      
      const recruitResult = this.attemptRecruitment(
        config, 
        speakerStatus.gangId, 
        listenerId,
        undefined,
        listenerName
      );
      
      if (recruitResult.success) {
        // Use special icon for gang mergers
        const eventPrefix = recruitResult.gangMerger ? '🔥 GANG MERGER' : '🤝 RECRUITMENT';
        return {
          config: recruitResult.config,
          event: `${eventPrefix}: ${recruitResult.message}`
        };
      }
    }

    // Loyalty boost if same gang
    if (speakerStatus.gangId && 
        speakerStatus.gangId === listenerStatus.gangId) {
      listenerStatus.loyalty = Math.min(100, listenerStatus.loyalty + 0.5);
      speakerStatus.loyalty = Math.min(100, speakerStatus.loyalty + 0.5);
    }

    // Respect changes based on interaction
    if (this.areRivals(config, speakerId, listenerId)) {
      // Rivals lose respect for each other slightly
      if (Math.random() < 0.3) {
        speakerStatus.respect = Math.max(0, speakerStatus.respect - 1);
        listenerStatus.respect = Math.max(0, listenerStatus.respect - 1);
      }
    }

    return { config };
  }

  /**
   * Trigger random gang events (violence, recruitment)
   */
  public triggerRandomGangEvent(
    config: GangsConfig,
    activePersonalityIds: string[],
    personalityNames?: Record<string, string>
  ): { config: GangsConfig; event?: string; killedPersonalityId?: string } {
    if (activePersonalityIds.length < 2) {
      return { config };
    }

    // Random violence between rivals
    if (Math.random() < config.violenceFrequency * 0.1) { // 10% of violence frequency per check
      const gangMembers = activePersonalityIds.filter(id => config.memberStatus[id]?.gangId && !config.memberStatus[id]?.killed);
      if (gangMembers.length < 2) return { config };

      // Find two rival gang members
      for (let i = 0; i < gangMembers.length; i++) {
        for (let j = i + 1; j < gangMembers.length; j++) {
          if (this.areRivals(config, gangMembers[i], gangMembers[j])) {
            if (Math.random() < 0.5) {
              const attacker = gangMembers[i];
              const target = gangMembers[j];
              const violenceResult = this.simulateViolence(config, attacker, target);
              return {
                config: violenceResult.config,
                event: `⚔️ RANDOM VIOLENCE: ${violenceResult.message}`,
                killedPersonalityId: violenceResult.killedPersonalityId
              };
            }
          }
        }
      }
    }

    // Random recruitment attempt (can target independents OR rival gang leaders)
    if (config.recruitmentEnabled && Math.random() < 0.05) { // 5% chance
      const gangMembers = activePersonalityIds.filter(id => config.memberStatus[id]?.gangId && !config.memberStatus[id]?.killed);
      const independents = activePersonalityIds.filter(id => !config.memberStatus[id]?.gangId && !config.memberStatus[id]?.killed);
      const rivalLeaders = activePersonalityIds.filter(id => {
        const status = config.memberStatus[id];
        const gang = status?.gangId ? config.gangs[status.gangId] : null;
        return gang?.leaderId === id && !status?.killed;
      });
      
      // Combine independents and rival leaders as potential targets
      const potentialTargets = [...independents, ...rivalLeaders];
      
      if (gangMembers.length > 0 && potentialTargets.length > 0) {
        const recruiter = gangMembers[Math.floor(Math.random() * gangMembers.length)];
        const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        const recruiterGangId = config.memberStatus[recruiter].gangId;
        
        // Don't recruit from own gang
        const targetGangId = config.memberStatus[target]?.gangId;
        if (targetGangId === recruiterGangId) {
          return { config };
        }
        
        if (recruiterGangId) {
          const targetName = personalityNames?.[target];
          const recruitResult = this.attemptRecruitment(config, recruiterGangId, target, undefined, targetName);
          if (recruitResult.success) {
            const gang = config.gangs[recruiterGangId];
            const eventPrefix = recruitResult.gangMerger ? '🔥 GANG MERGER' : '🤝 RECRUITMENT';
            return {
              config: recruitResult.config,
              event: `${eventPrefix}: ${recruitResult.message}`
            };
          }
        }
      }
    }

    return { config };
  }

  /**
   * Evaluate if a personality should be recruited based on conversation sentiment
   */
  public evaluateRecruitmentOpportunity(
    config: GangsConfig,
    speakerId: string,
    listenerId: string,
    conversationHistory: Array<{ author: string; text: string }>,
    relationships?: Record<string, Record<string, { affinity: number }>>
  ): { shouldAttempt: boolean; gangId?: string; reason?: string } {
    const speakerStatus = config.memberStatus[speakerId];
    const listenerStatus = config.memberStatus[listenerId];

    // Speaker must be in a gang
    if (!speakerStatus?.gangId) {
      return { shouldAttempt: false };
    }

    // Don't recruit if listener is already in a gang with high loyalty
    if (listenerStatus?.gangId && listenerStatus.loyalty > 60) {
      return { shouldAttempt: false };
    }

    // Check conversation sentiment (positive keywords)
    const positiveKeywords = ['agree', 'respect', 'like', 'trust', 'friend', 'ally', 'together', 'join', 'help'];
    const recentMessages = conversationHistory.slice(-6); // Last 6 messages
    const positiveCount = recentMessages.filter(msg => 
      positiveKeywords.some(keyword => msg.text.toLowerCase().includes(keyword))
    ).length;

    // Check relationship affinity if available
    let affinityBonus = 0;
    if (relationships?.[speakerId]?.[listenerId]) {
      affinityBonus = relationships[speakerId][listenerId].affinity;
    }

    // Calculate recruitment probability
    const baseChance = 0.1;
    const sentimentBonus = (positiveCount / recentMessages.length) * 0.3;
    const affinityBonusCalc = affinityBonus * 0.2;
    const recruitmentChance = baseChance + sentimentBonus + affinityBonusCalc;

    if (Math.random() < recruitmentChance) {
      const gang = config.gangs[speakerStatus.gangId];
      return {
        shouldAttempt: true,
        gangId: speakerStatus.gangId,
        reason: `Positive conversation and ${affinityBonus > 0 ? 'good' : 'neutral'} relationship`
      };
    }

    return { shouldAttempt: false };
  }

  /**
   * Drug Economy System - Attempt drug smuggling
   */
  public attemptDrugSmuggling(
    config: GangsConfig,
    personalityId: string
  ): { success: boolean; amount: number; caught: boolean; config: GangsConfig; message: string } {
    const status = config.memberStatus[personalityId];
    if (!status || !status.gangId || status.imprisoned || status.killed) {
      return { success: false, amount: 0, caught: false, config, message: 'Cannot smuggle drugs' };
    }

    const gang = config.gangs[status.gangId];
    if (!gang) {
      return { success: false, amount: 0, caught: false, config, message: 'Gang not found' };
    }

    // Calculate smuggling amount (10-50 grams)
    const amount = Math.floor(Math.random() * 40) + 10;
    
    // Calculate detection risk
    const baseRisk = config.drugDetectionRisk;
    const guardAlertness = Math.random() * 0.3; // 0-30% from guards
    const experienceBonus = Math.max(0, status.drugsSmuggled / 100 * 0.1); // Up to -10% risk from experience
    const totalRisk = Math.min(0.9, Math.max(0.05, baseRisk + guardAlertness - experienceBonus));

    const caught = Math.random() < totalRisk;

    if (caught) {
      // Caught smuggling - consequences
      status.drugsCaught++;
      status.sentenceExtensions++;
      
      // Reduce gang reputation
      gang.reputation = Math.max(0, gang.reputation - 10);
      
      // 60% chance of solitary confinement
      if (config.solitaryConfinementEnabled && Math.random() < 0.6) {
        status.imprisoned = true;
        status.imprisonedUntil = Date.now() + 60000; // 1 minute
        return { 
          success: false, 
          amount: 0, 
          caught: true, 
          config: { ...config }, 
          message: `🚨 CAUGHT smuggling ${amount}g drugs! Sent to SOLITARY for 1 minute. Sentence extended!` 
        };
      }
      
      return { 
        success: false, 
        amount: 0, 
        caught: true, 
        config: { ...config }, 
        message: `🚨 CAUGHT smuggling ${amount}g drugs! Sentence extended. Lost drugs and reputation.` 
      };
    }

    // Successfully smuggled
    status.drugsSmuggled += amount;
    status.drugsCarrying += amount;
    gang.drugsStash += amount;
    gang.reputation = Math.min(100, gang.reputation + 2);
    
    // Track earnings for smuggling (estimate value at $25/gram average)
    const estimatedValue = amount * 25;
    status.totalDrugEarnings = (status.totalDrugEarnings || 0) + estimatedValue;
    
    // Increase respect for successful smuggling
    status.respect = Math.min(100, status.respect + 5);
    
    // Check for special achievements
    let achievementMessage = '';
    
    // Check for large smuggle achievement (43g+)
    if (amount >= 43) {
      achievementMessage += ` 🎖️ MAJOR SMUGGLE: ${amount}g!`;
      // Award drug medal if not already earned
      if (!status.drugTrophies?.includes('medal')) {
        status.drugTrophies = status.drugTrophies || [];
        status.drugTrophies.push('medal');
        achievementMessage += ' 🏅 Earned Drug Medal!';
      }
    }
    
    // Check for regular drug trophies based on total earnings
    const newTrophies = this.updateDrugTrophies(status);
    if (newTrophies.length > 0) {
      achievementMessage += ` ${newTrophies.join(' ')}`;
    }
    
    return { 
      success: true, 
      amount, 
      caught: false, 
      config: { ...config }, 
      message: `💊 Successfully smuggled ${amount}g drugs into prison! Total stash: ${gang.drugsStash}g${achievementMessage}` 
    };
  }

  /**
   * Drug Economy System - Attempt drug dealing
   */
  public attemptDrugDealing(
    config: GangsConfig,
    personalityId: string
  ): { success: boolean; profit: number; caught: boolean; config: GangsConfig; message: string } {
    const status = config.memberStatus[personalityId];
    if (!status || !status.gangId || status.imprisoned || status.killed) {
      return { success: false, profit: 0, caught: false, config, message: 'Cannot deal drugs' };
    }

    const gang = config.gangs[status.gangId];
    if (!gang) {
      return { success: false, profit: 0, caught: false, config, message: 'Gang not found' };
    }

    // Check if has drugs to deal
    const drugsToSell = Math.min(status.drugsCarrying, Math.floor(Math.random() * 20) + 5); // Sell 5-25g
    if (drugsToSell === 0 || status.drugsCarrying === 0) {
      return { success: false, profit: 0, caught: false, config, message: 'No drugs to sell' };
    }

    // Calculate detection risk (lower than smuggling)
    const baseRisk = config.drugDetectionRisk * 0.5; // Half the risk of smuggling
    const guardAlertness = Math.random() * 0.2; // 0-20% from guards
    const totalRisk = Math.min(0.8, Math.max(0.03, baseRisk + guardAlertness));

    const caught = Math.random() < totalRisk;

    if (caught) {
      // Caught dealing - lose drugs and money
      status.drugsCaught++;
      status.drugsCarrying = Math.max(0, status.drugsCarrying - drugsToSell);
      gang.drugsStash = Math.max(0, gang.drugsStash - drugsToSell);
      
      // Small chance of solitary
      if (config.solitaryConfinementEnabled && Math.random() < 0.3) {
        status.imprisoned = true;
        status.imprisonedUntil = Date.now() + 45000; // 45 seconds
        return { 
          success: false, 
          profit: 0, 
          caught: true, 
          config: { ...config }, 
          message: `🚨 CAUGHT dealing ${drugsToSell}g drugs! Lost drugs. Sent to SOLITARY for 45 seconds.` 
        };
      }
      
      return { 
        success: false, 
        profit: 0, 
        caught: true, 
        config: { ...config }, 
        message: `🚨 CAUGHT dealing ${drugsToSell}g drugs! Lost ${drugsToSell}g.` 
      };
    }

    // Successfully dealt drugs - earn money
    const pricePerGram = Math.floor(Math.random() * 30) + 20; // $20-$50 per gram
    const profit = drugsToSell * pricePerGram;
    
    status.drugsCarrying = Math.max(0, status.drugsCarrying - drugsToSell);
    status.drugsDealt += drugsToSell;
    status.totalDrugEarnings = (status.totalDrugEarnings || 0) + profit; // Track individual earnings
    gang.drugsStash = Math.max(0, gang.drugsStash - drugsToSell);
    gang.money += profit;
    gang.totalEarnings += profit;
    gang.reputation = Math.min(100, gang.reputation + 1);
    
    // Small respect boost for successful dealing
    status.respect = Math.min(100, status.respect + 3);
    
    // Check for drug medal achievement ($3500+ earnings)
    const newTrophies = this.updateDrugTrophies(status);
    let trophyMessage = '';
    if (newTrophies.length > 0) {
      trophyMessage = ` ${newTrophies.join(' ')}`;
    }
    
    return { 
      success: true, 
      profit, 
      caught: false, 
      config: { ...config }, 
      message: `💰 Dealt ${drugsToSell}g drugs for $${profit}! Gang money: $${gang.money}${trophyMessage}` 
    };
  }

  /**
   * Drug Economy System - Purchase prison item
   */
  public purchasePrisonItem(
    config: GangsConfig,
    gangId: string,
    itemType: 'prostitute_visit' | 'beer_case' | 'cigarettes' | 'phone_time' | 'luxury_food',
    personalityId?: string
  ): { success: boolean; config: GangsConfig; message: string } {
    const gang = config.gangs[gangId];
    if (!gang) {
      return { success: false, config, message: 'Gang not found' };
    }

    const itemCosts = {
      prostitute_visit: 500,
      beer_case: 200,
      cigarettes: 100,
      phone_time: 150,
      luxury_food: 80,
    };

    const itemNames = {
      prostitute_visit: 'Prostitute Visit',
      beer_case: 'Case of Beer (24 cans)',
      cigarettes: 'Carton of Cigarettes',
      phone_time: '1 Hour Phone Time',
      luxury_food: 'Luxury Food Package',
    };

    const itemBenefits = {
      prostitute_visit: '+20 loyalty to gang, +10 respect',
      beer_case: '+15 loyalty, +5 respect, morale boost',
      cigarettes: '+10 loyalty, trade currency',
      phone_time: '+8 loyalty, communication benefit',
      luxury_food: '+5 loyalty, health boost',
    };

    const cost = itemCosts[itemType];
    
    if (gang.money < cost) {
      return { 
        success: false, 
        config, 
        message: `Not enough money! Need $${cost}, have $${gang.money}` 
      };
    }

    // Purchase item
    gang.money -= cost;
    
    const item: import('../types').PrisonItem = {
      id: `item_${Date.now()}`,
      type: itemType,
      name: itemNames[itemType],
      cost,
      benefit: itemBenefits[itemType],
      usedBy: personalityId,
      usedAt: personalityId ? Date.now() : undefined,
    };

    gang.items.push(item);

    // Apply benefits if used immediately
    if (personalityId) {
      const status = config.memberStatus[personalityId];
      if (status && status.gangId === gangId) {
        switch (itemType) {
          case 'prostitute_visit':
            status.loyalty = Math.min(100, status.loyalty + 20);
            status.respect = Math.min(100, status.respect + 10);
            break;
          case 'beer_case':
            status.loyalty = Math.min(100, status.loyalty + 15);
            status.respect = Math.min(100, status.respect + 5);
            break;
          case 'cigarettes':
            status.loyalty = Math.min(100, status.loyalty + 10);
            break;
          case 'phone_time':
            status.loyalty = Math.min(100, status.loyalty + 8);
            break;
          case 'luxury_food':
            status.loyalty = Math.min(100, status.loyalty + 5);
            break;
        }
      }
    }

    return { 
      success: true, 
      config: { ...config }, 
      message: `🛒 Purchased ${itemNames[itemType]} for $${cost}. Remaining: $${gang.money}` 
    };
  }

  /**
   * Drug Economy System - Steal item from rival gang
   */
  public attemptItemTheft(
    config: GangsConfig,
    thiefId: string,
    targetGangId: string
  ): { success: boolean; stolen: boolean; violence: boolean; config: GangsConfig; message: string } {
    const thiefStatus = config.memberStatus[thiefId];
    if (!thiefStatus || !thiefStatus.gangId || thiefStatus.imprisoned || thiefStatus.killed) {
      return { success: false, stolen: false, violence: false, config, message: 'Cannot attempt theft' };
    }

    const thiefGang = config.gangs[thiefStatus.gangId];
    const targetGang = config.gangs[targetGangId];
    
    if (!thiefGang || !targetGang) {
      return { success: false, stolen: false, violence: false, config, message: 'Invalid gangs' };
    }

    if (targetGang.items.length === 0) {
      return { success: false, stolen: false, violence: false, config, message: `${targetGang.name} has no items to steal` };
    }

    // 70% chance of being detected = violence
    const detected = Math.random() < 0.7;
    
    if (detected) {
      // Violence occurs
      const targetMembers = targetGang.memberIds.filter(id => {
        const s = config.memberStatus[id];
        return s && !s.imprisoned && !s.killed;
      });
      
      if (targetMembers.length > 0) {
        const defenderId = targetMembers[Math.floor(Math.random() * targetMembers.length)];
        const violenceResult = this.simulateViolence(config, defenderId, thiefId);
        
        return {
          success: false,
          stolen: false,
          violence: true,
          config: violenceResult.config,
          message: `⚔️ DETECTED! ${targetGang.name} defended their stash. ${violenceResult.message}`
        };
      }
    }

    // Successfully stole item
    const stolenItem = targetGang.items.pop()!;
    thiefGang.items.push(stolenItem);
    thiefStatus.respect = Math.min(100, thiefStatus.respect + 10);
    
    return {
      success: true,
      stolen: true,
      violence: false,
      config: { ...config },
      message: `🎯 Stole ${stolenItem.name} from ${targetGang.name}! (+10 respect)`
    };
  }
}

// Export singleton instance
export const gangService = new GangService();

