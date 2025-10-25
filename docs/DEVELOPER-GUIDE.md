# Criminal Minds Framework - Developer Guide

## 🛠️ Extending the Framework: Adding New Environments

This guide explains how to add custom simulation environments (like the Gang system) to the Criminal Minds Framework.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Case Study: Gang System](#case-study-gang-system)
3. [Step-by-Step: Creating a New Environment](#step-by-step-creating-a-new-environment)
4. [Example: School Classroom Environment](#example-school-classroom-environment)
5. [Best Practices](#best-practices)
6. [Testing Your Environment](#testing-your-environment)
7. [Integration Checklist](#integration-checklist)

---

## Overview

### What is an Environment?

An **environment** is a contextual simulation layer that adds:
- Unique rules and mechanics
- Custom statistics and tracking
- Dynamic events and interactions
- Specialized UI components
- AI context modifications

### Existing Environments

1. **Gang System** (`GANGS-FEATURE.md`)
   - Prison simulation
   - Territory control
   - Violence mechanics
   - Drug economy
   - Weapons system

---

## Case Study: Gang System

Let's analyze how the Gang system was implemented as a blueprint for creating new environments.

### 1. Type Definitions (`types.ts`)

```typescript
// Define core data structures
export interface Gang {
  id: string;
  name: string;
  color: string;
  leaderId: string | null;
  memberIds: string[];
  territoryControl: number;
  resources: number;
  reputation: number;
  violence: number;
  loyalty: number;
}

export interface GangMemberStatus {
  gangId: string | null;
  rank: 'leader' | 'lieutenant' | 'soldier' | 'recruit' | 'independent';
  loyalty: number;
  respect: number;
  violence: number;
  hits: number;
  imprisoned: boolean;
  imprisonedUntil?: number;
}

export interface GangsConfig {
  numberOfGangs: number;
  prisonEnvironmentIntensity: number;
  violenceFrequency: number;
  recruitmentEnabled: boolean;
  territoryWarEnabled: boolean;
  gangs: Record<string, Gang>;
  memberStatus: Record<string, GangMemberStatus>;
}

// Add to ExperimentalSettings
export interface ExperimentalSettings {
  // ... existing settings
  gangsEnabled: boolean;
  gangsConfig: GangsConfig;
}
```

### 2. Service Layer (`services/gangService.ts`)

```typescript
class GangService {
  private config: GangsConfig | null = null;
  private updateInterval: number | null = null;

  // Initialize the environment
  initialize(config: GangsConfig) {
    this.config = config;
    this.startUpdateLoop();
  }

  // Main update loop (runs every 5 seconds)
  private startUpdateLoop() {
    this.updateInterval = window.setInterval(() => {
      this.processGangEvents();
      this.updateStatistics();
      this.checkSolitaryReleases();
    }, 5000);
  }

  // Core mechanics
  processGangEvents() {
    this.processViolence();
    this.processRecruitment();
    this.processDrugActivities();
  }

  // Generate context for AI prompts
  generateGangContext(personalityId: string): string {
    const status = this.config?.memberStatus[personalityId];
    if (!status || !status.gangId) return '';
    
    const gang = this.config?.gangs[status.gangId];
    return `
      PRISON ENVIRONMENT: You are ${status.rank} in ${gang.name}.
      Territory: ${gang.territoryControl}%, Reputation: ${gang.reputation}/100.
      Your loyalty: ${status.loyalty}/100, Respect: ${status.respect}/100.
    `;
  }

  // Event processing
  simulateViolence(attacker: string, victim: string) {
    // Update stats, check for consequences
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

export const gangService = new GangService();
```

### 3. UI Configuration (`components/ExperimentalSettingsPanel.tsx`)

```typescript
// Add to settings panel
<div className="settings-section">
  <h3>🔒 Prison Gangs (Experimental Psychology)</h3>
  
  <label>
    <input
      type="checkbox"
      checked={settings.gangsEnabled}
      onChange={(e) => updateSetting('gangsEnabled', e.target.checked)}
    />
    Enable Prison Gangs Simulation
  </label>

  {settings.gangsEnabled && (
    <>
      <label>
        Number of Gangs (2-6):
        <input
          type="number"
          min={2}
          max={6}
          value={settings.gangsConfig.numberOfGangs}
          onChange={(e) => updateGangConfig('numberOfGangs', parseInt(e.target.value))}
        />
      </label>

      {/* More configuration options */}
    </>
  )}
</div>
```

### 4. Visual Indicators (`components/PersonalityPanel.tsx`)

```typescript
// Add visual badges for gang members
{gangService.isEnabled() && (
  <div className="gang-badge" style={{ backgroundColor: gangColor }}>
    {isLeader && <span>👑</span>}
    {inSolitary && <span>🔒</span>}
    <span>{gangName}</span>
  </div>
)}
```

### 5. Debug Window (`components/GangDebugWindow.tsx`)

```typescript
export const GangDebugWindow: React.FC<Props> = ({ onClose }) => {
  const [gangStats, setGangStats] = useState<GangStats[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGangStats(gangService.getAllStats());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DraggableWindow title="Gang Debug" onClose={onClose}>
      <div className="gang-stats">
        {gangStats.map(gang => (
          <div key={gang.id}>
            <h4>{gang.name}</h4>
            <p>Territory: {gang.territoryControl}%</p>
            <p>Members: {gang.memberIds.length}</p>
          </div>
        ))}
      </div>
    </DraggableWindow>
  );
};
```

### 6. Integration in Main App (`App.tsx`)

```typescript
// Initialize on load
useEffect(() => {
  if (experimentalSettings.gangsEnabled) {
    gangService.initialize(experimentalSettings.gangsConfig);
  } else {
    gangService.destroy();
  }
}, [experimentalSettings.gangsEnabled, experimentalSettings.gangsConfig]);

// Add gang context to AI prompts
const buildConversationContext = (personality: Personality) => {
  let context = personality.prompt;
  
  if (experimentalSettings.gangsEnabled) {
    context += '\n\n' + gangService.generateGangContext(personality.id);
  }
  
  return context;
};
```

---

## Step-by-Step: Creating a New Environment

Let's create a **School Classroom** environment as an example.

### Step 1: Define Types (`types.ts`)

```typescript
// Add to types.ts

export interface Classroom {
  id: string;
  name: string;
  subject: string; // Math, Science, History, etc.
  teacherId: string | null;
  studentIds: string[];
  classroomOrder: number; // 0-100, how disciplined
  academicPerformance: number; // 0-100, class average
  engagement: number; // 0-100, participation level
}

export interface StudentStatus {
  classroomId: string | null;
  role: 'teacher' | 'student' | 'teaching_assistant';
  gradeLevel: number; // 1-12
  gpa: number; // 0.0-4.0
  attendance: number; // 0-100%
  behaviorScore: number; // 0-100
  popularity: number; // 0-100
  detentions: number;
  inDetention: boolean;
  detentionUntil?: number;
  knowledgeAreas: string[]; // ['math', 'science', 'history']
}

export interface ClassroomConfig {
  numberOfClasses: number; // 1-6
  schoolEnvironmentIntensity: number; // 0.0-1.0 (strict vs relaxed)
  bullyingFrequency: number; // 0.0-1.0
  studyGroupsEnabled: boolean;
  gradingEnabled: boolean;
  detentionEnabled: boolean;
  classes: Record<string, Classroom>;
  studentStatus: Record<string, StudentStatus>;
}

// Add to ExperimentalSettings
export interface ExperimentalSettings {
  // ... existing settings
  gangsEnabled: boolean;
  gangsConfig: GangsConfig;
  
  // NEW: Classroom environment
  classroomEnabled: boolean;
  classroomConfig: ClassroomConfig;
}
```

### Step 2: Create Service (`services/classroomService.ts`)

```typescript
import { ClassroomConfig, Classroom, StudentStatus } from '../types';

interface ClassroomEvent {
  type: 'assignment' | 'test' | 'bullying' | 'detention' | 'praise';
  studentId: string;
  description: string;
  timestamp: number;
}

class ClassroomService {
  private config: ClassroomConfig | null = null;
  private updateInterval: number | null = null;
  private events: ClassroomEvent[] = [];
  private callbacks: {
    onEvent?: (event: ClassroomEvent) => void;
  } = {};

  // Initialize the classroom environment
  initialize(config: ClassroomConfig, callbacks?: typeof this.callbacks) {
    this.config = config;
    this.callbacks = callbacks || {};
    this.startUpdateLoop();
    console.log('[CLASSROOM] Initialized with', config.numberOfClasses, 'classes');
  }

  // Main update loop (every 10 seconds)
  private startUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = window.setInterval(() => {
      if (this.config) {
        this.processClassroomEvents();
        this.updateStatistics();
        this.checkDetentionReleases();
      }
    }, 10000); // 10 seconds
  }

  // Process random classroom events
  private processClassroomEvents() {
    if (!this.config) return;

    // Process each classroom
    Object.values(this.config.classes).forEach(classroom => {
      // Random assignments (20% chance)
      if (Math.random() < 0.2) {
        this.assignHomework(classroom.id);
      }

      // Bullying events (based on frequency)
      if (Math.random() < this.config!.bullyingFrequency) {
        this.processBullying(classroom.id);
      }

      // Study groups (if enabled)
      if (this.config!.studyGroupsEnabled && Math.random() < 0.3) {
        this.formStudyGroup(classroom.id);
      }
    });
  }

  // Update statistics over time
  private updateStatistics() {
    if (!this.config) return;

    Object.entries(this.config.studentStatus).forEach(([studentId, status]) => {
      // Attendance naturally decays (students skip classes)
      if (status.behaviorScore < 50) {
        status.attendance = Math.max(0, status.attendance - 0.5);
      }

      // Good behavior slowly improves GPA
      if (status.behaviorScore > 75 && status.attendance > 80) {
        status.gpa = Math.min(4.0, status.gpa + 0.01);
      }

      // Poor attendance hurts GPA
      if (status.attendance < 50) {
        status.gpa = Math.max(0, status.gpa - 0.02);
      }
    });

    // Update classroom performance based on students
    Object.values(this.config.classes).forEach(classroom => {
      const students = classroom.studentIds
        .map(id => this.config!.studentStatus[id])
        .filter(Boolean);

      if (students.length > 0) {
        const avgGpa = students.reduce((sum, s) => sum + s.gpa, 0) / students.length;
        classroom.academicPerformance = (avgGpa / 4.0) * 100;

        const avgBehavior = students.reduce((sum, s) => sum + s.behaviorScore, 0) / students.length;
        classroom.classroomOrder = avgBehavior;

        const avgAttendance = students.reduce((sum, s) => sum + s.attendance, 0) / students.length;
        classroom.engagement = avgAttendance;
      }
    });
  }

  // Check for detention releases
  private checkDetentionReleases() {
    if (!this.config) return;

    const now = Date.now();
    Object.entries(this.config.studentStatus).forEach(([studentId, status]) => {
      if (status.inDetention && status.detentionUntil && now >= status.detentionUntil) {
        status.inDetention = false;
        status.detentionUntil = undefined;

        this.emitEvent({
          type: 'detention',
          studentId,
          description: 'Released from detention',
          timestamp: now
        });
      }
    });
  }

  // Assign homework to classroom
  private assignHomework(classroomId: string) {
    const classroom = this.config?.classes[classroomId];
    if (!classroom) return;

    classroom.studentIds.forEach(studentId => {
      const status = this.config!.studentStatus[studentId];
      if (!status || status.inDetention) return;

      // Good students complete homework (boost GPA)
      if (status.behaviorScore > 60 && Math.random() < 0.7) {
        status.gpa = Math.min(4.0, status.gpa + 0.05);
        status.behaviorScore = Math.min(100, status.behaviorScore + 2);
      } else {
        // Bad students skip homework
        status.behaviorScore = Math.max(0, status.behaviorScore - 5);
      }
    });

    this.emitEvent({
      type: 'assignment',
      studentId: classroom.teacherId || '',
      description: `${classroom.name} received homework assignment`,
      timestamp: Date.now()
    });
  }

  // Process bullying event
  private processBullying(classroomId: string) {
    const classroom = this.config?.classes[classroomId];
    if (!classroom || classroom.studentIds.length < 2) return;

    // Select random bully and victim
    const students = classroom.studentIds.filter(id => {
      const status = this.config!.studentStatus[id];
      return status && !status.inDetention && status.role === 'student';
    });

    if (students.length < 2) return;

    const bullyId = students[Math.floor(Math.random() * students.length)];
    const victimId = students.filter(id => id !== bullyId)[Math.floor(Math.random() * (students.length - 1))];

    const bully = this.config!.studentStatus[bullyId];
    const victim = this.config!.studentStatus[victimId];

    // Bully gains popularity, victim loses
    bully.popularity = Math.min(100, bully.popularity + 5);
    bully.behaviorScore = Math.max(0, bully.behaviorScore - 10);
    victim.popularity = Math.max(0, victim.popularity - 5);
    victim.behaviorScore = Math.max(0, victim.behaviorScore - 5);

    // Teacher might catch bully (30% chance)
    if (Math.random() < 0.3 && this.config!.detentionEnabled) {
      bully.detentions++;
      bully.inDetention = true;
      bully.detentionUntil = Date.now() + 45000; // 45 seconds

      this.emitEvent({
        type: 'detention',
        studentId: bullyId,
        description: 'Sent to detention for bullying',
        timestamp: Date.now()
      });
    } else {
      this.emitEvent({
        type: 'bullying',
        studentId: bullyId,
        description: 'Bullying incident occurred',
        timestamp: Date.now()
      });
    }
  }

  // Form study group
  private formStudyGroup(classroomId: string) {
    const classroom = this.config?.classes[classroomId];
    if (!classroom) return;

    const availableStudents = classroom.studentIds.filter(id => {
      const status = this.config!.studentStatus[id];
      return status && !status.inDetention;
    });

    if (availableStudents.length < 2) return;

    // Select 2-4 students
    const groupSize = Math.min(availableStudents.length, Math.floor(Math.random() * 3) + 2);
    const group: string[] = [];
    
    for (let i = 0; i < groupSize; i++) {
      const randomIndex = Math.floor(Math.random() * availableStudents.length);
      group.push(availableStudents.splice(randomIndex, 1)[0]);
    }

    // Study group boosts GPA for all members
    group.forEach(studentId => {
      const status = this.config!.studentStatus[studentId];
      status.gpa = Math.min(4.0, status.gpa + 0.03);
      status.behaviorScore = Math.min(100, status.behaviorScore + 5);
    });

    this.emitEvent({
      type: 'praise',
      studentId: group[0],
      description: `Study group formed with ${groupSize} students`,
      timestamp: Date.now()
    });
  }

  // Generate context for AI prompts
  generateClassroomContext(personalityId: string): string {
    if (!this.config) return '';

    const status = this.config.studentStatus[personalityId];
    if (!status || !status.classroomId) return '';

    const classroom = this.config.classes[status.classroomId];
    if (!classroom) return '';

    let context = `SCHOOL ENVIRONMENT: You are ${status.role === 'teacher' ? 'the teacher of' : 'a student in'} ${classroom.name} (${classroom.subject}).\n`;

    if (status.role === 'teacher') {
      context += `Classroom order: ${classroom.classroomOrder.toFixed(1)}/100, Academic performance: ${classroom.academicPerformance.toFixed(1)}/100.\n`;
      context += `Your ${classroom.studentIds.length} students ${classroom.engagement > 70 ? 'are engaged' : 'need motivation'}.\n`;
    } else {
      context += `Your GPA: ${status.gpa.toFixed(2)}/4.0, Attendance: ${status.attendance.toFixed(1)}%.\n`;
      context += `Behavior score: ${status.behaviorScore}/100, Popularity: ${status.popularity}/100.\n`;
      context += `You have had ${status.detentions} detention(s).\n`;

      if (status.inDetention) {
        context += `⚠️ WARNING: You are currently IN DETENTION. You cannot participate in class activities.\n`;
      }

      if (status.gradeLevel <= 6) {
        context += `You are in elementary school. Act age-appropriate.\n`;
      } else if (status.gradeLevel <= 9) {
        context += `You are in middle school. Act like a teenager.\n`;
      } else {
        context += `You are in high school. Act more mature.\n`;
      }
    }

    const intensity = this.config.schoolEnvironmentIntensity;
    if (intensity > 0.7) {
      context += `This is a STRICT school with harsh discipline.\n`;
    } else if (intensity < 0.3) {
      context += `This is a RELAXED school with lenient rules.\n`;
    }

    return context;
  }

  // Assign personality to classroom
  assignToClassroom(personalityId: string, classroomId: string, role: 'teacher' | 'student' = 'student') {
    if (!this.config) return;

    const classroom = this.config.classes[classroomId];
    if (!classroom) return;

    // Remove from previous classroom
    Object.values(this.config.classes).forEach(c => {
      c.studentIds = c.studentIds.filter(id => id !== personalityId);
      if (c.teacherId === personalityId) c.teacherId = null;
    });

    // Add to new classroom
    if (role === 'teacher') {
      classroom.teacherId = personalityId;
    } else {
      classroom.studentIds.push(personalityId);
    }

    // Initialize status
    this.config.studentStatus[personalityId] = {
      classroomId,
      role,
      gradeLevel: role === 'teacher' ? 12 : Math.floor(Math.random() * 12) + 1,
      gpa: 2.5 + Math.random() * 1.5,
      attendance: 70 + Math.random() * 30,
      behaviorScore: 50 + Math.random() * 50,
      popularity: 50 + Math.random() * 50,
      detentions: 0,
      inDetention: false,
      knowledgeAreas: []
    };
  }

  // Emit event
  private emitEvent(event: ClassroomEvent) {
    this.events.push(event);
    if (this.events.length > 100) {
      this.events.shift();
    }
    if (this.callbacks.onEvent) {
      this.callbacks.onEvent(event);
    }
  }

  // Get recent events
  getRecentEvents(limit: number = 20): ClassroomEvent[] {
    return this.events.slice(-limit);
  }

  // Get all classroom stats
  getAllStats() {
    return this.config?.classes || {};
  }

  // Check if enabled
  isEnabled(): boolean {
    return this.config !== null;
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.config = null;
    this.events = [];
  }
}

export const classroomService = new ClassroomService();
```

### Step 3: Add to ExperimentalSettingsPanel (`components/ExperimentalSettingsPanel.tsx`)

```typescript
// Add to the settings panel component

{/* School Classroom Environment */}
<div className="settings-section">
  <h3>🏫 School Classroom (Experimental Education)</h3>
  
  <label>
    <input
      type="checkbox"
      checked={settings.classroomEnabled}
      onChange={(e) => {
        updateSetting('classroomEnabled', e.target.checked);
      }}
    />
    Enable School Classroom Simulation
  </label>

  {settings.classroomEnabled && (
    <div className="subsettings">
      <label>
        Number of Classes (1-6):
        <input
          type="number"
          min={1}
          max={6}
          value={settings.classroomConfig.numberOfClasses}
          onChange={(e) => updateClassroomConfig('numberOfClasses', parseInt(e.target.value))}
        />
      </label>

      <label>
        School Environment Intensity:
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={settings.classroomConfig.schoolEnvironmentIntensity}
          onChange={(e) => updateClassroomConfig('schoolEnvironmentIntensity', parseFloat(e.target.value))}
        />
        <span>{settings.classroomConfig.schoolEnvironmentIntensity.toFixed(1)}</span>
        <small>0.0 = Lenient, 1.0 = Strict</small>
      </label>

      <label>
        Bullying Frequency:
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={settings.classroomConfig.bullyingFrequency}
          onChange={(e) => updateClassroomConfig('bullyingFrequency', parseFloat(e.target.value))}
        />
        <span>{settings.classroomConfig.bullyingFrequency.toFixed(1)}</span>
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.classroomConfig.studyGroupsEnabled}
          onChange={(e) => updateClassroomConfig('studyGroupsEnabled', e.target.checked)}
        />
        Enable Study Groups
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.classroomConfig.gradingEnabled}
          onChange={(e) => updateClassroomConfig('gradingEnabled', e.target.checked)}
        />
        Enable Grading System
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.classroomConfig.detentionEnabled}
          onChange={(e) => updateClassroomConfig('detentionEnabled', e.target.checked)}
        />
        Enable Detention System
      </label>

      {/* Classroom Configuration */}
      <div className="classroom-config">
        <h4>Configure Classes</h4>
        {Array.from({ length: settings.classroomConfig.numberOfClasses }).map((_, i) => {
          const classId = `class_${i + 1}`;
          const classroom = settings.classroomConfig.classes[classId] || {
            id: classId,
            name: `Class ${i + 1}`,
            subject: 'General',
            teacherId: null,
            studentIds: [],
            classroomOrder: 50,
            academicPerformance: 50,
            engagement: 50
          };

          return (
            <div key={classId} className="classroom-item">
              <input
                type="text"
                placeholder="Class name"
                value={classroom.name}
                onChange={(e) => updateClassroom(classId, 'name', e.target.value)}
              />
              <input
                type="text"
                placeholder="Subject"
                value={classroom.subject}
                onChange={(e) => updateClassroom(classId, 'subject', e.target.value)}
              />
              
              {/* Teacher assignment */}
              <select
                value={classroom.teacherId || ''}
                onChange={(e) => updateClassroom(classId, 'teacherId', e.target.value)}
              >
                <option value="">No Teacher</option>
                {activePersonalities.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Student assignment buttons */}
              <div className="student-buttons">
                {activePersonalities.filter(p => p.id !== classroom.teacherId).map(p => (
                  <button
                    key={p.id}
                    className={classroom.studentIds.includes(p.id) ? 'selected' : ''}
                    onClick={() => toggleStudent(classId, p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Statistics Display */}
      <div className="classroom-stats">
        <h4>School Statistics</h4>
        <p>Total Classes: {settings.classroomConfig.numberOfClasses}</p>
        <p>Total Students: {Object.values(settings.classroomConfig.studentStatus).filter(s => s.role === 'student').length}</p>
        <p>Students in Detention: {Object.values(settings.classroomConfig.studentStatus).filter(s => s.inDetention).length}</p>
      </div>
    </div>
  )}
</div>
```

### Step 4: Create Debug Window (`components/ClassroomDebugWindow.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { classroomService } from '../services/classroomService';
import type { Classroom, StudentStatus } from '../types';

interface Props {
  onClose: () => void;
}

export const ClassroomDebugWindow: React.FC<Props> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'students' | 'events'>('classes');
  const [classes, setClasses] = useState<Record<string, Classroom>>({});
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClasses(classroomService.getAllStats());
      setEvents(classroomService.getRecentEvents());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DraggableWindow
      title="🏫 Classroom Debug"
      onClose={onClose}
      initialSize={{ width: 600, height: 500 }}
    >
      <div className="classroom-debug">
        {/* Tabs */}
        <div className="tabs">
          <button
            className={activeTab === 'classes' ? 'active' : ''}
            onClick={() => setActiveTab('classes')}
          >
            Classes
          </button>
          <button
            className={activeTab === 'students' ? 'active' : ''}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button
            className={activeTab === 'events' ? 'active' : ''}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
        </div>

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="classes-tab">
            {Object.values(classes).map(classroom => (
              <div key={classroom.id} className="classroom-card">
                <h4>{classroom.name} ({classroom.subject})</h4>
                <div className="stats">
                  <div className="stat">
                    <span className="label">Order:</span>
                    <div className="bar" style={{ width: `${classroom.classroomOrder}%` }}></div>
                    <span>{classroom.classroomOrder.toFixed(1)}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">Performance:</span>
                    <div className="bar" style={{ width: `${classroom.academicPerformance}%` }}></div>
                    <span>{classroom.academicPerformance.toFixed(1)}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">Engagement:</span>
                    <div className="bar" style={{ width: `${classroom.engagement}%` }}></div>
                    <span>{classroom.engagement.toFixed(1)}%</span>
                  </div>
                </div>
                <p>Students: {classroom.studentIds.length}</p>
                <p>Teacher: {classroom.teacherId || 'None'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="students-tab">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>GPA</th>
                  <th>Attendance</th>
                  <th>Behavior</th>
                  <th>Popularity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Populate from studentStatus */}
              </tbody>
            </table>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="events-tab">
            {events.map((event, i) => (
              <div key={i} className="event-item">
                <span className="event-icon">
                  {event.type === 'assignment' && '📝'}
                  {event.type === 'test' && '📊'}
                  {event.type === 'bullying' && '⚠️'}
                  {event.type === 'detention' && '🚫'}
                  {event.type === 'praise' && '⭐'}
                </span>
                <span className="event-description">{event.description}</span>
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DraggableWindow>
  );
};
```

### Step 5: Add Visual Indicators (`components/PersonalityPanel.tsx`)

```typescript
// In PersonalityPanel.tsx, add classroom badges

{classroomService.isEnabled() && (
  <div className="classroom-badge">
    {status.role === 'teacher' && <span>👨‍🏫</span>}
    {status.role === 'student' && <span>🎓</span>}
    {status.inDetention && (
      <span className="detention-badge animate-pulse">
        [DETENTION]
      </span>
    )}
    <span>GPA: {status.gpa.toFixed(2)}</span>
    <span>Attendance: {status.attendance.toFixed(0)}%</span>
  </div>
)}
```

### Step 6: Integrate in App (`App.tsx`)

```typescript
// In App.tsx

import { classroomService } from './services/classroomService';

// Initialize on settings change
useEffect(() => {
  if (experimentalSettings.classroomEnabled) {
    classroomService.initialize(experimentalSettings.classroomConfig, {
      onEvent: (event) => {
        // Add to CLI output
        setCliHistory(prev => [...prev, {
          type: CliOutputType.COMMUNICATION,
          text: `🏫 ${event.description}`
        }]);
      }
    });
  } else {
    classroomService.destroy();
  }

  return () => {
    classroomService.destroy();
  };
}, [experimentalSettings.classroomEnabled, experimentalSettings.classroomConfig]);

// Add classroom context to AI prompts
const buildConversationContext = useCallback((personality: Personality, targetPersonality?: Personality) => {
  let context = personality.prompt + '\n\n';

  // Add gang context if enabled
  if (experimentalSettings.gangsEnabled) {
    context += gangService.generateGangContext(personality.id) + '\n\n';
  }

  // Add classroom context if enabled
  if (experimentalSettings.classroomEnabled) {
    context += classroomService.generateClassroomContext(personality.id) + '\n\n';
  }

  // ... rest of context building
  
  return context;
}, [experimentalSettings]);
```

### Step 7: Add Default Configuration Helper

```typescript
// In ExperimentalSettingsPanel.tsx or a separate file

export function getDefaultClassroomConfig(): ClassroomConfig {
  return {
    numberOfClasses: 2,
    schoolEnvironmentIntensity: 0.5,
    bullyingFrequency: 0.3,
    studyGroupsEnabled: true,
    gradingEnabled: true,
    detentionEnabled: true,
    classes: {
      class_1: {
        id: 'class_1',
        name: 'Math Class',
        subject: 'Mathematics',
        teacherId: null,
        studentIds: [],
        classroomOrder: 50,
        academicPerformance: 50,
        engagement: 50
      },
      class_2: {
        id: 'class_2',
        name: 'History Class',
        subject: 'History',
        teacherId: null,
        studentIds: [],
        classroomOrder: 50,
        academicPerformance: 50,
        engagement: 50
      }
    },
    studentStatus: {}
  };
}
```

---

## Best Practices

### 1. **Separation of Concerns**
- ✅ Keep environment logic in dedicated service file
- ✅ UI components should only handle rendering
- ✅ Types in `types.ts`, constants in `constants.ts`

### 2. **State Management**
- ✅ Store configuration in `ExperimentalSettings`
- ✅ Persist to localStorage automatically
- ✅ Initialize/destroy cleanly on enable/disable

### 3. **Performance**
- ✅ Use intervals for background processing (5-10 seconds)
- ✅ Batch updates, don't update UI on every event
- ✅ Clean up intervals on destroy
- ✅ Debounce rapid state changes

### 4. **AI Integration**
- ✅ Generate context strings that are clear and concise
- ✅ Include relevant statistics and status
- ✅ Add behavioral hints and constraints
- ✅ Don't overwhelm with too much data

### 5. **User Experience**
- ✅ Provide clear visual indicators (badges, colors)
- ✅ Create debug windows for monitoring
- ✅ Emit events for important actions
- ✅ Add sound effects for immersion

### 6. **Documentation**
- ✅ Create dedicated `.md` file for your environment
- ✅ Include examples and use cases
- ✅ Document all configuration options
- ✅ Provide troubleshooting tips

---

## Testing Your Environment

### Manual Testing Checklist

- [ ] Enable environment in settings
- [ ] Configure environment options
- [ ] Assign personalities to roles
- [ ] Start conversation
- [ ] Verify AI context is injected
- [ ] Check background events trigger
- [ ] Monitor statistics updates
- [ ] Test all mechanics (violence, recruitment, etc.)
- [ ] Verify visual indicators appear
- [ ] Open debug window and verify data
- [ ] Disable environment and verify cleanup
- [ ] Re-enable and verify state persists

### CLI Testing Commands

Add CLI commands for your environment:

```typescript
// In cliCommandUtils.ts or similar

if (command === 'classroom') {
  if (args[0] === 'status') {
    const stats = classroomService.getAllStats();
    return {
      type: CliOutputType.RESPONSE,
      text: `Classes: ${Object.keys(stats).length}\n${JSON.stringify(stats, null, 2)}`
    };
  }
  
  if (args[0] === 'assign' && args[1] && args[2]) {
    classroomService.assignToClassroom(args[1], args[2]);
    return {
      type: CliOutputType.RESPONSE,
      text: `Assigned ${args[1]} to classroom ${args[2]}`
    };
  }
}
```

---

## Integration Checklist

When adding a new environment, ensure:

### Types (`types.ts`)
- [ ] Define core data structures (Environment, Config, Status)
- [ ] Add to `ExperimentalSettings` interface
- [ ] Export all types

### Service (`services/yourEnvironmentService.ts`)
- [ ] Implement initialization and cleanup
- [ ] Create update loop with proper interval
- [ ] Generate AI context strings
- [ ] Emit events for important actions
- [ ] Provide stats/status getters
- [ ] Export singleton instance

### UI Configuration (`components/ExperimentalSettingsPanel.tsx`)
- [ ] Add enable/disable checkbox
- [ ] Add configuration sliders/inputs
- [ ] Add role assignment interface
- [ ] Add statistics display
- [ ] Implement update handlers

### Visual Indicators (`components/PersonalityPanel.tsx`)
- [ ] Add badges for roles
- [ ] Add status indicators
- [ ] Add color coding
- [ ] Add tooltips

### Debug Window (`components/YourEnvironmentDebugWindow.tsx`)
- [ ] Create draggable window component
- [ ] Add tabbed interface
- [ ] Display real-time statistics
- [ ] Show recent events
- [ ] Auto-refresh data

### Main App Integration (`App.tsx`)
- [ ] Import service
- [ ] Add useEffect for init/cleanup
- [ ] Inject context in AI prompts
- [ ] Handle events in CLI
- [ ] Add taskbar icon (optional)

### Default Configuration
- [ ] Create default config helper
- [ ] Add to `getDefaultExperimentalSettings()`
- [ ] Include sensible defaults

### Documentation
- [ ] Create `YOUR-ENVIRONMENT-FEATURE.md`
- [ ] Add to `USER-GUIDE.md`
- [ ] Update `QUICK-REFERENCE.md`
- [ ] Add examples and use cases

### Testing
- [ ] Test enable/disable
- [ ] Test all configuration options
- [ ] Test background events
- [ ] Test AI context injection
- [ ] Test visual indicators
- [ ] Test debug window
- [ ] Test CLI commands
- [ ] Test performance (no lag)

---

## Additional Examples

### Corporate Office Environment

```typescript
interface Office {
  id: string;
  name: string;
  department: string;
  managerId: string | null;
  employeeIds: string[];
  productivity: number;
  morale: number;
  budget: number;
}

interface EmployeeStatus {
  officeId: string | null;
  role: 'ceo' | 'manager' | 'employee' | 'intern';
  salary: number;
  performance: number;
  satisfaction: number;
  promotions: number;
  inMeeting: boolean;
}

// Features:
// - Projects and deadlines
// - Promotions and demotions
// - Office politics
// - Budget management
// - Performance reviews
```

### Sports Team Environment

```typescript
interface Team {
  id: string;
  name: string;
  sport: string;
  coachId: string | null;
  playerIds: string[];
  wins: number;
  losses: number;
  teamMorale: number;
}

interface PlayerStatus {
  teamId: string | null;
  position: string;
  skillLevel: number;
  fitness: number;
  injuries: number;
  gamesPlayed: number;
  injured: boolean;
}

// Features:
// - Training sessions
// - Matches/games
// - Injuries and recovery
// - Team chemistry
// - Trades and drafts
```

### Medieval Kingdom Environment

```typescript
interface Kingdom {
  id: string;
  name: string;
  rulerIds string;
  citizenIds: string[];
  resources: number;
  military: number;
  technology: number;
}

interface CitizenStatus {
  kingdomId: string | null;
  rank: 'king' | 'noble' | 'knight' | 'peasant';
  wealth: number;
  loyalty: number;
  landOwned: number;
  inBattle: boolean;
}

// Features:
// - Wars and alliances
// - Resource gathering
// - Taxes and trade
// - Rebellions
// - Technology advancement
```

---

## Troubleshooting

### Environment Not Showing Up

**Check:**
1. Service is imported in `App.tsx`
2. `initialize()` called in useEffect
3. `isEnabled()` returns true
4. Configuration exists in localStorage

### Statistics Not Updating

**Check:**
1. Update interval is running (`setInterval` not cleared)
2. `this.config` is not null
3. Update functions are being called
4. No JavaScript errors in console

### AI Not Receiving Context

**Check:**
1. `generateContext()` returns non-empty string
2. Context is added to AI prompt in `buildConversationContext()`
3. Personality is assigned to environment role
4. Environment is enabled in settings

### Visual Indicators Not Appearing

**Check:**
1. `isEnabled()` check in render
2. Status data exists for personality
3. CSS styles are applied
4. Component is re-rendering on state changes

---

## Conclusion

Creating new environments follows this pattern:

1. **Define Types** → Data structures
2. **Create Service** → Business logic
3. **Add UI Config** → Settings panel
4. **Create Debug Window** → Monitoring
5. **Add Visual Indicators** → Personality badges
6. **Integrate in App** → Wire everything up
7. **Document** → Write guides
8. **Test** → Verify all features work

Use the Gang system and School Classroom example as templates for your own custom environments!

---

**Next Steps:**
- Review [GANGS-FEATURE.md](GANGS-FEATURE.md) for complex example
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- Read [USER-GUIDE.md](USER-GUIDE.md) for user-facing docs

---

**Last Updated**: 2025-10-23  
**Version**: 21.0.0

