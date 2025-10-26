export enum ApiProvider {
  GOOGLE = 'google',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  LOCAL = 'local',
}

export enum TtsProvider {
  BROWSER = 'browser',
  ELEVENLABS = 'elevenlabs',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  AZURE = 'azure',
  PLAYHT = 'playht',
  SELF_HOSTED = 'self_hosted',
}

export enum TtsEmotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  EXCITED = 'excited',
  FEARFUL = 'fearful',
  SURPRISED = 'surprised',
  DISGUSTED = 'disgusted',
}

export interface TtsConfig {
  provider: TtsProvider;
  elevenLabsApiKey: string;
  openaiApiKey: string;
  geminiApiKey?: string;
  azureApiKey?: string;
  playhtApiKey?: string;
  playhtUserId?: string;
  selfHostedUrl?: string; // URL to self-hosted TTS API
  defaultEmotion?: TtsEmotion;
  emotionIntensity?: number; // 0.0 to 1.0
}

export interface GoogleTtsOptions {
  voiceName?: string; // e.g., en-GB-Wavenet-A
  speakingRate?: number; // 0.25 - 4.0 (Google range)
  pitch?: number; // -20.0 - 20.0
  volumeGainDb?: number; // -96.0 - 16.0
  effectsProfileId?: string[]; // e.g., ['small-bluetooth-speaker-class-device']
  audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
}

export interface ModelConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  voiceId?: string; // Primary voice identifier/name (provider-dependent)
  additionalVoiceIds?: string[]; // Optional alternative voice identifiers for other providers (e.g., en-GB-Wavenet-A)
  googleTtsOptions?: GoogleTtsOptions; // Per-personality Google TTS tuning
  ttsRate?: number; // 0.5 - 2.0 playback rate for Browser TTS (1.0 = normal)
  ttsEmotion?: TtsEmotion; // Emotion for TTS (if provider supports it)
  ttsEmotionIntensity?: number; // 0.0 to 1.0 intensity of emotion
  elevenLabsStability?: number; // 0.0 to 1.0 - voice consistency
  elevenLabsSimilarityBoost?: number; // 0.0 to 1.0 - voice clarity
  elevenLabsStyle?: number; // 0.0 to 1.0 - style exaggeration (v2 models)
  elevenLabsSpeakerBoost?: boolean; // Boost speaker similarity
}

export interface Personality {
  id: string;
  name: string;
  knowledge: string;
  prompt: string;
  config: ModelConfig;
  visiblePersonalityIds: string[];
  ttsEnabled?: boolean;
  profileImage?: string; // Base64 data URL
}

export enum MessageAuthor {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export interface ChatMessage {
  author: MessageAuthor;
  text: string;
  timestamp: string;
  authorName?: string; // To specify which AI is talking in a conversation
  authorAvatar?: string; // Profile image URL of the message sender
}

export enum CliOutputType {
  COMMAND,
  RESPONSE,
  ERROR,
  WARNING,
  USER_MESSAGE,
  AI_RESPONSE,
  COMMUNICATION,
  EXTERNAL_LLM_RESPONSE,
}

export interface CliOutput {
  type: CliOutputType;
  text: string;
  authorName?: string; // For AI responses, stores the personality name
}

export interface ApiUsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number; // in USD
  lastUpdated: string;
}

export interface UserData {
  username: string;
  conversations: {
    [personalityId: string]: ChatMessage[];
  };
  apiUsage?: ApiUsageStats;
  loadedPersonalities?: string[]; // Array of personality IDs that were loaded for this user
  lastLogin?: string; // Timestamp of last login
  profilePicture?: string; // URL or base64 encoded image for user avatar
}

export enum WindowStatus {
  OPEN,
  MINIMIZED,
}

export interface WindowState {
  id: string;
  personalityId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  status: WindowStatus;
  sessionTtsEnabled: boolean;
}

// Experimental Settings Types

export type TurnOrderMode = 'sequential' | 'random' | 'weighted' | 'interrupt-based';
export type ContextWeightingMode = 'recency' | 'importance' | 'emotional' | 'relevance';
export type TargetSelectionMode = 'random' | 'affinity-based' | 'topic-interest' | 'needs-based';
export type ConflictMode = 'avoid' | 'neutral' | 'embrace' | 'escalate';
export type RoleAssignmentMode = 'none' | 'emergent' | 'fixed';
export type CommunicationFrequencyPattern = 'constant' | 'bursty' | 'circadian' | 'event-driven';

export interface RelationshipData {
  affinity: number; // -1.0 to 1.0 (antagonistic to friendly)
  familiarity: number; // 0.0 to 1.0 (strangers to close friends)
}

export interface PersonalityOverrides {
  initiativeProbability?: number; // 0.0 to 1.0
  baseVerbosity?: number; // 0.5 to 2.0
  emotionalExpressiveness?: number; // 0.0 to 1.0
  contextWindowSize?: number; // number of messages
  assertiveness?: number; // 0.0 to 1.0 for weighted turn order
  socialEnergy?: number; // 0.0 to 1.0 current social battery
  mood?: 'happy' | 'neutral' | 'frustrated' | 'curious' | 'bored';
  temperatureBoost?: number; // Additional temperature to add during conversations
}

export interface ExperimentalSettings {
  // Conversation Flow & Turn-Taking
  turnOrderMode: TurnOrderMode;
  allowInterruptions: boolean;
  interruptionProbability: number; // 0.0 to 1.0
  dynamicTurnLength: boolean;
  silenceTolerance: number; // milliseconds
  
  // Topic & Context Management
  topicDriftAllowance: number; // 0.0 to 1.0
  enableTopicEvolution: boolean;
  multiTopicMode: boolean;
  contextWindowSize: number; // default message count
  contextWeighting: ContextWeightingMode;
  crossConversationContext: boolean;
  longTermMemoryInfluence: number; // 0.0 to 1.0
  forcedTopic: string; // If set, this topic will be enforced in all conversations
  
  // Autonomous Communication Behavior
  defaultInitiativeProbability: number; // 0.0 to 1.0, can be overridden per personality
  communicationFrequencyPattern: CommunicationFrequencyPattern;
  enableSocialEnergyModel: boolean;
  socialEnergyDepletionRate: number; // 0.0 to 1.0
  socialEnergyRechargeRate: number; // 0.0 to 1.0
  proactiveVsReactive: number; // 0.0 (reactive) to 1.0 (proactive)
  targetSelectionMode: TargetSelectionMode;
  
  // Relationship & Social Dynamics
  enableRelationshipTracking: boolean;
  enableDominanceHierarchy: boolean;
  enableAllianceFormation: boolean;
  conflictMode: ConflictMode;
  
  // Response Characteristics
  defaultVerbosity: number; // 0.5 to 2.0
  verbosityAdaptation: boolean; // match or contrast other speakers
  emotionalExpressiveness: number; // 0.0 to 1.0
  thinkingTimeVariance: boolean;
  enableCertaintyTracking: boolean;
  attentionSpanEnabled: boolean;
  diversityBoost: number; // 0.0 to 0.5 - extra temperature during conversations to increase variety
  
  // Group Conversation Dynamics
  roleAssignment: RoleAssignmentMode;
  groupSizeEffects: boolean;
  enableSubgroupFormation: boolean;
  consensusSeekingVsDiversity: number; // 0.0 (diversity) to 1.0 (consensus)
  
  // Experimental/Advanced
  opinionShiftRate: number; // 0.0 to 1.0
  learningFromInteractions: boolean;
  enableMoodSystem: boolean;
  selfAwareness: number; // 0.0 to 1.0
  theoryOfMind: number; // 0.0 to 1.0
  enableMetacommunication: boolean;
  
  // Conversation Quality & Monitoring
  repetitionDetectionThreshold: number; // 0.0 to 1.0
  enableEngagementScoring: boolean;
  enableCoherenceMonitoring: boolean;
  enableSatisfactionTracking: boolean;
  
  // Per-personality overrides
  personalityOverrides: Record<string, PersonalityOverrides>;
  
  // Relationship matrix
  relationships: Record<string, Record<string, RelationshipData>>; // [personalityId1][personalityId2]
  
  // Prison Gangs Experimental Feature
  gangsEnabled: boolean;
  gangsConfig: GangsConfig;
  // Poverty Simulation Feature
  povertyEnabled: boolean;
  povertyConfig: PovertyConfig;
  // Cigarette Trading System
  cigaretteTradingEnabled: boolean;
  cigaretteConfig: CigaretteConfig;
}

// Prison Gangs Feature Types

// Weapon Types
export enum WeaponType {
  GUN = 'gun',
  SHANK = 'shank',
  CHAIN = 'chain',
}

export interface Weapon {
  id: string;
  type: WeaponType;
  name: string; // Display name (e.g., "Improvised Shank", "9mm Pistol", "Heavy Chain")
  damage: number; // 0 to 100 - damage potential
  concealment: number; // 0 to 1.0 - how easy to hide (affects guard detection)
  durability: number; // 0 to 100 - weapon condition (degrades with use)
  acquiredFrom?: 'guard' | 'stolen' | 'crafted'; // How weapon was obtained
  acquiredAt?: number; // Timestamp of acquisition
}

export interface GuardBribeAttempt {
  id: string;
  personalityId: string;
  weaponType: WeaponType;
  cost: number; // Resources spent on bribe
  success: boolean;
  timestamp: number;
  guardId: string; // Which guard was bribed
}

export interface Guard {
  id: string;
  name: string;
  corruptibility: number; // 0 to 1.0 - how easily bribed
  alertness: number; // 0 to 1.0 - chance of detecting weapons/contraband
  reputation: 'honest' | 'neutral' | 'corrupt' | 'dangerous'; // Guard reputation
}

export interface PrisonItem {
  id: string;
  type: 'prostitute_visit' | 'beer_case' | 'cigarettes' | 'phone_time' | 'luxury_food';
  name: string;
  cost: number; // $ cost
  benefit: string; // Description of benefit
  usedBy?: string; // Personality ID who used it
  usedAt?: number; // Timestamp when used
}

export interface Gang {
  id: string;
  name: string;
  color: string; // Hex color for visual identification
  leaderId: string | null; // Personality ID of the gang leader
  memberIds: string[]; // Personality IDs of gang members
  territoryControl: number; // 0.0 to 1.0 - influence in the prison
  resources: number; // 0 to 100 - gang resources/power
  reputation: number; // 0 to 100 - gang reputation/fear factor
  violence: number; // 0 to 100 - gang violence tendency
  loyalty: number; // 0 to 100 - member loyalty
  weapons: Weapon[]; // Gang's weapon cache
  totalWeapons: number; // Total weapons owned by gang members
  // Drug Economy
  money: number; // $ - Gang's cash from drug dealing
  totalEarnings: number; // $ - Lifetime earnings
  items: PrisonItem[]; // Purchased/stolen prison items
  drugsStash: number; // Drugs stored by gang (grams)
}

export interface GangMemberStatus {
  gangId: string | null; // Which gang this personality belongs to
  rank: 'leader' | 'lieutenant' | 'soldier' | 'recruit' | 'independent'; // Gang rank
  loyalty: number; // 0 to 100 - loyalty to gang
  respect: number; // 0 to 100 - respect from other members
  violence: number; // 0 to 100 - individual violence tendency
  hits: number; // Number of violence actions taken
  imprisoned: boolean; // Is in solitary confinement
  imprisonedUntil?: number; // Timestamp when released from solitary
  killed: boolean; // Has been killed in prison violence
  killedBy?: string; // Personality ID of killer
  killedAt?: number; // Timestamp of death
  weapons: Weapon[]; // Personal weapons
  bribeAttempts: number; // Number of guard bribes attempted
  successfulBribes: number; // Number of successful bribes
  weaponsStolen: number; // Number of weapons taken from others
  weaponsLost: number; // Number of weapons stolen from this member
  deathRiskModifier: number; // Multiplier for death probability (1.0 = normal, 1.5 = 50% higher risk)
  deathImpactApplied?: boolean; // Has the gang-wide death penalty already been processed?
  // Drug Economy
  drugsCarrying: number; // Amount of drugs currently being carried (grams)
  drugsDealt: number; // Total drugs successfully dealt (lifetime)
  drugsSmuggled: number; // Total drugs successfully smuggled in (lifetime)
  drugsCaught: number; // Times caught with drugs
  sentenceExtensions: number; // Additional time added to sentence for drug offenses
  totalDrugEarnings: number; // Total money earned from drug activities ($)
  
  // Achievement tracking
  rivalKills: number; // Number of rival gang members killed (for teardrop tattoos)
  drugTrophies: ('medal' | 'bronze' | 'silver' | 'gold' | 'platinum')[]; // Earned drug dealing trophies
}

export interface GangsConfig {
  numberOfGangs: number; // 2-6 gangs
  prisonEnvironmentIntensity: number; // 0.0 to 1.0 - how harsh the environment is
  violenceFrequency: number; // 0.0 to 1.0 - how often violence occurs
  recruitmentEnabled: boolean; // Can gangs recruit new members?
  territoryWarEnabled: boolean; // Can gangs fight over territory?
  loyaltyDecayRate: number; // 0.0 to 1.0 - how fast loyalty decreases
  independentPersonalitiesAllowed: boolean; // Can personalities stay independent?
  solitaryConfinementEnabled: boolean; // Can violent members be put in solitary?
  deathEnabled: boolean; // Can extreme violence result in death?
  deathProbability: number; // 0.0 to 1.0 - chance of death from violence
  gangNames: string[]; // Custom gang names
  gangColors: string[]; // Custom gang colors
  gangLeaders: Record<string, string>; // gangId -> personalityId mapping
  memberStatus: Record<string, GangMemberStatus>; // personalityId -> status
  gangs: Record<string, Gang>; // gangId -> Gang mapping
  // Weapons System
  weaponsEnabled: boolean; // Enable weapons system
  guardBriberyEnabled: boolean; // Allow bribing guards for weapons
  weaponStealingEnabled: boolean; // Allow stealing weapons after violence
  guards: Record<string, Guard>; // guardId -> Guard mapping
  bribeHistory: GuardBribeAttempt[]; // History of all bribe attempts
  weaponCraftingEnabled: boolean; // Allow crafting improvised weapons
  // Rival Gang Hostility
  rivalHostilityMultiplier: number; // 1.0 to 3.0 - multiplier for violence and abuse toward rival gang members
  // Drug Economy System
  drugEconomyEnabled: boolean; // Enable drug smuggling and dealing
  drugSmugglingFrequency: number; // 0.0 to 1.0 - how often smuggling attempts occur
  drugDealingFrequency: number; // 0.0 to 1.0 - how often dealing occurs
  drugDetectionRisk: number; // 0.0 to 1.0 - base chance of getting caught
  itemStealingEnabled: boolean; // Allow stealing items from other gangs
}

// Poverty Simulation Feature Types

export interface PovertyEvent {
  id: string;
  time: string;
  type: 'benefit_claim' | 'benefit_denied' | 'job_found' | 'job_lost' | 'harassment' | 'assault' | 'health_crisis' | 'debt_incurred' | 'debt_paid' | 'eviction_notice' | 'housing_secured' | 'addiction' | 'recovery' | 'relationship' | 'inspection' | 'police_check' | 'overdose' | 'homeless_ejection' | 'job_success_ejection' | 'random_crisis';
  message: string;
  involvedPersonalities?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PovertyPersonalityStatus {
  personalityId: string;
  
  // 12 Core Daily Variables
  cash_on_hand: number; // Current £ available
  income_today: number; // £ earned + benefits today
  expenses_today: number; // £ spent on rent, food, travel today
  days_unemployed: number; // Running count of unemployment days
  job_status: 'none' | 'temp' | 'employed' | 'fired'; // Current employment status
  health: number; // 0-100 combined physical + mental health
  addiction_level: number; // 0-100 dependency level
  cannabis_consumption: number; // Grams or £ spent per day
  welfare_income_today: number; // DWP/PIP £ received today
  alcohol_units: number; // Units of alcohol consumed today
  incident_today: 'none' | 'harassment' | 'assault' | 'arrest'; // Today's incident
  daily_score: number; // Net outcome for the day
  danger_level: number; // 0-100 environmental danger/risk level
  
  // Critical Status (similar to gang death system)
  struckOffBenefits: boolean; // Permanently struck off - equivalent to "death" in gang system
  struckOffAt?: number; // Timestamp when struck off
  struckOffReason?: string; // Why they were struck off (fraud, etc.)
  ejectedFromSimulation: boolean; // True if ejected from game (homeless or got stable job)
  ejectionReason?: 'homeless' | 'stable_job'; // Why they were ejected
  ejectionDay?: number; // Day they were ejected
  
  // Historical tracking
  totalFundsReceived: number; // £ lifetime
  dwpClaimsApproved: number;
  dwpClaimsDenied: number;
  pipClaimsApproved: number;
  pipClaimsDenied: number;
  falseClaims: number;
  psychologicalStability: number; // 0-100 (higher = more stable)
  stressLevel: number; // 0-100
  currentHousing: 'none' | 'street' | 'hostel' | 'shared_house' | 'own_home';
  evictionRisk: number; // 0.0 to 1.0
  assaultIncidents: number;
  harassmentIncidents: number;
  injurySeverity: 'none' | 'minor' | 'serious' | 'critical';
  hospitalizations: number;
  hospitalDaysRemaining: number;
  deathRisk: number; // 0.0 to 1.0
  relationships: Record<string, number>; // personalityId -> affinity (-100 to 100)
  protectiveActions: string[]; // List of protective measures taken
  successfulEvasions: number;
  failedEvasions: number;
  improvementScore: number; // Overall improvement metric
  
  // Survival Activities (when out of money)
  survivalActivity: 'none' | 'food_bank' | 'temp_housing' | 'prostitution' | 'homeless';
  survivalActivityStarted?: number; // Timestamp when activity started
  foodBankVisits: number; // Times used food bank
  tempHousingDays: number; // Days in temporary housing
  prostitutionEarnings: number; // Total earned from prostitution
  prostitutionRisks: number; // Times faced danger while prostituting
}

export interface PovertyConfig {
  // Core Settings
  povertyEnabled: boolean;
  numberOfPovertyPersonalities: number; // How many active personalities in poverty
  simulationIntensity: number; // 0.0 to 1.0 - how harsh conditions are
  
  // Duration Settings (Time-based activation)
  povertyDurationDays: number; // Number of days poverty mode should run for (0 = indefinite)
  povertyStartDate: number; // Timestamp when poverty mode was activated
  povertyEndDate: number; // Timestamp when poverty mode will end (0 = indefinite)
  currentSimulationDay: number; // Current day in the simulation (increments daily)
  
  // Economic Settings
  baseWelfareAmount: number; // £ per day from DWP
  pipBaseAmount: number; // £ per day from PIP
  jobFindRate: number; // 0.0 to 1.0 - probability of finding short-term work
  averageWagePerJob: number; // £ earned from gig work
  fraudDetectionRate: number; // 0.0 to 1.0 - chance of getting caught with false claims
  
  // Daily Expense Settings
  baseRentPerDay: number; // £ per day for rent/housing
  baseFoodCostPerDay: number; // £ per day for food
  baseTravelCostPerDay: number; // £ per day for travel
  cannabisPricePerGram: number; // £ per gram of cannabis
  
  // Psychological Settings
  stressAccumulationRate: number; // 0.0 to 1.0 - how fast stress increases
  alcoholAddictionRate: number; // 0.0 to 1.0 - addiction progression rate
  mentalHealthDeclineRate: number; // 0.0 to 1.0 - psychological stability decline
  recoveryRate: number; // 0.0 to 1.0 - how fast people recover with support
  
  // Risk & Safety Settings
  assaultRiskBase: number; // 0.0 to 1.0 - base probability of assault
  harassmentFrequency: number; // 0.0 to 1.0 - how often harassment occurs
  timeOfDayFactor: boolean; // Different risks by time of day
  policeVisitFrequency: number; // 0.0 to 1.0 - how often police check up
  deathRiskFromOverdose: number; // 0.0 to 1.0 - overdose fatality rate
  
  // Housing & Welfare System
  housingCrisisEnabled: boolean;
  evictionFrequency: number; // 0.0 to 1.0 - how often evictions occur
  inspectionFrequency: number; // 0.0 to 1.0 - DWP/PIP inspections
  benefitAuditFrequency: number; // 0.0 to 1.0 - detection rate for fraud
  
  // Relationship & Community
  communityTrustImportance: number; // How much community support helps (0.0 to 1.0)
  partnershipStabilityBonus: number; // Boost from stable relationships
  familySupportEnabled: boolean;
  
  // Protective Factors
  deescalationSuccessRate: number; // 0.0 to 1.0 - success rate when trying to de-escalate
  safePlacesAvailable: boolean;
  safeRoutesEffect: number; // 0.0 to 1.0 - how much safe routes help
  
  // Personality-level tracking
  personalityStatus: Record<string, PovertyPersonalityStatus>;
}

export interface PovertyScore {
  goldMedal: {
    achieved: boolean;
    days: number; // Days survived in poverty
    condition: string; // Condition that was met
  };
  silverMedal: {
    achieved: boolean;
    ratio: number; // DWP payout ratio
  };
  bronzeMedal: {
    achieved: boolean;
    days: number; // Days under heavy alcohol use
  };
}

// Cigarette Trading System Types

export interface CigaretteDeal {
  id: string;
  time: string;
  seller: string; // Personality ID
  sellerName: string;
  buyer: string; // Personality ID
  buyerName: string;
  quantity: number; // Number of cigarettes
  pricePerCig: number; // £ per cigarette
  totalPrice: number; // Total £
  outcome: 'success' | 'violence' | 'arrest' | 'negotiated';
  profitForSeller?: number; // Actual profit (could be negative)
  injuryType?: 'none' | 'minor' | 'serious' | 'stabbing';
  details: string; // Description of what happened
  location?: string; // Where the deal occurred
  witnessed: boolean; // Was deal witnessed by others
}

export interface CigarettePersonalityStatus {
  personalityId: string;
  cigaretteInventory: number; // How many cigarettes they have
  totalSold: number; // Lifetime cigarettes sold
  totalBought: number; // Lifetime cigarettes bought
  totalProfit: number; // £ made from selling
  totalSpent: number; // £ spent buying
  successfulDeals: number;
  violentDeals: number; // Deals that ended in violence
  stabbings: number; // Times stabbed during a deal
  stabbed: boolean; // Currently injured from stabbing
  stabbedBy?: string; // Who stabbed them
  daysUntilHealed: number; // Days until stabbing wound heals
  reputation: number; // 0-100 (higher = better negotiator/dealer)
  suspicion: number; // 0-100 (higher = cops watching)
  wantedLevel: number; // 0-100 (higher = active police interest)
}

export interface CigaretteConfig {
  // Core Settings
  cigaretteTradingEnabled: boolean;
  tradingIntensity: number; // 0.0 to 1.0 - how active the trading is
  
  // Economic Settings
  basePrice: number; // £ per cigarette default
  priceVariation: number; // 0-1.0 - how much prices vary
  marginTarget: number; // Target profit margin for dealers (0-1.0)
  
  // Deal Outcome Rates
  successRate: number; // 0.0-1.0 - chance deal goes smoothly
  violenceRate: number; // 0.0-1.0 - chance of stabbing
  arrestRate: number; // 0.0-1.0 - chance of police arrest
  negotiationRate: number; // 0.0-1.0 - chance of price negotiation
  
  // Violence Settings
  stabbingDamage: number; // Injury severity (1-10)
  recoveryDays: number; // Days to heal from stabbing
  deathFromStabbing: number; // 0.0-1.0 - chance stabbing is fatal
  
  // Environmental
  policePresence: number; // 0.0-1.0 - base police activity
  timeOfDayFactor: boolean; // Different risks by time
  reputationMechanics: boolean; // Reputation affects deals
  
  // Personality Status Tracking
  personalityStatus: Record<string, CigarettePersonalityStatus>;
}

export interface CigaretteTransactionEvent {
  id: string;
  time: string;
  type: 'deal_offered' | 'deal_accepted' | 'deal_rejected' | 'deal_completed' | 'violence_escalated' | 'stabbing' | 'arrest' | 'recovery';
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  involvedPersonalities?: string[];
}