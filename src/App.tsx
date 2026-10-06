import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  Info,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SPECIES, SPECIES, fetchDashboardData, findFarmByAddress, shortenAddress, speciesById } from './data';
import { formatCompact, formatNumber, formatPercent, formatReward, formatUpdatedAt } from './format';
import type { DashboardData, Farm, FilterStatus, SortDirection, SortKey, SpeciesConfig, SpeciesId } from './types';

const PAGE_SIZES = [25, 50, 100];

const DUCK_IMAGE_URL = 'https://wavesducks.com/ducks/hatched.svg';

const SORT_KEYS: SortKey[] = ['rank', 'displayName', 'ducks', 'farmingPower', 'averagePower', 'share', 'rewardDay', 'availablePerches', 'claimedToken'];

const getSortLabels = (species: SpeciesConfig): Record<SortKey, string> => ({
  rank: 'Rank',
  displayName: 'Farm',
  ducks: species.label,
  farmingPower: 'Farming power',
  averagePower: 'Avg. power',
  share: 'Share',
  rewardDay: `${species.rewardToken} / day`,
  availablePerches: `Open ${species.unitPlural}`,
  claimedToken: 'Claimed',
});

const FILTERS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: 'All farms' },
  { value: 'farming', label: 'Farming' },
  { value: 'open', label: 'Open' },
  { value: 'idle', label: 'Idle' },
  { value: 'empty', label: 'Empty' },
];

const getInitialParam = (key: string): string => new URLSearchParams(window.location.search).get(key) || '';

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [speciesId, setSpeciesId] = useState<SpeciesId>(() => {
    const value = getInitialParam('species');
    return SPECIES.some((species) => species.id === value) ? (value as SpeciesId) : DEFAULT_SPECIES;
  });
  const species = speciesById(speciesId);
  const sortLabels = getSortLabels(species);
  const [query, setQuery] = useState(() => getInitialParam('q'));
  const [status, setStatus] = useState<FilterStatus>(() => {
    const value = getInitialParam('status') as FilterStatus;
    return FILTERS.some((filter) => filter.value === value) ? value : 'all';
  });
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const value = getInitialParam('sort') as SortKey;
    return SORT_KEYS.includes(value) ? value : 'rank';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    getInitialParam('dir') === 'desc' ? 'desc' : 'asc',
  );
  const [page, setPage] = useState(() => Math.max(1, Number(getInitialParam('page')) || 1));
  const [pageSize, setPageSize] = useState(() => {
    const value = Number(getInitialParam('size'));
    return PAGE_SIZES.includes(value) ? value : 25;
  });
  const [selectedAddress, setSelectedAddress] = useState(() => getInitialParam('farm'));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetchDashboardData(species, controller.signal)
      .then(setData)
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'The farm data could not be loaded.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [refreshKey, species]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (speciesId !== DEFAULT_SPECIES) params.set('species', speciesId);
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    if (sortKey !== 'rank') params.set('sort', sortKey);
    if (sortDirection !== 'asc') params.set('dir', sortDirection);
    if (page > 1) params.set('page', String(page));
    if (pageSize !== 25) params.set('size', String(pageSize));
    if (selectedAddress) params.set('farm', selectedAddress);
    const next = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
  }, [page, pageSize, query, selectedAddress, sortDirection, sortKey, speciesId, status]);

  const filteredFarms = useMemo(() => {
    if (!data) return [];
    const search = query.trim().toLocaleLowerCase();

    return data.farms
      .filter((farm) => {
        if (status === 'farming' && farm.farming === 0) return false;
        if (status === 'open' && farm.availablePerches === 0) return false;
        if (status === 'idle' && farm.status !== 'idle') return false;
        if (status === 'empty' && farm.status !== 'empty') return false;
        if (!search) return true;
        return [farm.name, farm.owner, farm.description, farm.displayName].some((value) =>
          value.toLocaleLowerCase().includes(search),
        );
      })
      .sort((a, b) => {
        const first = a[sortKey];
        const second = b[sortKey];
        const result =
          typeof first === 'string' && typeof second === 'string'
            ? first.localeCompare(second)
            : Number(first) - Number(second);
        return sortDirection === 'asc' ? result : -result;
      });
  }, [data, query, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filteredFarms.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleFarms = filteredFarms.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedFarm = data ? findFarmByAddress(data.farms, selectedAddress) : null;

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const setFilter = (nextStatus: FilterStatus) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const changeSpecies = (next: SpeciesId) => {
    if (next === speciesId) return;
    setSpeciesId(next);
    setSelectedAddress('');
    setPage(1);
  };

  const setSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'rank' || key === 'displayName' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setSortKey('rank');
    setSortDirection('asc');
    setPage(1);
  };

  const topTenShare = data ? data.farms.slice(0, 10).reduce((total, farm) => total + farm.share, 0) : 0;
  const maxPower = data?.farms[0]?.farmingPower ?? 0;
  const activeFilterCount = Number(Boolean(query)) + Number(status !== 'all');
  const stale = Boolean(error && data);

  return (
    <div className="app-shell">
      <Header updatedAt={data?.updatedAt} onRefresh={() => setRefreshKey((key) => key + 1)} loading={loading} />

      <main className="page-shell">
        <section className="dash-head" aria-labelledby="page-title">
          <div>
            <h1 id="page-title">{species.singular} farms</h1>
            {species.dailyEmission === 0 && (
              <p className="dash-note">Reward emissions are currently inactive — these positions earn nothing right now.</p>
            )}
          </div>
          <a className="source-link" href={species.apiUrl} target="_blank" rel="noreferrer">
            Raw JSON
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </section>

        <div className="species-tabs" role="tablist" aria-label="Animal species">
          {SPECIES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={option.id === speciesId}
              className={option.id === speciesId ? 'species-tab active' : 'species-tab'}
              onClick={() => changeSpecies(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && !data ? (
          <ErrorState message={error} onRetry={() => setRefreshKey((key) => key + 1)} />
        ) : (
          <>
            <Overview data={data} species={species} />

            {stale && (
              <p className="stale-banner" role="status">
                Showing the last loaded snapshot. Refresh failed: {error}
              </p>
            )}

            <div className={data ? 'concentration-slim' : 'concentration-slim loading'}>
              <span className="slim-label">Top 10 share</span>
              <strong>{data ? formatPercent(topTenShare, 1) : <span className="sk sk-slim" aria-hidden="true" />}</strong>
              <div
                className="concentration-bar"
                role="img"
                aria-label={data ? `Top ten farms hold ${formatPercent(topTenShare, 1)} of farming power` : 'Loading farming power concentration'}
              >
                <span style={data ? { width: `${Math.min(100, topTenShare)}%` } : undefined} />
              </div>
            </div>

            <section className="farms-section" aria-labelledby="farms-heading">
              <div className="section-heading">
                <h2 id="farms-heading">All farms</h2>
                <p>{loading && filteredFarms.length === 0 ? 'Loading…' : `${formatNumber(filteredFarms.length)} shown`}</p>
              </div>

              <div className="toolbar">
                <label className="search-control">
                  <Search size={18} aria-hidden="true" />
                  <span className="sr-only">Search farms</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search farm name or wallet address…"
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {query && (
                    <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                      <X size={16} />
                    </button>
                  )}
                </label>

                <div className="filter-scroll" aria-label="Farm filters">
                  {FILTERS.map((filter) => (
                    <button
                      type="button"
                      className={status === filter.value ? 'filter-pill active' : 'filter-pill'}
                      aria-pressed={status === filter.value}
                      onClick={() => setFilter(filter.value)}
                      key={filter.value}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {activeFilterCount > 0 && (
                  <button type="button" className="clear-button" onClick={clearFilters}>
                    Clear <span>{activeFilterCount}</span>
                  </button>
                )}
              </div>

              <div className="mobile-sort">
                <SlidersHorizontal size={16} aria-hidden="true" />
                <label htmlFor="mobile-sort">Sort by</label>
                <select
                  id="mobile-sort"
                  value={sortKey}
                  onChange={(event) => changeSort(event.target.value as SortKey)}
                >
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
                  aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </button>
              </div>

              <FarmResults
                farms={visibleFarms}
                loading={loading}
                query={query}
                maxPower={maxPower}
                species={species}
                sortLabels={sortLabels}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={changeSort}
                onSelect={(farm) => setSelectedAddress(farm.owner)}
                onClear={clearFilters}
              />

              {!loading && filteredFarms.length > 0 && (
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  total={filteredFarms.length}
                  onPage={setPage}
                  onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              )}
            </section>

            <footer>
              <span>Farm Explorer</span>
              <p>
                {species.dailyEmission > 0 ? (
                  <>{species.rewardToken} estimates assume {species.dailyEmission} {species.rewardToken}/day emission · </>
                ) : (
                  <>No active {species.rewardToken} emissions · </>
                )}
                <a href={species.apiUrl} target="_blank" rel="noreferrer">Raw JSON</a>
              </p>
            </footer>
          </>
        )}
      </main>

      {selectedFarm && <FarmDrawer farm={selectedFarm} species={species} onClose={() => setSelectedAddress('')} />}
    </div>
  );
}

function Header({ updatedAt, onRefresh, loading }: { updatedAt?: string; onRefresh: () => void; loading: boolean }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="Farm Explorer home">
          <span className="brand-mark"><img src={DUCK_IMAGE_URL} alt="" width={22} height={28} /></span>
          <span>
            <strong>Duxplorer</strong>
            <small>Farm dashboard</small>
          </span>
        </a>
        <div className="freshness">
          <span className="freshness-copy">
            <small>Latest snapshot</small>
            <strong>{updatedAt ? formatUpdatedAt(updatedAt) : 'Connecting to feed…'}</strong>
          </span>
          <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh farming data">
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Overview({ data, species }: { data: DashboardData | null; species: SpeciesConfig }) {
  const global = data?.global;
  const farmingRate = global && global.totalDucks > 0 ? (global.totalDucksOnFarming / global.totalDucks) * 100 : 0;
  const metrics: Array<{ label: string; value: string | null; note: string | null }> = [
    { label: 'Farms', value: global ? formatNumber(global.totalFarms) : null, note: null },
    { label: 'Farming power', value: global ? formatCompact(global.totalFarmingPower, 2) : null, note: null },
    { label: `${species.label} farming`, value: global ? formatNumber(global.totalDucksOnFarming) : null, note: global ? `${formatPercent(farmingRate, 1)} of all ${species.label.toLowerCase()}` : null },
    { label: `Open ${species.unitPlural}`, value: global ? formatNumber(global.totalPerchesAvailable) : null, note: null },
    { label: `${species.rewardToken} claimed`, value: global ? formatCompact(global.totalEGGClaimed, 2) : null, note: null },
  ];

  return (
    <section className="metrics-strip" aria-label="Ecosystem overview">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value ?? <span className="sk sk-value" aria-hidden="true" />}</strong>
          {metric.note && <small>{metric.note}</small>}
        </div>
      ))}
    </section>
  );
}

function FarmResults({
  farms,
  loading,
  query,
  maxPower,
  species,
  sortLabels,
  sortKey,
  sortDirection,
  onSort,
  onSelect,
  onClear,
}: {
  farms: Farm[];
  loading: boolean;
  query: string;
  maxPower: number;
  species: SpeciesConfig;
  sortLabels: Record<SortKey, string>;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onSelect: (farm: Farm) => void;
  onClear: () => void;
}) {
  // Only swap the table for a skeleton on the initial load. During a
  // refresh the previous rows stay visible so the view doesn't flash.
  if (loading && farms.length === 0) return <TableSkeleton />;
  if (!farms.length) {
    return (
      <div className="empty-state">
        <Search size={24} aria-hidden="true" />
        <h3>No matching farms</h3>
        <p>{query ? `Nothing matched “${query}”. Try the full wallet address.` : 'Try a different farm filter.'}</p>
        <button type="button" onClick={onClear}>Clear filters</button>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHead label={sortLabels.rank} sortKey="rank" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label={sortLabels.displayName} sortKey="displayName" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label={sortLabels.ducks} sortKey="ducks" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label={sortLabels.farmingPower} sortKey="farmingPower" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label={sortLabels.averagePower} sortKey="averagePower" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label={sortLabels.share} sortKey="share" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label={sortLabels.rewardDay} sortKey="rewardDay" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label="Capacity" sortKey="availablePerches" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {farms.map((farm) => (
              <tr key={farm.owner || `farm-${farm.rank}`}>
                <td className="rank-cell">{farm.rank}</td>
                <td>
                  <FarmIdentity farm={farm} onSelect={onSelect} />
                </td>
                <td>
                  <span className="numeric-primary">{formatNumber(farm.ducks)}</span>
                  <span className="cell-note">{formatNumber(farm.farming)} farming</span>
                </td>
                <td>
                  <span className="numeric-primary">{formatNumber(farm.farmingPower)}</span>
                  <span className="power-track"><span style={{ width: `${maxPower > 0 ? Math.max(2, (farm.farmingPower / maxPower) * 100) : 2}%` }} /></span>
                </td>
                <td className="numeric-primary">{formatNumber(farm.averagePower, 1)}</td>
                <td className="numeric-primary">{formatPercent(farm.share, farm.share < 0.1 ? 3 : 2)}</td>
                <td>
                  <span className="egg-value">{formatReward(farm.rewardDay)} {species.rewardToken}</span>
                  <span className="cell-note">{formatReward(farm.rewardMonth)} / month</span>
                </td>
                <td>
                  <FarmStatus farm={farm} />
                  <span className="cell-note">{farm.availablePerches > 0 ? `${farm.availablePerches} open` : `${formatPercent(farm.utilization, 0)} full`}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="farm-card-list">
        {farms.map((farm) => farm.owner ? (
          <button className="farm-card" type="button" key={farm.owner} onClick={() => onSelect(farm)}>
            <span className="mobile-rank">#{farm.rank}</span>
            <span className="farm-card-top">
              <span className="farm-card-title">
                <strong>{farm.displayName}</strong>
                <small>{shortenAddress(farm.owner, 8, 6)}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </span>
            <span className="farm-card-stats">
              <span><small>Farm power</small><strong>{formatNumber(farm.farmingPower)}</strong></span>
              <span><small>Share</small><strong>{formatPercent(farm.share, 2)}</strong></span>
              <span><small>{species.rewardToken} / day</small><strong className="egg-value">{formatReward(farm.rewardDay)}</strong></span>
            </span>
            <span className="farm-card-bottom">
              <span>{formatNumber(farm.farming)} of {formatNumber(farm.ducks)} {species.label.toLowerCase()} farming</span>
              <FarmStatus farm={farm} />
            </span>
          </button>
        ) : (
          <div className="farm-card static" key={`farm-${farm.rank}`}>
            <span className="mobile-rank">#{farm.rank}</span>
            <span className="farm-card-top">
              <span className="farm-card-title">
                <strong>{farm.displayName}</strong>
                <small>Unassigned</small>
              </span>
            </span>
            <span className="farm-card-stats">
              <span><small>Farm power</small><strong>{formatNumber(farm.farmingPower)}</strong></span>
              <span><small>Share</small><strong>{formatPercent(farm.share, 2)}</strong></span>
              <span><small>{species.rewardToken} / day</small><strong className="egg-value">{formatReward(farm.rewardDay)}</strong></span>
            </span>
            <span className="farm-card-bottom">
              <span>{formatNumber(farm.farming)} of {formatNumber(farm.ducks)} {species.label.toLowerCase()} farming</span>
              <FarmStatus farm={farm} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th scope="col" aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
        {active ? direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : <ArrowUpDown size={13} />}
      </button>
    </th>
  );
}

function FarmIdentity({ farm, onSelect }: { farm: Farm; onSelect: (farm: Farm) => void }) {
  const content = (
    <span>
      <strong>{farm.displayName}</strong>
      <small>{shortenAddress(farm.owner, 7, 6)}</small>
    </span>
  );

  // The feed contains one ownerless farm; with no address it cannot be
  // deep-linked or closed by address, so render it as static text rather
  // than a button that would do nothing.
  if (!farm.owner) {
    return <span className="farm-identity static">{content}</span>;
  }

  return (
    <button className="farm-identity" type="button" onClick={() => onSelect(farm)}>
      {content}
    </button>
  );
}

function FarmStatus({ farm }: { farm: Farm }) {
  if (farm.availablePerches > 0) return <span className="status-badge open"><span />Open</span>;
  if (farm.status === 'farming') return <span className="status-badge farming"><span />Farming</span>;
  if (farm.status === 'idle') return <span className="status-badge idle"><span />Idle</span>;
  return <span className="status-badge empty"><span />Empty</span>;
}

function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <div className="pagination">
      <div className="page-size">
        <label htmlFor="page-size">Rows</label>
        <select id="page-size" value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>
          {PAGE_SIZES.map((size) => <option value={size} key={size}>{size}</option>)}
        </select>
      </div>
      <span>{formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}</span>
      <div className="page-buttons">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={18} /></button>
        <strong>{page} / {pageCount}</strong>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page === pageCount} aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

function FarmDrawer({ farm, species, onClose }: { farm: Farm; species: SpeciesConfig; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const close = useCallback(onClose, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('drawer-open');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('drawer-open');
    };
  }, [close]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(farm.owner);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="farm-drawer" role="dialog" aria-modal="true" aria-labelledby="farm-title">
        <div className="drawer-header">
          <div className="drawer-rank"><span>Network rank</span><strong>#{farm.rank}</strong></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close farm details"><X size={20} /></button>
        </div>

        <div className="drawer-identity">
          <span className="drawer-avatar">{farm.name ? farm.name.slice(0, 1).toUpperCase() : <img src={DUCK_IMAGE_URL} alt="" width={30} height={38} />}</span>
          <div>
            <FarmStatus farm={farm} />
            <h2 id="farm-title">{farm.displayName}</h2>
          </div>
        </div>

        <div className="address-row">
          <code>{farm.owner || 'Owner unavailable'}</code>
          {farm.owner && (
            <button type="button" onClick={copyAddress} aria-label="Copy owner address">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>

        {farm.description && <blockquote>“{farm.description}”</blockquote>}

        <section className="drawer-highlight" aria-label="Farm production">
          <div>
            <span>Farming power</span>
            <strong>{formatNumber(farm.farmingPower)}</strong>
            <small>{formatPercent(farm.share, 2)} of network</small>
          </div>
          <div>
            <span>Estimated production</span>
            <strong>{formatReward(farm.rewardDay)} <small>{species.rewardToken} / day</small></strong>
            <small>{formatReward(farm.rewardMonth)} {species.rewardToken} / month</small>
          </div>
        </section>

        <section className="drawer-section">
          <div className="drawer-section-title"><h3>{species.singular} allocation</h3><span>{formatNumber(farm.ducks)} total</span></div>
          <div className="allocation-bar" aria-label={`${farm.farming} farming, ${farm.held} held, ${farm.auction} for sale, ${farm.fighting} fighting`}>
            {farm.ducks > 0 && <>
              <span className="allocation-farming" style={{ width: `${(farm.farming / farm.ducks) * 100}%` }} />
              <span className="allocation-held" style={{ width: `${(farm.held / farm.ducks) * 100}%` }} />
              <span className="allocation-sale" style={{ width: `${(farm.auction / farm.ducks) * 100}%` }} />
              <span className="allocation-fighting" style={{ width: `${(farm.fighting / farm.ducks) * 100}%` }} />
            </>}
          </div>
          <div className="allocation-grid">
            <DetailStat label="Farming" value={formatNumber(farm.farming)} tone="yellow" />
            <DetailStat label="Held" value={formatNumber(farm.held)} tone="neutral" />
            <DetailStat label="For sale" value={formatNumber(farm.auction)} tone="blue" />
            <DetailStat label="Fighting" value={formatNumber(farm.fighting)} tone="red" />
          </div>
        </section>

        <section className="drawer-section">
          <div className="drawer-section-title"><h3>Farm details</h3></div>
          <dl className="detail-list">
            <div><dt>Average power / farming {species.singular.toLowerCase()}</dt><dd>{formatNumber(farm.averagePower, 2)}</dd></div>
            <div><dt>Open {species.unitPlural}</dt><dd>{formatNumber(farm.availablePerches)}</dd></div>
            <div><dt>{species.unitSingular.charAt(0).toUpperCase() + species.unitSingular.slice(1)} utilization</dt><dd>{formatPercent(farm.utilization, 0)}</dd></div>
            <div><dt>Mantles</dt><dd>{formatNumber(farm.nrMantles)}</dd></div>
            <div><dt>Average artefact level</dt><dd>{formatNumber(farm.averageArtefactLevel, 2)}</dd></div>
            <div><dt>{species.rewardToken} invested in artefacts</dt><dd>{formatReward(farm.artefactToken)}</dd></div>
            <div><dt>{species.rewardToken} claimed</dt><dd>{formatReward(farm.claimedToken)}</dd></div>
          </dl>
        </section>

        <section className="projection-section">
          <div className="drawer-section-title"><h3>Estimated {species.rewardToken}</h3><Info size={15} aria-label="Projection based on current network farming power" /></div>
          <div className="projection-grid">
            <span><small>Week</small><strong>{formatReward(farm.rewardWeek)}</strong></span>
            <span><small>Month</small><strong>{formatReward(farm.rewardMonth)}</strong></span>
            <span><small>Year</small><strong>{formatReward(farm.rewardYear)}</strong></span>
          </div>
        </section>

        {farm.owner && (
          <a className="portfolio-link" href={`https://wavesducks.com/portfolio/${farm.owner}`} target="_blank" rel="noreferrer">
            Open farm portfolio <ExternalLink size={16} />
          </a>
        )}
      </aside>
    </div>
  );
}

function DetailStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`detail-stat ${tone}`}><span /><small>{label}</small><strong>{value}</strong></div>;
}

const SKELETON_ROWS = 8;
const SKELETON_COLUMNS = 8;

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading farms">
      <div className="table-skeleton" aria-hidden="true">
        <div className="skeleton-head">
          {Array.from({ length: SKELETON_COLUMNS }, (_, index) => <span className="sk" key={index} />)}
        </div>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div className="skeleton-row" key={index}>
            <span className="sk sk-rank" />
            <span className="sk-lines">
              <span className="sk sk-line wide" />
              <span className="sk sk-line" />
            </span>
            <span className="sk sk-cell" />
            <span className="sk sk-cell" />
            <span className="sk sk-cell short" />
            <span className="sk sk-cell short" />
            <span className="sk sk-cell" />
            <span className="sk sk-cell" />
          </div>
        ))}
      </div>
      <div className="cards-skeleton" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton-card" key={index}>
            <span className="sk sk-card-title" />
            <span className="sk sk-card-stats" />
            <span className="sk sk-line narrow" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="error-state">
      <Database size={28} aria-hidden="true" />
      <p className="eyebrow">Feed unavailable</p>
      <h2>We couldn’t load the farms.</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}><RefreshCw size={16} />Try again</button>
    </section>
  );
}

export default App;
