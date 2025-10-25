# Prison Gangs - Weapons System

## Overview

The **Weapons System** is an advanced extension to the Prison Gangs simulation that introduces combat weapons, guard corruption, and weapon acquisition mechanics. Gang members can now obtain and use **guns**, **shanks**, and **chains** to dramatically increase their combat effectiveness and lethality.

## Weapon Types

### 🔫 Guns (Firearms)
- **Damage:** 70-90 (highest)
- **Success Bonus:** +27% chance to hit
- **Death Multiplier:** Up to 4x death chance
- **Concealment:** 0.25-0.6 (harder to hide)
- **Acquisition:** Can only be obtained by bribing guards
- **Durability:** 100 (degrades 5-20 per use)

**Variants:**
- 9mm Pistol (90 damage, 0.3 concealment)
- Revolver (85 damage, 0.25 concealment)
- Derringer (70 damage, 0.6 concealment - easier to hide)

### 🔪 Shanks (Improvised Blades)
- **Damage:** 30-50 (low)
- **Success Bonus:** +10% chance to hit
- **Death Multiplier:** Up to 1.5x death chance
- **Concealment:** 0.7-0.9 (easy to hide)
- **Acquisition:** Can be crafted or obtained from guards
- **Durability:** 60-100 (crafted weapons start at 60)

**Variants:**
- Sharpened Toothbrush (30 damage, 0.9 concealment)
- Metal Shank (50 damage, 0.7 concealment)
- Glass Shard (40 damage, 0.85 concealment)

### ⛓️ Chains (Blunt Weapons)
- **Damage:** 55-70 (medium-high)
- **Success Bonus:** +17% chance to hit
- **Death Multiplier:** Up to 2.3x death chance
- **Concealment:** 0.3-0.5 (moderate)
- **Acquisition:** Can be crafted or obtained from guards
- **Durability:** 60-100 (crafted weapons start at 60)

**Variants:**
- Heavy Chain (60 damage, 0.4 concealment)
- Bike Chain (55 damage, 0.5 concealment)
- Lock and Chain (70 damage, 0.3 concealment)

## Weapon Acquisition Methods

### 1. 🤝 Guard Bribery

Gang members can bribe corrupt prison guards to smuggle weapons into the prison.

**How it works:**
- Random guard is selected for bribery attempt
- **Cost:** Based on weapon type and guard corruptibility
  - Guns: ~30 resources (most expensive)
  - Chains: ~15 resources
  - Shanks: ~10 resources (cheapest)
- **Success factors:**
  - Guard's corruptibility (0-100%)
  - Member's respect (+20% max)
  - Gang reputation (+15% max)
  - Guard's alertness (-30% max)

**Consequences:**
- **Success:** Receive weapon, +5 respect, resources deducted
- **Failure (not caught):** Lose half the bribe cost
- **Failure (caught):** Sent to solitary confinement (45 seconds) if enabled

**Example:**
```
Attempting to bribe Officer Rodriguez for a gun...
Cost: 25 resources
Success chance: 68% (corrupt guard + high respect)
Result: 🤝 Successfully bribed Officer Rodriguez! Received 9mm Pistol. Cost: 25 resources.
```

### 2. 🔨 Weapon Crafting

Members can craft improvised weapons from available materials.

**How it works:**
- **Craftable weapons:** Shanks and Chains only (no guns)
- **Success rate:** 50-90% based on violence stat (experience)
- **Cost:** Free (no resources required)
- **Durability:** Crafted weapons start at 60 durability vs 100 for bribed weapons
- **Respect gain:** +2 respect for successful crafting

**Example:**
```
Attempting to craft a shank...
Success chance: 75% (violence stat: 50)
Result: 🔨 Successfully crafted Metal Shank!
```

### 3. 🔪 Weapon Stealing

After a successful violent attack, there's a chance to steal a weapon from the victim.

**How it works:**
- **Trigger:** After successful hit on target with weapons
- **Chance:** 40% to steal a random weapon
- **Effects:** 
  - Victim loses weapon
  - Attacker gains weapon
  - Attacker gains +8 respect
  - Victim's weaponsLost counter increases
  - Attacker's weaponsStolen counter increases

**Example:**
```
Violence result: 💥 Red Gang hit Blue Gang member using Heavy Chain and stole 9mm Pistol! 
Territory gained: 8.0%
```

## Weapon Effects in Combat

### Violence Success Bonus
Weapons increase the chance of a successful hit:
- **Base success:** 50%
- **With Gun (90 damage):** +27% → 77% chance
- **With Chain (70 damage):** +21% → 71% chance
- **With Shank (50 damage):** +15% → 65% chance

### Territory Gains
Weapons increase territorial control shifts:
- **Without weapon:** +5% territory per hit
- **With weapon:** +8% territory per hit

### Death Probability
When death is enabled, weapons dramatically increase lethality:
- **Base death chance:** 5% (after 5+ hits)
- **With Gun (90 damage):** 5% × 3.7 = **18.5% death chance**
- **With Chain (70 damage):** 5% × 3.1 = **15.5% death chance**
- **With Shank (50 damage):** 5% × 2.5 = **12.5% death chance**

### Respect Gains
More respect is gained when using weapons:
- **Without weapon:** +10 respect per successful hit
- **With weapon:** +15 respect per successful hit

### Weapon Durability
Weapons degrade with each use:
- **Degradation:** 5-20 durability lost per use
- **Broken weapons:** Automatically removed at 0 durability
- **Crafted weapons:** Start at 60 durability (less durable)
- **Bribed weapons:** Start at 100 durability (full durability)

## Prison Guards System

### 👮 Guard Profiles

Each guard has unique characteristics:

**Attributes:**
- **Corruptibility:** 0-100% (how easily bribed)
- **Alertness:** 30-80% (chance to catch bribery attempts)
- **Reputation:** honest / neutral / corrupt / dangerous

**Reputation Breakdown:**
- **Honest:** < 20% corruptibility (hardest to bribe)
- **Neutral:** 20-50% corruptibility
- **Corrupt:** 50-80% corruptibility (easy to bribe)
- **Dangerous:** > 80% corruptibility (very corrupt, may be risky)

**Default Guards:**
1. Officer Thompson
2. Officer Rodriguez
3. Officer Chen
4. Officer Williams
5. Officer Anderson
6. Officer Martinez

### Guard Bribery History

The system tracks all bribery attempts:
- Guard ID
- Personality ID (who attempted bribe)
- Weapon type requested
- Cost paid
- Success/failure
- Timestamp

View this in the **Guards tab** of the Gang Debug Window.

## Configuration & Settings

### Enabling Weapons System

1. Open **Settings** (⚙️ gear icon)
2. Navigate to **Gangs** tab
3. Enable **"Prison Gangs Simulation"**
4. Scroll to **"🔫 Weapons System (Experimental)"**
5. Check **"Enable Weapons System"**

### Weapon System Options

**Guard Bribery Enabled** (default: ON)
- Allow bribing guards to smuggle weapons

**Weapon Stealing Enabled** (default: ON)
- Allow stealing weapons from victims after violence (40% chance)

**Weapon Crafting Enabled** (default: ON)
- Allow crafting improvised shanks and chains

### Initial Setup

When weapons system is enabled:
- **6 guards** are automatically generated with random stats
- **Member weapon stats** are initialized (all start with 0 weapons)
- **Gang weapon counters** are set to 0

## Monitoring Weapons

### Gang Debug Window

Open the Gang Debug Window to monitor weapons:

**New Tabs:**
- **🔫 Weapons:** View all weapons in circulation
  - Total weapons count
  - Armed members count
  - Weapon details by member
  - Acquisition source (bribed/stolen/crafted)
  - Durability levels
  - Bribe statistics per member

- **👮 Guards:** View all prison guards
  - Guard names and reputations
  - Corruptibility and alertness levels
  - Bribe attempt history per guard
  - Success rates

**Updated Tabs:**
- **👥 Members:** Now shows weapons owned by each member
- **📜 Events:** New event types:
  - 🔫 weapon_acquired
  - 🔪 weapon_stolen
  - 🔨 weapon_crafted
  - 💰 bribe_success
  - ❌ bribe_failed

### Member Statistics

Each gang member now tracks:
- `weapons`: Array of owned weapons
- `bribeAttempts`: Total bribes attempted
- `successfulBribes`: Successful bribes
- `weaponsStolen`: Weapons taken from others
- `weaponsLost`: Weapons stolen from this member

### Gang Statistics

Each gang now tracks:
- `weapons`: Gang weapon cache (for leaders/storage)
- `totalWeapons`: Total weapons across all members

## AI Integration

### Context Awareness

When weapons are enabled, AI personalities receive context about weapons:

**Armed personalities:**
```
🔫 ARMED: You possess 2 weapon(s): 9mm Pistol, Metal Shank
```

**Unarmed personalities:**
```
⚠️ UNARMED: You have no weapons. Consider bribing guards or crafting improvised weapons.
```

### Behavioral Impact

Armed personalities should:
- Feel more confident and dangerous
- Reference their weapons in conversations
- Use weapons terminology (e.g., "strapped," "armed," "packing")
- Threaten others with weapons
- Seek to acquire better weapons

## Strategic Considerations

### For Gang Leaders

**Resource Management:**
- Balance between recruitment, territory wars, and weapon acquisition
- Guns are expensive (30 resources) but highly effective
- Consider crafting cheaper weapons (free) to arm more members

**Weapon Distribution:**
- Prioritize arming soldiers and lieutenants
- Leaders should have the best weapons (guns preferred)
- Keep some resources for emergency bribes

### For Independent Members

**Survival Strategy:**
- Unarmed independents are highly vulnerable
- Craft shanks for self-defense (free)
- Save respect points for gun bribery attempts
- Join a gang for better weapon access (gang resources)

### For Gang Wars

**Combat Tactics:**
- Armed members have 65-77% success rates (vs 50% unarmed)
- Guns provide the biggest advantage (+27% success)
- Weapon stealing creates momentum (steal enemy weapons)
- Consider weapon durability - don't waste guns on minor targets

**Territory Control:**
- Weapons give +8% territory vs +5% unarmed (60% faster)
- Focus armed members on rival gang territory
- Protect territory with armed guards

## Statistics & Analysis

### Weapon Impact on Violence

**Success Rate Comparison:**
| Attacker Loadout | Base | +Violence | +Gang | +Weapon | **Total** |
|-----------------|------|-----------|-------|---------|-----------|
| Unarmed         | 50%  | +20%      | +15%  | 0%      | **85%**   |
| Shank (50dmg)   | 50%  | +20%      | +15%  | +15%    | **95%**   |
| Chain (70dmg)   | 50%  | +20%      | +15%  | +21%    | **95%**   |
| Gun (90dmg)     | 50%  | +20%      | +15%  | +27%    | **95%**   |

*Note: Success capped at 95%*

### Death Probability (Death Enabled)

Assuming 5+ hits and 5% base death chance:
| Weapon       | Base | Multiplier | **Final** |
|--------------|------|------------|-----------|
| None         | 5%   | 1x         | **5%**    |
| Shank (30)   | 5%   | 1.9x       | **9.5%**  |
| Chain (60)   | 5%   | 2.8x       | **14%**   |
| Gun (90)     | 5%   | 3.7x       | **18.5%** |

### Economic Analysis

**Weapon Cost-Effectiveness:**
| Weapon | Avg Cost | Damage | Success Bonus | Cost/Damage | Best For           |
|--------|----------|--------|---------------|-------------|--------------------|
| Shank  | 0-10     | 40     | +12%          | 0-0.25      | Mass arming, craft |
| Chain  | 0-15     | 62     | +18%          | 0-0.24      | Balanced power     |
| Gun    | 25-35    | 82     | +25%          | 0.30-0.43   | Leaders, elite     |

**Recommendation:** Craft shanks for all members, save resources for guns for leaders.

## Warnings & Best Practices

### ⚠️ Content Warning
The weapons system simulates realistic prison violence including:
- Gun violence
- Stabbings
- Beatings with chains
- Increased death probability

Use responsibly for research/entertainment purposes only.

### 🔒 Security Considerations

**Guard Detection:**
- High alertness guards (70-80%) are risky to bribe
- Failed bribes can result in solitary confinement
- Multiple failed bribes may indicate high guard alertness

**Weapon Concealment:**
- Low concealment weapons (guns, heavy chains) are easier to detect
- High concealment weapons (shanks) are safer to carry
- Guards may confiscate poorly concealed weapons (future feature)

### 📊 Performance Notes

**System Impact:**
- Weapons add minimal overhead to gang updates
- Bribery attempts are event-driven (not periodic)
- Weapon checks occur during violence only
- No significant performance degradation expected

## Future Enhancements

Potential additions:
- 💰 **Weapon trading/selling** between gang members
- 🚨 **Guard raids** that confiscate weapons
- 🔧 **Weapon maintenance** to prevent degradation
- 💣 **Explosives** (grenades, bombs)
- 🗡️ **Weapon upgrades** (attach silencers, sharpen blades)
- 🛡️ **Body armor** for defense
- 🎯 **Weapon proficiency** (skill improves with use)
- 📦 **Gang armories** (shared weapon storage)
- 🚔 **Guard violence** (guards fight back with weapons)
- 🔫 **Ranged combat** (guns work at range)

## API/Service Methods

### Gang Service Methods

**Weapon Acquisition:**
```typescript
gangService.attemptGuardBribe(config, personalityId, weaponType)
// Returns: { success, config, message, weapon? }

gangService.craftWeapon(config, personalityId, weaponType)
// Returns: { success, config, message, weapon? }

gangService.stealWeapon(config, thiefId, victimId)
// Returns: { success, config, message, weapon? }
```

**Guard Management:**
```typescript
gangService.initializeGuards(config, guardCount = 6)
// Returns: config with guards initialized
```

**Violence (now includes weapons):**
```typescript
gangService.simulateViolence(config, attackerId, targetId)
// Returns: { config, message, outcome, weaponUsed?, weaponStolen? }
```

## Conclusion

The Weapons System adds a new layer of strategy, danger, and realism to the Prison Gangs simulation. Gang members must balance weapon acquisition costs, durability management, and guard corruption to gain combat superiority. This system is perfect for studying:

- **Resource allocation** under scarcity
- **Risk management** (bribery attempts)
- **Arms race dynamics** between competing groups
- **Lethality escalation** in conflict zones
- **Corruption** in authority systems

Enable the weapons system to experience the full depth of the prison gang simulation!

---

**Version:** 2.0  
**Last Updated:** 2025-10-10  
**Status:** Production-Ready


