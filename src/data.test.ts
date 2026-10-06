import { describe, expect, it } from 'vitest';
import { SPECIES, TOKEN_DIVISOR, deriveDashboardData, findFarmByAddress, shortenAddress, speciesById } from './data';
import type { FarmingResponse } from './types';

const payload: FarmingResponse = {
  globalData: {
    totalFarmingPower: 100,
    totalDucksOnFarming: 2,
    totalFarms: 1,
    totalDucksOnAuction: 1,
    totalPerches: 4,
    totalWarDucks: 1,
    totalPerchesAvailable: 1,
    totalFullFarms: 0,
    totalArtefactLevel: 4,
    battleLockedPower: 0,
    totalEmptyFarms: 0,
    totalEGGinMantles: 2,
    totalDucks: 5,
    totalEGGClaimed: 12,
    abandonedPerches: 0,
    totalMantles: 2,
  },
  farmData: [{
    nrMantles: 2,
    farmingPower: 25,
    name: '',
    availablePerches: 1,
    auction: 1,
    artefactInvestment: 200_000_000,
    withdrawnAmount: 1_250_000_000,
    mantleLevelPower: 4,
    fighting: 1,
    ducks: 5,
    owner: '3P123456789ABCDEFGHIJKLMN',
    farming: 2,
    description: '',
  }],
};

const ducks = speciesById('ducks');

describe('deriveDashboardData', () => {
  it('normalizes feed values and derives dashboard metrics', () => {
    const farm = deriveDashboardData(payload, ducks).farms[0];
    expect(farm.rank).toBe(1);
    expect(farm.held).toBe(1);
    expect(farm.averagePower).toBe(12.5);
    expect(farm.share).toBe(25);
    expect(farm.rewardDay).toBe(ducks.dailyEmission * 0.25);
    expect(farm.rewardWeek).toBe(farm.rewardDay * 7);
    expect(farm.claimedToken).toBe(1_250_000_000 / TOKEN_DIVISOR);
    expect(farm.artefactToken).toBe(200_000_000 / TOKEN_DIVISOR);
    expect(farm.utilization).toBeCloseTo(66.666, 2);
  });

  it('uses the species emission rate for projections', () => {
    const canines = speciesById('canines');
    const farm = deriveDashboardData(payload, canines).farms[0];
    expect(farm.rewardDay).toBe(canines.dailyEmission * 0.25);
  });

  it('projects zero rewards for species without active emissions', () => {
    const turtles = speciesById('turtles');
    const farm = deriveDashboardData(payload, turtles).farms[0];
    expect(turtles.dailyEmission).toBe(0);
    expect(farm.rewardDay).toBe(0);
    expect(farm.rewardWeek).toBe(0);
    expect(farm.rewardMonth).toBe(0);
    expect(farm.rewardYear).toBe(0);
  });
});

describe('species registry', () => {
  it('covers all six species with distinct feeds', () => {
    expect(SPECIES.map((species) => species.id)).toEqual(
      ['ducks', 'canines', 'bulls', 'turtles', 'felines', 'eagles'],
    );
    expect(new Set(SPECIES.map((species) => species.apiUrl)).size).toBe(SPECIES.length);
    for (const species of SPECIES) {
      expect(species.dailyEmission).toBeGreaterThanOrEqual(0);
      expect(species.rewardToken).not.toBe('');
    }
  });

  it('falls back to ducks for unknown ids', () => {
    expect(speciesById('nope')).toBe(SPECIES[0]);
  });
});

describe('findFarmByAddress', () => {
  it('never matches on an empty address, even with an ownerless farm in the feed', () => {
    const farms = deriveDashboardData({
      ...payload,
      farmData: [...payload.farmData, { ...payload.farmData[0], owner: '' }],
    }, ducks).farms;
    expect(farms.some((farm) => farm.owner === '')).toBe(true);
    expect(findFarmByAddress(farms, '')).toBeNull();
    expect(findFarmByAddress(farms, '   ')).toBeNull();
    expect(findFarmByAddress(farms, '3P123456789ABCDEFGHIJKLMN')?.owner).toBe('3P123456789ABCDEFGHIJKLMN');
    expect(findFarmByAddress(farms, '3PNoSuchFarm')).toBeNull();
  });
});

describe('shortenAddress', () => {
  it('keeps both ends of a wallet address', () => {
    expect(shortenAddress('3P123456789ABCDEFGHIJKLMN')).toBe('3P1234…JKLMN');
  });
});
