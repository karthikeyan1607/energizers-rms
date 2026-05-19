import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Database, Download, FileSpreadsheet, Plus, RefreshCcw, Save, Trash2, Upload } from 'lucide-react';
import { api } from './api.js';
import { useRmsStore } from './store.js';
import { num, pct } from './lib/format.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, index) => 2026 + index);

function Stat({ label, value, subtext }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-graphite">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
      {subtext && <div className="mt-1 text-sm text-graphite">{subtext}</div>}
    </div>
  );
}

function Toasts() {
  const { error, notice, clearError, clearNotice, setNotice } = useRmsStore();

  useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(() => clearError(), 3000);
    return () => window.clearTimeout(timer);
  }, [error, clearError]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => clearNotice(), 3000);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);

  if (!error && !notice) return null;
  return (
    <div className="fixed right-4 top-4 z-20 grid max-w-md gap-2">
      {error && (
        <button onClick={clearError} className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-medium text-rose-800 shadow-sm">
          {error}
        </button>
      )}
      {notice && (
        <button onClick={() => setNotice('')} className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm font-medium text-teal-800 shadow-sm">
          {notice}
        </button>
      )}
    </div>
  );
}

function SearchableResourceDropdown({ resources, selectedId, onChange, className = 'h-9 w-56 rounded-md border border-line px-2', placeholder = 'Search resource' }) {
  const wrapperRef = useRef(null);
  const sortedResources = useMemo(() => [...resources].sort((a, b) => a.name.localeCompare(b.name)), [resources]);
  const selectedResource = sortedResources.find((resource) => resource.id === selectedId);
  const [query, setQuery] = useState(selectedResource?.name || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedResource?.name || '');
  }, [selectedResource?.name]);

  useEffect(() => {
    function handlePointer(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, []);

  const filteredResources = sortedResources.filter((resource) => resource.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className={className}
        value={query}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white shadow-lg">
          {filteredResources.length === 0 && (
            <div className="px-3 py-2 text-sm text-graphite">No matching resources</div>
          )}
          {filteredResources.map((resource) => (
            <button
              key={resource.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-frost"
              onClick={() => {
                setQuery(resource.name);
                onChange(resource.id);
                setIsOpen(false);
              }}
            >
              {resource.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigBar() {
  const { config, updateConfig, dashboard } = useRmsStore();
  const [totalResources, setTotalResources] = useState('');
  const [monthlyHours, setMonthlyHours] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(4);
  const [selectedYear, setSelectedYear] = useState(2026);

  useEffect(() => {
    setTotalResources(config?.total_resources ?? '');
    setMonthlyHours(config?.monthly_hours ?? '');
    setSelectedMonth(config?.selected_month ?? 4);
    setSelectedYear(config?.selected_year ?? 2026);
  }, [config]);

  if (!config) return null;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-graphite">Total Resources</span>
        <input className="h-10 w-32 rounded-md border border-line px-3" type="number" step="0.25" value={totalResources} onChange={(event) => setTotalResources(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-graphite">Monthly Hours</span>
        <input className="h-10 w-32 rounded-md border border-line px-3" type="number" step="1" min="0" value={monthlyHours} onChange={(event) => setMonthlyHours(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-graphite">Month</span>
        <select className="h-10 w-36 rounded-md border border-line bg-white px-3" value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
          {MONTH_NAMES.map((month, index) => <option key={month} value={index}>{month}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-graphite">Year</span>
        <select className="h-10 w-28 rounded-md border border-line bg-white px-3" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
          {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
      <button
        title="Save configuration"
        className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
        onClick={() => updateConfig({
          total_resources: totalResources === '' ? '' : Number(totalResources),
          monthly_hours: monthlyHours === '' ? '' : Number(monthlyHours),
          selected_month: selectedMonth,
          selected_year: selectedYear,
        })}
      >
        <Save size={16} /> Save
      </button>
      {dashboard && (
        <div className="ml-auto text-sm text-graphite">
          Total capacity = <strong>{num((Number(totalResources) || 0) * (Number(monthlyHours) || 0))} hrs</strong>
        </div>
      )}
    </div>
  );
}

function MasterDataImportPanel() {
  const { importResources, importPrograms } = useRmsStore();
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold">Master Data Import</h2>
      </div>
      <p className="text-sm text-graphite">Load resources and programs before importing Azure stories.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex min-h-24 cursor-pointer items-center justify-between gap-4 rounded-lg border border-line bg-frost p-4">
          <div>
            <div className="font-semibold">Resources File</div>
            <div className="text-sm text-graphite">Resource Name, Email, Region</div>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white"><Upload size={16} /> Upload</span>
          <input className="hidden" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && importResources(e.target.files[0])} />
        </label>
        <label className="flex min-h-24 cursor-pointer items-center justify-between gap-4 rounded-lg border border-line bg-frost p-4">
          <div>
            <div className="font-semibold">Programs File</div>
            <div className="text-sm text-graphite">Program Name, Tenrox Code</div>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white"><Upload size={16} /> Upload</span>
          <input className="hidden" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && importPrograms(e.target.files[0])} />
        </label>
      </div>
    </section>
  );
}

function Dashboard() {
  const { dashboard } = useRmsStore();
  if (!dashboard) return null;
  const { totals } = dashboard;
  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Total Capacity" value={`${num(totals.total_capacity_hours)} hrs`} subtext={`${num(totals.total_resources)} resources`} />
        <Stat label="Used Capacity" value={`${num(totals.used_capacity_hours)} hrs`} subtext={`${num(totals.used_capacity)} resource FTE`} />
        <Stat label="Remaining" value={`${num(totals.remaining_capacity_hours)} hrs`} subtext={`${num(totals.remaining_capacity)} resource FTE`} />
        <Stat label="Monthly Hours" value={`${num(totals.monthly_hours)} hrs`} subtext="Configured monthly hours" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid-shell">
          <table className="data-table compact-table">
            <thead><tr><th>Resource</th><th>Region</th><th>Allocation</th><th>Remaining</th><th>Hours</th></tr></thead>
            <tbody>
              {dashboard.resource_utilization.map((resource) => (
                <tr key={resource.id}>
                  <td className="font-medium">{resource.name}</td>
                  <td>{resource.region}</td>
                  <td>{num(resource.allocation_percentage)}</td>
                  <td>{num(resource.remaining_capacity * 10)}</td>
                  <td>{num(resource.allocated_hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-shell">
          <table className="data-table compact-table">
            <thead><tr><th>Program</th><th>Tenrox</th><th>India</th><th>USA</th><th>Europe</th><th>No of Resources</th><th>Forecast Hours</th><th>% of Resources</th><th>Resource Summary</th></tr></thead>
            <tbody>
              {dashboard.program_summary.map((program) => (
                <tr key={program.id}>
                  <td className="font-medium">{program.name}</td>
                  <td>{program.tenrox_code || 'N/A'}</td>
                  <td>{num(program.india_resources)}</td>
                  <td>{num(program.usa_resources)}</td>
                  <td>{num(program.europe_resources)}</td>
                  <td>{num(program.no_of_resources)}</td>
                  <td>{num(program.forecast_hours)}</td>
                  <td>{pct(program.percent_of_total_resources)}</td>
                  <td className="max-w-lg text-sm text-graphite">{program.resource_allocation_summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AllocationGrid() {
  const { dashboard, resources, programs, updateAllocation, createAllocation, deleteAllocation, clearCurrentPlanning } = useRmsStore();
  const [drafts, setDrafts] = useState({});
  const [newRow, setNewRow] = useState({ resource_id: '', program_id: '', story_points: 1 });
  const [resourceSort, setResourceSort] = useState('asc');

  const allocations = dashboard?.allocations || [];
  const resourceNameById = useMemo(
    () => Object.fromEntries(resources.map((resource) => [resource.id, resource.name])),
    [resources],
  );
  const draftFor = (allocation) => drafts[allocation.id] || allocation;
  const setDraft = (id, patch) => setDrafts((current) => ({ ...current, [id]: { ...draftFor(allocations.find((item) => item.id === id)), ...patch } }));
  const sortedAllocations = [...allocations].sort((left, right) => {
    const leftName = resourceNameById[draftFor(left).resource_id] || left.resource_name || '';
    const rightName = resourceNameById[draftFor(right).resource_id] || right.resource_name || '';
    const comparison = leftName.localeCompare(rightName);
    return resourceSort === 'asc' ? comparison : -comparison;
  });

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Editable Allocation Grid</h2>
        <div className="flex flex-wrap gap-2">
          <SearchableResourceDropdown resources={resources} selectedId={newRow.resource_id} onChange={(id) => setNewRow({ ...newRow, resource_id: id })} />
          <select className="h-9 rounded-md border border-line bg-white px-2" value={newRow.program_id} onChange={(e) => setNewRow({ ...newRow, program_id: e.target.value })}>
            <option value="">Program</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
          </select>
          <input className="h-9 w-28 rounded-md border border-line px-2" type="number" step="0.1" min="0" value={newRow.story_points} onChange={(e) => setNewRow({ ...newRow, story_points: Number(e.target.value) })} aria-label="Story Points" />
          <button title="Add allocation" className="inline-flex h-9 items-center gap-2 rounded-md bg-teal px-3 text-sm font-semibold text-white" onClick={() => createAllocation(newRow)}>
            <Plus size={16} /> Add
          </button>
          <button title="Clear Current Planning" className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3 text-sm font-semibold" onClick={() => clearCurrentPlanning()}>
            Clear Current Planning
          </button>
        </div>
      </div>
      <div className="grid-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                Resource
                <span className="sort-toggle">
                  <button type="button" data-active={resourceSort === 'asc'} onClick={() => setResourceSort('asc')}>A-Z</button>
                  <button type="button" data-active={resourceSort === 'desc'} onClick={() => setResourceSort('desc')}>Z-A</button>
                </span>
              </th>
              <th>Program</th>
              <th>User Story Title</th>
              <th>Story Points</th>
              <th>Allocation</th>
              <th>Hours</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAllocations.map((allocation) => {
              const draft = draftFor(allocation);
              const draftAllocation = Number(draft.story_points || 0) * 0.1;
              return (
                <tr key={allocation.id}>
                  <td>
                    <select className="cell-input" value={draft.resource_id} onChange={(e) => setDraft(allocation.id, { resource_id: e.target.value })}>
                      {resources
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="cell-input" value={draft.program_id} onChange={(e) => setDraft(allocation.id, { program_id: e.target.value })}>
                      {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                    </select>
                  </td>
                  <td className="max-w-xs text-sm text-graphite">{allocation.user_story_title || ''}</td>
                  <td><input className="cell-input" type="number" step="0.1" min="0" value={draft.story_points} onChange={(e) => setDraft(allocation.id, { story_points: Number(e.target.value) })} /></td>
                  <td>{num(draftAllocation)}</td>
                  <td>{num(draftAllocation * (dashboard?.totals.monthly_hours || 0))}</td>
                  <td>
                    <div className="flex gap-2">
                      <button title="Save allocation" className="inline-flex h-8 items-center rounded-md border border-line px-2 text-sm font-semibold" onClick={() => updateAllocation(allocation.id, draft)}>
                        <Save size={15} />
                      </button>
                      <button title="Delete allocation" className="inline-flex h-8 items-center rounded-md border border-rose-200 bg-rose-50 px-2 text-sm font-semibold text-rose-800" onClick={() => deleteAllocation(allocation.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ImportPanel() {
  const { importFile, commitImport, previewRows, dashboard } = useRmsStore();
  const rows = useMemo(() => previewRows, [previewRows]);

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Azure Boards Import</h2>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
          <Upload size={16} /> Upload CSV
          <input className="hidden" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </label>
      </div>
      <div className="grid-shell">
        <table className="data-table">
          <thead><tr><th>Assigned To</th><th>User Story Title</th><th>Story Points</th><th>Program</th><th>Tenrox</th><th>Allocation</th><th>Hours</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="7" className="text-center text-graphite">No preview rows. Upload an Azure Boards CSV.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.assigned_to}</td>
                <td className="max-w-xs text-sm text-graphite">{row.user_story_title || ''}</td>
                <td>{num(row.story_points)}</td>
                <td>{row.program}</td>
                <td>{row.tenrox_code || 'N/A'}</td>
                <td>{num(row.allocation_percentage ?? row.story_points * 0.1)}</td>
                <td>{num((row.allocation_percentage ?? row.story_points * 0.1) * dashboard.totals.monthly_hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button disabled={rows.length === 0} className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={() => commitImport()}>
        <Database size={16} /> Accept & Move to Allocation
      </button>
    </section>
  );
}

function App() {
  const { load, loading, dashboard, error, snapshots, saveSnapshot, loadSnapshot } = useRmsStore();
  const [showSnapshots, setShowSnapshots] = useState(false);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="min-h-screen">
      <Toasts />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Energizers Resource Management System</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button title="Refresh data" className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold" onClick={load}><RefreshCcw size={16} /> Refresh</button>
            <button title="Export Excel" className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white" onClick={() => api.exportExcel()}><Download size={16} /> Export</button>
            <button title="Save Snapshot" className="inline-flex h-10 items-center rounded-md border border-line bg-white px-3 text-sm font-semibold" onClick={() => saveSnapshot()}>Save Snapshot</button>
            <button title="Load Snapshot" className="inline-flex h-10 items-center rounded-md border border-line bg-white px-3 text-sm font-semibold" onClick={() => setShowSnapshots((current) => !current)}>Load Snapshot</button>
            {showSnapshots && (
              <select className="h-10 rounded-md border border-line bg-white px-3 text-sm" defaultValue="" onChange={(e) => e.target.value && loadSnapshot(e.target.value)}>
                <option value="">Select Snapshot</option>
                {snapshots.map((snapshot) => <option key={snapshot.key} value={snapshot.key}>{snapshot.label}</option>)}
              </select>
            )}
          </div>
        </header>

        <MasterDataImportPanel />
        <ConfigBar />
        {loading && <div className="rounded-lg border border-line bg-white p-6 text-sm text-graphite">Loading browser workspace...</div>}
        {!loading && dashboard && (
          <>
            {dashboard.totals.remaining_capacity < 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
                <AlertTriangle size={18} /> Global plan exceeds configured total resources.
              </div>
            )}
            <Dashboard />
            <AllocationGrid />
            <ImportPanel />
          </>
        )}
        {!loading && error && !dashboard && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div>
        )}
        <footer className="flex items-center gap-2 pb-4 text-xs text-graphite">
          <FileSpreadsheet size={14} /> Excel export is generated directly in the browser from your saved RMS data.
        </footer>
      </div>
    </main>
  );
}

export default App;
