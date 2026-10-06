import type { DashboardData, Farm, FarmingResponse, RawFarm, SpeciesConfig, SpeciesId } from './types';

export const SPECIES: SpeciesConfig[] = [
  {
    id: 'ducks',
    label: 'Ducks',
    singular: 'Duck',
    unitSingular: 'perch',
    unitPlural: 'perches',
    apiUrl: 'https://node2.duxplorer.com/farming/json',
    rewardToken: 'EGG',
    dailyEmission: 39.5,
  },
  {
    id: 'canines',
    label: 'Canines',
    singular: 'Canine',
    unitSingular: 'docking',
    unitPlural: 'dockings',
    apiUrl: 'https://node2.duxplorer.com/canifarming/json',
    rewardToken: 'WAVES',
    dailyEmission: 488.66,
  },
  {
    id: 'bulls',
    label: 'Bulls',
    singular: 'Bull',
    unitSingular: 'ranch',
    unitPlural: 'ranches',
    apiUrl: 'https://node2.duxplorer.com/bullfarming/json',
    rewardToken: 'TN',
    dailyEmission: 2808,
  },
  {
    id: 'turtles',
    label: 'Turtles',
    singular: 'Turtle',
    unitSingular: 'beach',
    unitPlural: 'beaches',
    apiUrl: 'https://node2.duxplorer.com/trtlfarming/json',
    rewardToken: 'SPICE',
    dailyEmission: 0,
  },
  {
    id: 'felines',
    label: 'Felines',
    singular: 'Feline',
    unitSingular: 'battleground',
    unitPlural: 'battlegrounds',
    apiUrl: 'https://node2.duxplorer.com/felifarming/json',
    rewardToken: 'PETE',
    dailyEmission: 0,
  },
  {
    id: 'eagles',
    label: 'Eagles',
    singular: 'Eagle',
    unitSingular: 'garage',
    unitPlural: 'garages',
    apiUrl: 'https://node2.duxplorer.com/eaglfarming/json',
    rewardToken: 'PUZZLE',
    dailyEmission: 0,
  },
];

export const DEFAULT_SPECIES: SpeciesId = 'ducks';

export const speciesById = (id: string): SpeciesConfig =>
  SPECIES.find((species) => species.id === id) ?? SPECIES[0];

// All farming feeds quote on-chain integer amounts with 8 decimals,
// verified per species against Duxplorer's displayed claimed figures.
export const TOKEN_DIVISOR = 1e8;

const toFiniteNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanFarm = (farm: RawFarm): RawFarm => ({
  nrMantles: toFiniteNumber(farm.nrMantles),
  farmingPower: toFiniteNumber(farm.farmingPower),
  name: typeof farm.name === 'string' ? farm.name.trim() : '',
  availablePerches: toFiniteNumber(farm.availablePerches),
  auction: toFiniteNumber(farm.auction),
  artefactInvestment: toFiniteNumber(farm.artefactInvestment),
  withdrawnAmount: toFiniteNumber(farm.withdrawnAmount),
  mantleLevelPower: toFiniteNumber(farm.mantleLevelPower),
  fighting: toFiniteNumber(farm.fighting),
  ducks: toFiniteNumber(farm.ducks),
  owner: typeof farm.owner === 'string' ? farm.owner : '',
  farming: toFiniteNumber(farm.farming),
  description: typeof farm.description === 'string' ? farm.description.trim() : '',
});

export const shortenAddress = (address: string, start = 6, end = 5): string => {
  if (!address) return 'Unassigned';
  if (address.length <= start + end + 1) return address;
  return `${address.slice(0, start)}…${address.slice(-end)}`;
};

export const findFarmByAddress = (farms: Farm[], address: string): Farm | null => {
  // An empty address means "no selection". Without this guard, the feed's
  // ownerless farm (owner normalized to '') would match and force the
  // drawer open on load, and closing it would immediately re-match.
  if (!address || !address.trim()) return null;
  return farms.find((farm) => farm.owner === address) ?? null;
};

export const deriveDashboardData = (
  payload: FarmingResponse,
  species: SpeciesConfig,
  updatedAt = new Date().toISOString(),
): DashboardData => {
  if (!payload || !Array.isArray(payload.farmData) || !payload.globalData) {
    throw new Error('The farming feed returned an unexpected response.');
  }

  const globalPower = toFiniteNumber(payload.globalData.totalFarmingPower);
  const ranked = payload.farmData
    .map(cleanFarm)
    .sort((a, b) => b.farmingPower - a.farmingPower || b.ducks - a.ducks);

  const farms: Farm[] = ranked.map((farm, index) => {
    const held = Math.max(0, farm.ducks - farm.farming - farm.auction - farm.fighting);
    const share = globalPower > 0 ? (farm.farmingPower / globalPower) * 100 : 0;
    const rewardDay = (share / 100) * species.dailyEmission;
    const totalFarmPerches = farm.farming + farm.availablePerches;

    return {
      ...farm,
      rank: index + 1,
      displayName: farm.name || `Farm ${shortenAddress(farm.owner)}`,
      held,
      averagePower: farm.farming > 0 ? farm.farmingPower / farm.farming : 0,
      share,
      rewardDay,
      rewardWeek: rewardDay * 7,
      rewardMonth: rewardDay * 30.4,
      rewardYear: rewardDay * 365,
      claimedToken: farm.withdrawnAmount / TOKEN_DIVISOR,
      artefactToken: farm.artefactInvestment / TOKEN_DIVISOR,
      averageArtefactLevel: farm.nrMantles > 0 ? farm.mantleLevelPower / farm.nrMantles : 0,
      totalFarmPerches,
      utilization: totalFarmPerches > 0 ? (farm.farming / totalFarmPerches) * 100 : 0,
      status: farm.ducks === 0 ? 'empty' : farm.farming > 0 ? 'farming' : 'idle',
    };
  });

  return {
    farms,
    global: payload.globalData,
    updatedAt,
  };
};

export const fetchDashboardData = async (
  species: SpeciesConfig,
  signal?: AbortSignal,
): Promise<DashboardData> => {
  const response = await fetch(species.apiUrl, {
    signal,
    cache: 'no-cache',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`The farming feed returned ${response.status}.`);
  }

  const payload = (await response.json()) as FarmingResponse;
  const updatedAt = response.headers.get('last-modified') || new Date().toISOString();
  return deriveDashboardData(payload, species, updatedAt);
};
