export interface RawFarm {
  nrMantles: number;
  farmingPower: number;
  name: string;
  availablePerches: number;
  auction: number;
  artefactInvestment: number;
  withdrawnAmount: number;
  mantleLevelPower: number;
  fighting: number;
  ducks: number;
  owner: string;
  farming: number;
  description: string;
}

export interface GlobalData {
  totalFarmingPower: number;
  totalDucksOnFarming: number;
  totalFarms: number;
  totalDucksOnAuction: number;
  totalPerches: number;
  totalWarDucks: number;
  totalPerchesAvailable: number;
  totalFullFarms: number;
  totalArtefactLevel: number;
  battleLockedPower: number;
  totalEmptyFarms: number;
  totalEGGinMantles: number;
  totalDucks: number;
  totalEGGClaimed: number;
  abandonedPerches: number;
  totalMantles: number;
}

export interface FarmingResponse {
  farmData: RawFarm[];
  globalData: GlobalData;
}

export type FarmStatus = 'farming' | 'idle' | 'empty';

export interface Farm extends RawFarm {
  rank: number;
  displayName: string;
  held: number;
  averagePower: number;
  share: number;
  rewardDay: number;
  rewardWeek: number;
  rewardMonth: number;
  rewardYear: number;
  claimedToken: number;
  artefactToken: number;
  averageArtefactLevel: number;
  totalFarmPerches: number;
  utilization: number;
  status: FarmStatus;
}

export interface DashboardData {
  farms: Farm[];
  global: GlobalData;
  updatedAt: string;
}

export type FilterStatus = 'all' | 'farming' | 'open' | 'idle' | 'empty';

export type SortKey =
  | 'rank'
  | 'displayName'
  | 'ducks'
  | 'farmingPower'
  | 'averagePower'
  | 'share'
  | 'rewardDay'
  | 'availablePerches'
  | 'claimedToken';

export type SortDirection = 'asc' | 'desc';

export type SpeciesId = 'ducks' | 'canines' | 'felines' | 'eagles' | 'bulls' | 'turtles';

export interface SpeciesConfig {
  id: SpeciesId;
  /** Plural display name, e.g. 'Canines'. */
  label: string;
  /** Singular display name, e.g. 'Canine'. */
  singular: string;
  /** Farming capacity unit, singular, e.g. 'docking'. */
  unitSingular: string;
  /** Farming capacity unit, plural, e.g. 'dockings'. */
  unitPlural: string;
  apiUrl: string;
  /** Reward token symbol, e.g. 'WAVES'. */
  rewardToken: string;
  /** Estimated total network reward emission per day, in whole tokens. */
  dailyEmission: number;
}
