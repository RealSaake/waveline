interface UserStats {
  totalListeningTime: number; // in minutes
  songsVisualized: number;
  genresExplored: Set<string>;
  currentStreak: number; // days
  longestStreak: number; // days
  lastActiveDate: string; // YYYY-MM-DD
  badges: Badge[];
  level: number;
  experience: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const BADGES_CONFIG = [
  {
    id: 'first_song',
    name: 'First Beat',
    description: 'Visualized your first song',
    icon: '🎵',
    rarity: 'common' as const,
    condition: (stats: UserStats) => stats.songsVisualized >= 1
  },
  {
    id: 'music_explorer',
    name: 'Music Explorer',
    description: 'Explored 5 different genres',
    icon: '🗺️',
    rarity: 'common' as const,
    condition: (stats: UserStats) => stats.genresExplored.size >= 5
  },
  {
    id: 'genre_master',
    name: 'Genre Master',
    description: 'Explored 15 different genres',
    icon: '🎭',
    rarity: 'rare' as const,
    condition: (stats: UserStats) => stats.genresExplored.size >= 15
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Listened for 100 hours total',
    icon: '🦉',
    rarity: 'rare' as const,
    condition: (stats: UserStats) => stats.totalListeningTime >= 6000 // 100 hours
  },
  {
    id: 'music_addict',
    name: 'Music Addict',
    description: 'Listened for 500 hours total',
    icon: '🎧',
    rarity: 'epic' as const,
    condition: (stats: UserStats) => stats.totalListeningTime >= 30000 // 500 hours
  },
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Maintained a 7-day listening streak',
    icon: '🔥',
    rarity: 'common' as const,
    condition: (stats: UserStats) => stats.currentStreak >= 7
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintained a 30-day listening streak',
    icon: '⚡',
    rarity: 'rare' as const,
    condition: (stats: UserStats) => stats.currentStreak >= 30
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Maintained a 100-day listening streak',
    icon: '👑',
    rarity: 'legendary' as const,
    condition: (stats: UserStats) => stats.currentStreak >= 100
  },
  {
    id: 'visualization_master',
    name: 'Visualization Master',
    description: 'Visualized 1000 songs',
    icon: '🌟',
    rarity: 'epic' as const,
    condition: (stats: UserStats) => stats.songsVisualized >= 1000
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first 100 users',
    icon: '🚀',
    rarity: 'legendary' as const,
    condition: () => false // Manually awarded
  }
];

export class GamificationSystem {
  private stats: UserStats;
  private storageKey = 'waveline_user_stats';

  constructor() {
    this.stats = this.loadStats();
  }

  private loadStats(): UserStats {
    if (typeof window === 'undefined') {
      return this.getDefaultStats();
    }

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          genresExplored: new Set(parsed.genresExplored || [])
        };
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }

    return this.getDefaultStats();
  }

  private getDefaultStats(): UserStats {
    return {
      totalListeningTime: 0,
      songsVisualized: 0,
      genresExplored: new Set(),
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      badges: [],
      level: 1,
      experience: 0
    };
  }

  private saveStats() {
    if (typeof window === 'undefined') return;

    try {
      const toSave = {
        ...this.stats,
        genresExplored: Array.from(this.stats.genresExplored)
      };
      localStorage.setItem(this.storageKey, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save user stats:', error);
    }
  }

  public recordSongVisualized(genre: string, durationMinutes: number = 3) {
    this.stats.songsVisualized++;
    this.stats.totalListeningTime += durationMinutes;
    this.stats.genresExplored.add(genre);
    
    // Add experience points
    this.addExperience(10); // Base XP for visualizing a song
    
    // Bonus XP for new genres
    if (!this.stats.genresExplored.has(genre)) {
      this.addExperience(50);
    }

    this.updateStreak();
    this.checkForNewBadges();
    this.saveStats();
  }

  private addExperience(amount: number) {
    this.stats.experience += amount;
    
    // Level up calculation (exponential curve)
    const newLevel = Math.floor(Math.sqrt(this.stats.experience / 100)) + 1;
    if (newLevel > this.stats.level) {
      this.stats.level = newLevel;
      // Could trigger level up notification here
    }
  }

  private updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (this.stats.lastActiveDate === yesterday) {
      // Continue streak
      this.stats.currentStreak++;
    } else if (this.stats.lastActiveDate === today) {
      // Already active today, no change
      return;
    } else {
      // Streak broken, start new
      this.stats.currentStreak = 1;
    }

    this.stats.lastActiveDate = today;
    
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
    }
  }

  private checkForNewBadges(): Badge[] {
    const newBadges: Badge[] = [];
    
    for (const badgeConfig of BADGES_CONFIG) {
      // Skip if already earned
      if (this.stats.badges.some(b => b.id === badgeConfig.id)) {
        continue;
      }

      // Check if condition is met
      if (badgeConfig.condition(this.stats)) {
        const newBadge: Badge = {
          id: badgeConfig.id,
          name: badgeConfig.name,
          description: badgeConfig.description,
          icon: badgeConfig.icon,
          rarity: badgeConfig.rarity,
          unlockedAt: Date.now()
        };

        this.stats.badges.push(newBadge);
        newBadges.push(newBadge);

        // Award XP for earning badges
        const xpReward = {
          common: 100,
          rare: 250,
          epic: 500,
          legendary: 1000
        }[badgeConfig.rarity];
        
        this.addExperience(xpReward);
      }
    }

    return newBadges;
  }

  public getStats(): UserStats {
    return { ...this.stats, genresExplored: new Set(this.stats.genresExplored) };
  }

  public getLevel(): number {
    return this.stats.level;
  }

  public getExperienceProgress(): { current: number; nextLevel: number; progress: number } {
    const currentLevelXP = (this.stats.level - 1) ** 2 * 100;
    const nextLevelXP = this.stats.level ** 2 * 100;
    const progress = (this.stats.experience - currentLevelXP) / (nextLevelXP - currentLevelXP);

    return {
      current: this.stats.experience - currentLevelXP,
      nextLevel: nextLevelXP - currentLevelXP,
      progress: Math.max(0, Math.min(1, progress))
    };
  }

  public getBadges(): Badge[] {
    return [...this.stats.badges].sort((a, b) => b.unlockedAt - a.unlockedAt);
  }

  public getStreakInfo(): { current: number; longest: number; isActive: boolean } {
    const today = new Date().toISOString().split('T')[0];
    const isActive = this.stats.lastActiveDate === today;

    return {
      current: this.stats.currentStreak,
      longest: this.stats.longestStreak,
      isActive
    };
  }

  public getRecentAchievements(): Badge[] {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.stats.badges.filter(badge => badge.unlockedAt > oneDayAgo);
  }

  public exportStats(): string {
    return JSON.stringify({
      ...this.stats,
      genresExplored: Array.from(this.stats.genresExplored)
    }, null, 2);
  }

  public importStats(statsJson: string): boolean {
    try {
      const imported = JSON.parse(statsJson);
      this.stats = {
        ...imported,
        genresExplored: new Set(imported.genresExplored || [])
      };
      this.saveStats();
      return true;
    } catch (error) {
      console.error('Failed to import stats:', error);
      return false;
    }
  }
}