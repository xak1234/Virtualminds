import React from 'react';
import type { 
  ExperimentalSettings, 
  TurnOrderMode, 
  ContextWeightingMode,
  TargetSelectionMode,
  ConflictMode,
  RoleAssignmentMode,
  CommunicationFrequencyPattern,
  Personality,
  PersonalityOverrides
} from '../types';

interface ExperimentalSettingsPanelProps {
  settings: ExperimentalSettings;
  onUpdate: (settings: ExperimentalSettings) => void;
  activePersonalities: Personality[];
}

export const ExperimentalSettingsPanel: React.FC<ExperimentalSettingsPanelProps> = ({
  settings,
  onUpdate,
  activePersonalities
}) => {
  const updateSetting = <K extends keyof ExperimentalSettings>(key: K, value: ExperimentalSettings[K]) => {
    // Mark that user is actively changing settings to prevent gang dynamics interference
    (window as any).userSettingsChangeInProgress = true;
    
    // Clear any existing timeout to extend the protection period
    if ((window as any).userSettingsTimeout) {
      clearTimeout((window as any).userSettingsTimeout);
    }
    
    onUpdate({ ...settings, [key]: value });
    
    // Set a new timeout with extended delay for slider changes
    (window as any).userSettingsTimeout = setTimeout(() => {
      (window as any).userSettingsChangeInProgress = false;
      (window as any).userSettingsTimeout = null;
    }, 3000); // Extended to 3 seconds for better protection during slider adjustments
  };

  const updatePersonalityOverride = (personalityId: string, key: keyof PersonalityOverrides, value: any) => {
    const overrides = { ...settings.personalityOverrides };
    if (!overrides[personalityId]) {
      overrides[personalityId] = {};
    }
    overrides[personalityId] = { ...overrides[personalityId], [key]: value };
    updateSetting('personalityOverrides', overrides);
  };

  const resetToDefaults = () => {
    onUpdate(getDefaultExperimentalSettings());
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-light-panel dark:bg-base-800 z-10 pb-2 border-b border-light-border dark:border-base-700">
        <div className="flex-1 text-center">
          <h3 className="text-lg font-bold text-light-text dark:text-gray-200">Experimental Settings</h3>
          <p className="text-xs text-light-text-secondary dark:text-gray-400">
            Advanced controls for exploring virtual mind behavior
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="px-3 py-1 text-xs bg-base-600 hover:bg-base-500 text-white rounded"
        >
          Reset All
        </button>
      </div>

      {/* 1. Conversation Flow & Turn-Taking */}
      <Section title="Conversation Flow & Turn-Taking">
        <SelectField
          label="Turn Order Mode"
          value={settings.turnOrderMode}
          onChange={(v) => updateSetting('turnOrderMode', v as TurnOrderMode)}
          options={[
            { value: 'sequential', label: 'Sequential (round-robin)' },
            { value: 'random', label: 'Random' },
            { value: 'weighted', label: 'Weighted (by assertiveness)' },
            { value: 'interrupt-based', label: 'Interrupt-based' }
          ]}
        />
        
        <CheckboxField
          label="Allow Interruptions"
          checked={settings.allowInterruptions}
          onChange={(v) => updateSetting('allowInterruptions', v)}
          description="Let personalities break turn order when invested"
        />
        
        {settings.allowInterruptions && (
          <SliderField
            label="Interruption Probability"
            value={settings.interruptionProbability}
            onChange={(v) => updateSetting('interruptionProbability', v)}
            min={0}
            max={1}
            step={0.05}
          />
        )}
        
        <CheckboxField
          label="Dynamic Turn Length"
          checked={settings.dynamicTurnLength}
          onChange={(v) => updateSetting('dynamicTurnLength', v)}
          description="Vary turn count based on engagement"
        />
        
        <SliderField
          label="Silence Tolerance (ms)"
          value={settings.silenceTolerance}
          onChange={(v) => updateSetting('silenceTolerance', v)}
          min={0}
          max={5000}
          step={100}
        />
      </Section>

      {/* 2. Topic & Context Management */}
      <Section title="Topic & Context Management">
        <div>
          <label className="block text-light-text dark:text-gray-300 mb-1">Forced Topic</label>
          <input
            type="text"
            value={settings.forcedTopic}
            onChange={(e) => updateSetting('forcedTopic', e.target.value)}
            placeholder="Enter a topic to force in all conversations..."
            className="w-full bg-light-panel dark:bg-base-800 border border-light-border dark:border-base-600 rounded px-2 py-1 text-light-text dark:text-gray-200 text-sm"
          />
          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">
            If set, this topic will override conversation topics. Leave blank to allow normal topic selection.
          </p>
        </div>
        
        <SliderField
          label="Topic Drift Allowance"
          value={settings.topicDriftAllowance}
          onChange={(v) => updateSetting('topicDriftAllowance', v)}
          min={0}
          max={1}
          step={0.05}
          description="0 = strict topic, 1 = free tangents"
        />
        
        <CheckboxField
          label="Enable Topic Evolution"
          checked={settings.enableTopicEvolution}
          onChange={(v) => updateSetting('enableTopicEvolution', v)}
          description="Allow organic topic shifts"
        />
        
        <CheckboxField
          label="Multi-Topic Mode"
          checked={settings.multiTopicMode}
          onChange={(v) => updateSetting('multiTopicMode', v)}
          description="Track multiple parallel topics"
        />
        
        <SliderField
          label="Context Window Size"
          value={settings.contextWindowSize}
          onChange={(v) => updateSetting('contextWindowSize', v)}
          min={2}
          max={20}
          step={1}
          description="Number of messages to remember"
        />
        
        <SelectField
          label="Context Weighting"
          value={settings.contextWeighting}
          onChange={(v) => updateSetting('contextWeighting', v as ContextWeightingMode)}
          options={[
            { value: 'recency', label: 'Recency (newest first)' },
            { value: 'importance', label: 'Importance' },
            { value: 'emotional', label: 'Emotional' },
            { value: 'relevance', label: 'Relevance' }
          ]}
        />
        
        <CheckboxField
          label="Cross-Conversation Context"
          checked={settings.crossConversationContext}
          onChange={(v) => updateSetting('crossConversationContext', v)}
          description="Reference other conversations"
        />
        
        <SliderField
          label="Long-Term Memory Influence"
          value={settings.longTermMemoryInfluence}
          onChange={(v) => updateSetting('longTermMemoryInfluence', v)}
          min={0}
          max={1}
          step={0.05}
          description="How much old conversations matter"
        />
      </Section>

      {/* 3. Autonomous Communication Behavior */}
      <Section title="Autonomous Communication Behavior">
        <SliderField
          label="Default Initiative Probability"
          value={settings.defaultInitiativeProbability}
          onChange={(v) => updateSetting('defaultInitiativeProbability', v)}
          min={0}
          max={1}
          step={0.05}
          description="Base chance to initiate communication"
        />
        
        <SelectField
          label="Communication Frequency Pattern"
          value={settings.communicationFrequencyPattern}
          onChange={(v) => updateSetting('communicationFrequencyPattern', v as CommunicationFrequencyPattern)}
          options={[
            { value: 'constant', label: 'Constant' },
            { value: 'bursty', label: 'Bursty (clusters of activity)' },
            { value: 'circadian', label: 'Circadian (time-based)' },
            { value: 'event-driven', label: 'Event-driven' }
          ]}
        />
        
        <CheckboxField
          label="Enable Social Energy Model"
          checked={settings.enableSocialEnergyModel}
          onChange={(v) => updateSetting('enableSocialEnergyModel', v)}
          description="Track social battery depletion/recharge"
        />
        
        {settings.enableSocialEnergyModel && (
          <>
            <SliderField
              label="Energy Depletion Rate"
              value={settings.socialEnergyDepletionRate}
              onChange={(v) => updateSetting('socialEnergyDepletionRate', v)}
              min={0}
              max={1}
              step={0.05}
            />
            
            <SliderField
              label="Energy Recharge Rate"
              value={settings.socialEnergyRechargeRate}
              onChange={(v) => updateSetting('socialEnergyRechargeRate', v)}
              min={0}
              max={1}
              step={0.05}
            />
          </>
        )}
        
        <SliderField
          label="Proactive vs Reactive"
          value={settings.proactiveVsReactive}
          onChange={(v) => updateSetting('proactiveVsReactive', v)}
          min={0}
          max={1}
          step={0.05}
          description="0 = reactive, 1 = proactive"
        />
        
        <SelectField
          label="Target Selection Mode"
          value={settings.targetSelectionMode}
          onChange={(v) => updateSetting('targetSelectionMode', v as TargetSelectionMode)}
          options={[
            { value: 'random', label: 'Random' },
            { value: 'affinity-based', label: 'Affinity-based' },
            { value: 'topic-interest', label: 'Topic Interest' },
            { value: 'needs-based', label: 'Needs-based' }
          ]}
        />
      </Section>

      {/* 4. Relationship & Social Dynamics */}
      <Section title="Relationship & Social Dynamics">
        <CheckboxField
          label="Enable Relationship Tracking"
          checked={settings.enableRelationshipTracking}
          onChange={(v) => updateSetting('enableRelationshipTracking', v)}
          description="Track affinity and familiarity between personalities"
        />
        
        <CheckboxField
          label="Enable Dominance Hierarchy"
          checked={settings.enableDominanceHierarchy}
          onChange={(v) => updateSetting('enableDominanceHierarchy', v)}
          description="Establish social hierarchy"
        />
        
        <CheckboxField
          label="Enable Alliance Formation"
          checked={settings.enableAllianceFormation}
          onChange={(v) => updateSetting('enableAllianceFormation', v)}
          description="Allow coalition building"
        />
        
        <SelectField
          label="Conflict Mode"
          value={settings.conflictMode}
          onChange={(v) => updateSetting('conflictMode', v as ConflictMode)}
          options={[
            { value: 'avoid', label: 'Avoid' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'embrace', label: 'Embrace' },
            { value: 'escalate', label: 'Escalate' }
          ]}
        />
      </Section>

      {/* 5. Response Characteristics */}
      <Section title="Response Characteristics">
        <SliderField
          label="Default Verbosity"
          value={settings.defaultVerbosity}
          onChange={(v) => updateSetting('defaultVerbosity', v)}
          min={0.5}
          max={2.0}
          step={0.1}
          description="0.5 = terse, 2.0 = verbose"
        />
        
        <SliderField
          label="Diversity Boost (Temperature)"
          value={settings.diversityBoost}
          onChange={(v) => updateSetting('diversityBoost', v)}
          min={0}
          max={0.5}
          step={0.05}
          description="Increase response variety (reduces repetition)"
        />
        
        <CheckboxField
          label="Verbosity Adaptation"
          checked={settings.verbosityAdaptation}
          onChange={(v) => updateSetting('verbosityAdaptation', v)}
          description="Match other speaker's length"
        />
        
        <SliderField
          label="Emotional Expressiveness"
          value={settings.emotionalExpressiveness}
          onChange={(v) => updateSetting('emotionalExpressiveness', v)}
          min={0}
          max={1}
          step={0.05}
          description="How much emotion shows in text"
        />
        
        <CheckboxField
          label="Thinking Time Variance"
          checked={settings.thinkingTimeVariance}
          onChange={(v) => updateSetting('thinkingTimeVariance', v)}
          description="Vary pause durations naturally"
        />
        
        <CheckboxField
          label="Enable Certainty Tracking"
          checked={settings.enableCertaintyTracking}
          onChange={(v) => updateSetting('enableCertaintyTracking', v)}
          description="Track confidence in responses"
        />
        
        <CheckboxField
          label="Attention Span Enabled"
          checked={settings.attentionSpanEnabled}
          onChange={(v) => updateSetting('attentionSpanEnabled', v)}
          description="May lose thread in long conversations"
        />
      </Section>

      {/* 6. Group Conversation Dynamics */}
      <Section title="Group Conversation Dynamics">
        <SelectField
          label="Role Assignment"
          value={settings.roleAssignment}
          onChange={(v) => updateSetting('roleAssignment', v as RoleAssignmentMode)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'emergent', label: 'Emergent' },
            { value: 'fixed', label: 'Fixed' }
          ]}
        />
        
        <CheckboxField
          label="Group Size Effects"
          checked={settings.groupSizeEffects}
          onChange={(v) => updateSetting('groupSizeEffects', v)}
          description="Adjust behavior based on group size"
        />
        
        <CheckboxField
          label="Enable Subgroup Formation"
          checked={settings.enableSubgroupFormation}
          onChange={(v) => updateSetting('enableSubgroupFormation', v)}
          description="Allow splitting into smaller conversations"
        />
        
        <SliderField
          label="Consensus Seeking vs Diversity"
          value={settings.consensusSeekingVsDiversity}
          onChange={(v) => updateSetting('consensusSeekingVsDiversity', v)}
          min={0}
          max={1}
          step={0.05}
          description="0 = embrace diversity, 1 = seek consensus"
        />
      </Section>

      {/* 7. Experimental/Advanced */}
      <Section title="Experimental/Advanced">
        <SliderField
          label="Opinion Shift Rate"
          value={settings.opinionShiftRate}
          onChange={(v) => updateSetting('opinionShiftRate', v)}
          min={0}
          max={1}
          step={0.05}
          description="Can personalities change their views?"
        />
        
        <CheckboxField
          label="Learning from Interactions"
          checked={settings.learningFromInteractions}
          onChange={(v) => updateSetting('learningFromInteractions', v)}
          description="Adapt communication style over time"
        />
        
        <CheckboxField
          label="Enable Mood System"
          checked={settings.enableMoodSystem}
          onChange={(v) => updateSetting('enableMoodSystem', v)}
          description="Track emotional states"
        />
        
        <SliderField
          label="Self Awareness"
          value={settings.selfAwareness}
          onChange={(v) => updateSetting('selfAwareness', v)}
          min={0}
          max={1}
          step={0.05}
          description="Recognize repetition, dominance"
        />
        
        <SliderField
          label="Theory of Mind"
          value={settings.theoryOfMind}
          onChange={(v) => updateSetting('theoryOfMind', v)}
          min={0}
          max={1}
          step={0.05}
          description="Model others' mental states"
        />
        
        <CheckboxField
          label="Enable Metacommunication"
          checked={settings.enableMetacommunication}
          onChange={(v) => updateSetting('enableMetacommunication', v)}
          description="Discuss the conversation itself"
        />
      </Section>

      {/* 8. Conversation Quality & Monitoring */}
      <Section title="Conversation Quality & Monitoring">
        <SliderField
          label="Repetition Detection Threshold"
          value={settings.repetitionDetectionThreshold}
          onChange={(v) => updateSetting('repetitionDetectionThreshold', v)}
          min={0}
          max={1}
          step={0.05}
          description="Auto-detect stuck conversations"
        />
        
        <CheckboxField
          label="Enable Engagement Scoring"
          checked={settings.enableEngagementScoring}
          onChange={(v) => updateSetting('enableEngagementScoring', v)}
          description="Track how engaged each personality is"
        />
        
        <CheckboxField
          label="Enable Coherence Monitoring"
          checked={settings.enableCoherenceMonitoring}
          onChange={(v) => updateSetting('enableCoherenceMonitoring', v)}
          description="Detect incoherent conversations"
        />
        
        <CheckboxField
          label="Enable Satisfaction Tracking"
          checked={settings.enableSatisfactionTracking}
          onChange={(v) => updateSetting('enableSatisfactionTracking', v)}
          description="Track conversation satisfaction"
        />
      </Section>

      {/* NOTE: Prison Gangs settings have been moved to their own dedicated "Gangs" tab in Settings Modal */}

      {/* 9. Per-Personality Overrides */}
      {activePersonalities.length > 0 && (
        <Section title="Per-Personality Overrides">
          <p className="text-xs text-light-text-secondary dark:text-gray-400 mb-3">
            Override settings for individual personalities. Leave blank to use defaults.
          </p>
          {activePersonalities.map((personality) => (
            <div key={personality.id} className="mb-4 p-3 bg-black/5 dark:bg-base-900 rounded border border-light-border dark:border-base-700">
              <h4 className="font-semibold text-sm mb-2 text-light-text dark:text-gray-200">{personality.name}</h4>
              <div className="space-y-2">
                <SliderField
                  label="Initiative Probability"
                  value={settings.personalityOverrides[personality.id]?.initiativeProbability ?? settings.defaultInitiativeProbability}
                  onChange={(v) => updatePersonalityOverride(personality.id, 'initiativeProbability', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  small
                />
                
                <SliderField
                  label="Verbosity"
                  value={settings.personalityOverrides[personality.id]?.baseVerbosity ?? settings.defaultVerbosity}
                  onChange={(v) => updatePersonalityOverride(personality.id, 'baseVerbosity', v)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  small
                />
                
                <SliderField
                  label="Emotional Expressiveness"
                  value={settings.personalityOverrides[personality.id]?.emotionalExpressiveness ?? settings.emotionalExpressiveness}
                  onChange={(v) => updatePersonalityOverride(personality.id, 'emotionalExpressiveness', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  small
                />
                
                <SliderField
                  label="Assertiveness"
                  value={settings.personalityOverrides[personality.id]?.assertiveness ?? 0.5}
                  onChange={(v) => updatePersonalityOverride(personality.id, 'assertiveness', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  small
                />
                
                <SliderField
                  label="Temperature Boost"
                  value={settings.personalityOverrides[personality.id]?.temperatureBoost ?? settings.diversityBoost}
                  onChange={(v) => updatePersonalityOverride(personality.id, 'temperatureBoost', v)}
                  min={0}
                  max={0.5}
                  step={0.05}
                  small
                />
                
                {settings.enableSocialEnergyModel && (
                  <SliderField
                    label="Social Energy"
                    value={settings.personalityOverrides[personality.id]?.socialEnergy ?? 1.0}
                    onChange={(v) => updatePersonalityOverride(personality.id, 'socialEnergy', v)}
                    min={0}
                    max={1}
                    step={0.05}
                    small
                  />
                )}
                
                {settings.enableMoodSystem && (
                  <SelectField
                    label="Mood"
                    value={settings.personalityOverrides[personality.id]?.mood ?? 'neutral'}
                    onChange={(v) => updatePersonalityOverride(personality.id, 'mood', v)}
                    options={[
                      { value: 'happy', label: 'Happy' },
                      { value: 'neutral', label: 'Neutral' },
                      { value: 'frustrated', label: 'Frustrated' },
                      { value: 'curious', label: 'Curious' },
                      { value: 'bored', label: 'Bored' }
                    ]}
                    small
                  />
                )}
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
};

// Helper Components

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-light-border dark:border-base-700 rounded-lg p-4 bg-black/5 dark:bg-base-900">
    <h4 className="font-semibold text-sm mb-3 text-primary">{title}</h4>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const SliderField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  description?: string;
  small?: boolean;
}> = ({ label, value, onChange, min, max, step, description, small }) => (
  <div className={small ? 'text-xs' : ''}>
    <div className="flex justify-between items-center mb-1">
      <label className="text-light-text dark:text-gray-300">{label}</label>
      <span className="text-primary font-mono text-xs">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full"
    />
    {description && (
      <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">{description}</p>
    )}
  </div>
);

const CheckboxField: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}> = ({ label, checked, onChange, description }) => (
  <div className="flex items-start gap-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1"
    />
    <div className="flex-1">
      <label className="text-light-text dark:text-gray-300 cursor-pointer" onClick={() => onChange(!checked)}>
        {label}
      </label>
      {description && (
        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  small?: boolean;
}> = ({ label, value, onChange, options, small }) => (
  <div className={small ? 'text-xs' : ''}>
    <label className="block text-light-text dark:text-gray-300 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-light-panel dark:bg-base-800 border border-light-border dark:border-base-600 rounded px-2 py-1 text-light-text dark:text-gray-200"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Default settings factory
export const getDefaultExperimentalSettings = (): ExperimentalSettings => ({
  // Conversation Flow & Turn-Taking
  turnOrderMode: 'sequential',
  allowInterruptions: false,
  interruptionProbability: 0.2,
  dynamicTurnLength: false,
  silenceTolerance: 1000,
  
  // Topic & Context Management
  topicDriftAllowance: 0.3,
  enableTopicEvolution: true,
  multiTopicMode: false,
  contextWindowSize: 6,
  contextWeighting: 'recency',
  crossConversationContext: false,
  longTermMemoryInfluence: 0.2,
  forcedTopic: '',
  
  // Autonomous Communication Behavior
  defaultInitiativeProbability: 0.5,
  communicationFrequencyPattern: 'constant',
  enableSocialEnergyModel: false,
  socialEnergyDepletionRate: 0.1,
  socialEnergyRechargeRate: 0.05,
  proactiveVsReactive: 0.5,
  targetSelectionMode: 'random',
  
  // Relationship & Social Dynamics
  enableRelationshipTracking: false,
  enableDominanceHierarchy: false,
  enableAllianceFormation: false,
  conflictMode: 'neutral',
  
  // Response Characteristics
  defaultVerbosity: 1.0,
  verbosityAdaptation: false,
  emotionalExpressiveness: 0.5,
  thinkingTimeVariance: false,
  enableCertaintyTracking: false,
  attentionSpanEnabled: false,
  diversityBoost: 0.2,
  
  // Group Conversation Dynamics
  roleAssignment: 'none',
  groupSizeEffects: false,
  enableSubgroupFormation: false,
  consensusSeekingVsDiversity: 0.5,
  
  // Experimental/Advanced
  opinionShiftRate: 0.0,
  learningFromInteractions: false,
  enableMoodSystem: false,
  selfAwareness: 0.0,
  theoryOfMind: 0.5,
  enableMetacommunication: false,
  
  // Conversation Quality & Monitoring
  repetitionDetectionThreshold: 0.7,
  enableEngagementScoring: false,
  enableCoherenceMonitoring: false,
  enableSatisfactionTracking: false,
  
  // Per-personality overrides
  personalityOverrides: {},
  
  // Relationship matrix
  relationships: {},
  
  // Prison Gangs (disabled by default)
  gangsEnabled: false,
  gangsConfig: {
    numberOfGangs: 3,
    prisonEnvironmentIntensity: 0.5,
    violenceFrequency: 0.3,
    recruitmentEnabled: true,
    territoryWarEnabled: true,
    loyaltyDecayRate: 0.02, // Reduced from 0.1 to prevent rapid gang disintegration
    independentPersonalitiesAllowed: true,
    solitaryConfinementEnabled: true,
    deathEnabled: false, // Disabled by default
    deathProbability: 0.05, // 5% chance
    gangNames: [],
    gangColors: [],
    gangLeaders: {},
    memberStatus: {},
    gangs: {},
    // Weapons System (disabled by default)
    weaponsEnabled: false,
    guardBriberyEnabled: true,
    weaponStealingEnabled: true,
    weaponCraftingEnabled: true,
    guards: {},
    bribeHistory: [],
    rivalHostilityMultiplier: 1.0,
    // Drug Economy System (enabled by default for better experience)
    drugEconomyEnabled: true,
    drugSmugglingFrequency: 0.5,
    drugDealingFrequency: 0.6,
    drugDetectionRisk: 0.12,
    itemStealingEnabled: true,
  },
  povertyEnabled: false,
  povertyConfig: {
    povertyEnabled: false,
    numberOfPovertyPersonalities: 2,
    simulationIntensity: 0.5,
    baseWelfareAmount: 25,
    pipBaseAmount: 15,
    jobFindRate: 0.15,
    averageWagePerJob: 80,
    fraudDetectionRate: 0.1,
    stressAccumulationRate: 0.05,
    alcoholAddictionRate: 0.03,
    mentalHealthDeclineRate: 0.04,
    recoveryRate: 0.02,
    assaultRiskBase: 0.08,
    harassmentFrequency: 0.1,
    timeOfDayFactor: true,
    policeVisitFrequency: 0.05,
    deathRiskFromOverdose: 0.02,
    housingCrisisEnabled: true,
    evictionFrequency: 0.03,
    inspectionFrequency: 0.05,
    benefitAuditFrequency: 0.08,
    communityTrustImportance: 0.7,
    partnershipStabilityBonus: 0.3,
    familySupportEnabled: true,
    deescalationSuccessRate: 0.6,
    safePlacesAvailable: true,
    safeRoutesEffect: 0.4,
    personalityStatus: {},
  },
  cigaretteTradingEnabled: false,
  cigaretteConfig: {
    cigaretteTradingEnabled: false,
    tradingIntensity: 0.5,
    basePrice: 2.5,
    priceVariation: 0.3,
    marginTarget: 0.4,
    successRate: 0.65,
    violenceRate: 0.15,
    arrestRate: 0.1,
    negotiationRate: 0.25,
    stabbingDamage: 5,
    recoveryDays: 7,
    deathFromStabbing: 0.05,
    policePresence: 0.2,
    timeOfDayFactor: true,
    reputationMechanics: true,
    personalityStatus: {},
  },
});

