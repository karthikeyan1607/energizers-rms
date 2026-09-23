import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarCog, ChartPie, Database, Download, FileSpreadsheet, Gauge, LayoutDashboard, Plus, RefreshCcw, Save, TableProperties, Trash2, Upload, UsersRound } from 'lucide-react';
import { api } from './api.js';
import { useRmsStore } from './store.js';
import { num, pct } from './lib/format.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, index) => 2026 + index);
const resourceSummaryPoints = (value) => String(Math.round((Number(value) || 0) * 10));
const prioritizeKarthikeyan = (summary) => {
  const entries = String(summary || '').split(', ');
  const index = entries.findIndex((entry) => {
    const nameStart = entry.lastIndexOf(' (');
    const name = (nameStart < 0 ? entry : entry.slice(0, nameStart)).trim();
    return name.split(/\s+/)[0].toLowerCase() === 'karthikeyan';
  });
  if (index <= 0) return summary;
  return [entries[index], ...entries.slice(0, index), ...entries.slice(index + 1)].join(', ');
};

function Stat({ label, value, subtext, icon: Icon, tone = 'blue', percentage }) {
  const ringValue = percentage === undefined ? null : Math.min(100, Math.max(0, Number(percentage) || 0));
  const ringLabel = ringValue === null ? '' : `${Number(ringValue.toFixed(1))}%`;

  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-icon"><Icon size={22} /></div>
      <div className="metric-copy">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        {subtext && <div className="metric-subtext">{subtext}</div>}
      </div>
      {ringValue !== null && (
        <div className={`metric-ring metric-ring-${tone}`} style={{ '--ring-value': `${ringValue}%` }} role="img" aria-label={`${label}: ${ringLabel}`}>
          <span>{ringLabel}</span>
        </div>
      )}
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

function SearchableProgramDropdown({ programs, selectedId, onChange, className = 'h-9 w-56 rounded-md border border-line px-2', placeholder = 'Search program', allowEmpty = false, emptyLabel = 'Select Program' }) {
  const wrapperRef = useRef(null);
  const sortedPrograms = useMemo(() => [...programs].sort((a, b) => a.name.localeCompare(b.name)), [programs]);
  const selectedProgram = sortedPrograms.find((program) => program.id === selectedId);
  const [query, setQuery] = useState(selectedProgram?.name || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedProgram?.name || '');
  }, [selectedProgram?.name]);

  useEffect(() => {
    function handlePointer(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, []);

  const filteredPrograms = sortedPrograms.filter((program) => program.name.toLowerCase().includes(query.trim().toLowerCase()));

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
          if (allowEmpty && event.target.value === '') {
            onChange('');
          }
        }}
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white shadow-lg">
          {allowEmpty && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-graphite hover:bg-frost"
              onClick={() => {
                setQuery('');
                onChange('');
                setIsOpen(false);
              }}
            >
              {emptyLabel}
            </button>
          )}
          {filteredPrograms.length === 0 && (
            <div className="px-3 py-2 text-sm text-graphite">No matching programs</div>
          )}
          {filteredPrograms.map((program) => (
            <button
              key={program.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-frost"
              onClick={() => {
                setQuery(program.name);
                onChange(program.id);
                setIsOpen(false);
              }}
            >
              {program.name}
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
    <section className="section-card config-card">
      <div className="section-heading compact-heading"><div className="section-icon"><CalendarCog size={20} /></div><div><h2>Planning Configuration</h2><p>Set your planning period and capacity details.</p></div></div>
      <div className="config-controls">
        <label className="field-label"><span>Total Resources</span><input className="form-control w-32" type="number" step="0.25" value={totalResources} onChange={(event) => setTotalResources(event.target.value)} /></label>
        <label className="field-label"><span>Monthly Hours</span><select className="form-control w-32" value={monthlyHours} onChange={(event) => setMonthlyHours(event.target.value)}><option value="">Select</option>{[168, 176, 184].map((hours) => <option key={hours} value={hours}>{hours}</option>)}</select></label>
        <label className="field-label"><span>Month</span><select className="form-control w-36" value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>{MONTH_NAMES.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></label>
        <label className="field-label"><span>Year</span><select className="form-control w-28" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <button title="Save configuration" className="button-primary h-10" onClick={() => updateConfig({ total_resources: totalResources === '' ? '' : Number(totalResources), monthly_hours: monthlyHours === '' ? '' : Number(monthlyHours), selected_month: selectedMonth, selected_year: selectedYear })}><Save size={16} /> Save</button>
        {dashboard && <div className="capacity-callout"><Database size={21} /><span>Total capacity = <strong>{num((Number(totalResources) || 0) * (Number(monthlyHours) || 0))} hrs</strong></span></div>}
      </div>
    </section>
  );
}

function MasterDataImportPanel() {
  const { importResources, importPrograms } = useRmsStore();
  return (
    <section className="section-card">
      <div className="section-heading"><div className="section-icon"><Database size={20} /></div><div><h2>Master Data Import</h2><p>Load resources and programs before importing Azure stories.</p></div></div>
      <div className="upload-grid">
        <label className="upload-card upload-card-blue"><div className="upload-card-icon"><UsersRound size={24} /></div><div className="upload-card-copy"><strong>Resources File</strong><span>Resource Name, Email, Region</span></div><span className="upload-action"><Upload size={16} /> Upload File</span><input className="hidden" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && importResources(e.target.files[0])} /></label>
        <label className="upload-card upload-card-teal"><div className="upload-card-icon"><TableProperties size={24} /></div><div className="upload-card-copy"><strong>Programs File</strong><span>Program Name, Tenrox Code</span></div><span className="upload-action"><Upload size={16} /> Upload File</span><input className="hidden" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && importPrograms(e.target.files[0])} /></label>
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
        <Stat icon={UsersRound} tone="blue" label="Total Capacity" value={`${num(totals.total_capacity_hours)} hrs`} subtext={`${num(totals.total_resources)} resources`} />
        <Stat icon={ChartPie} tone="teal" label="Used Capacity" value={`${num(totals.used_capacity_hours)} hrs`} subtext={`${num(totals.used_capacity)} resource FTE`} percentage={totals.total_capacity_hours > 0 ? (totals.used_capacity_hours / totals.total_capacity_hours) * 100 : 0} />
        <Stat icon={Gauge} tone="amber" label="Remaining Capacity" value={`${num(totals.remaining_capacity_hours)} hrs`} subtext={`${num(totals.remaining_capacity)} resource FTE`} percentage={totals.total_capacity_hours > 0 ? (totals.remaining_capacity_hours / totals.total_capacity_hours) * 100 : 0} />
        <Stat icon={BarChart3} tone="purple" label="Monthly Hours" value={`${num(totals.monthly_hours)} hrs`} subtext="Configured monthly hours" />
      </div>
      <div className="summary-layout grid gap-4 lg:grid-cols-2">
        <div className="table-card"><div className="table-card-heading"><UsersRound size={16} /> Resource Summary</div>
          <table className="data-table compact-table summary-table resource-summary-table">
            <colgroup><col style={{ width: '32%' }} /><col style={{ width: '20%' }} /><col style={{ width: '16%' }} /><col style={{ width: '16%' }} /><col style={{ width: '16%' }} /></colgroup>
            <thead><tr><th>Resource</th><th>Region</th><th>Allocation</th><th>Remaining</th><th>Hours</th></tr></thead>
            <tbody>
              {dashboard.resource_utilization.length === 0 && <tr><td colSpan="5" className="empty-state"><Database size={22} /><strong>No data available</strong><span>Upload resource and program files to view summary.</span></td></tr>}
              {dashboard.resource_utilization.map((resource) => (
                <tr key={resource.id}>
                  <td className="font-medium">{resource.name}</td>
                  <td>{resource.region}</td>
                  <td>{resourceSummaryPoints(resource.allocation_percentage)}</td>
                  <td>{resourceSummaryPoints(resource.remaining_capacity)}</td>
                  <td>{num(resource.allocated_hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-card"><div className="table-card-heading"><LayoutDashboard size={16} /> Program Summary</div>
          <table className="data-table compact-table summary-table program-summary-table">
            <colgroup><col style={{ width: '16%' }} /><col style={{ width: '10%' }} /><col style={{ width: '7%' }} /><col style={{ width: '6%' }} /><col style={{ width: '7%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '24%' }} /></colgroup>
            <thead><tr><th>Program</th><th>Tenrox</th><th>India</th><th>USA</th><th>Europe</th><th>No of Resources</th><th>Forecast Hours</th><th>% of Resources</th><th>Resource Summary</th></tr></thead>
            <tbody>
              {dashboard.program_summary.filter((program) => Number(program.total_program_resources) > 0).length === 0 && <tr><td colSpan="9" className="empty-state"><Database size={22} /><strong>No data available</strong><span>Upload data to view program summary.</span></td></tr>}
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
                  <td className="max-w-lg text-sm text-graphite">{prioritizeKarthikeyan(program.resource_allocation_summary)}</td>
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
  const [newRow, setNewRow] = useState({ resource_id: '', program_id: '', story_points: 1 });
  const [resourceSort, setResourceSort] = useState('asc');

  const allocations = dashboard?.allocations || [];
  const resourceNameById = useMemo(
    () => Object.fromEntries(resources.map((resource) => [resource.id, resource.name])),
    [resources],
  );
  const sortedAllocations = [...allocations].sort((left, right) => {
    const leftName = resourceNameById[left.resource_id] || left.resource_name || '';
    const rightName = resourceNameById[right.resource_id] || right.resource_name || '';
    const comparison = leftName.localeCompare(rightName);
    return resourceSort === 'asc' ? comparison : -comparison;
  });

  const saveAllocationPatch = (allocation, patch) => updateAllocation(allocation.id, {
    ...allocation,
    ...patch,
    user_story_title: allocation.user_story_title,
    tenrox_code: allocation.tenrox_code,
  });

  const handleProgramChange = (allocation, programId) => {
    const selectedProgram = programs.find((program) => program.id === programId);
    updateAllocation(allocation.id, {
      ...allocation,
      program_id: programId,
      tenrox_code: selectedProgram?.tenrox_code || allocation.tenrox_code,
      matching_program_ids: programId ? [] : allocation.matching_program_ids,
      user_story_title: allocation.user_story_title,
    });
  };

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="section-heading section-heading-inline"><div className="section-icon section-icon-violet"><TableProperties size={20} /></div><div><h2>Editable Allocation Grid</h2><p>Manage resource allocations and story points.</p></div></div>
        <div className="flex flex-wrap gap-2">
          <SearchableResourceDropdown resources={resources} selectedId={newRow.resource_id} onChange={(id) => setNewRow({ ...newRow, resource_id: id })} />
          <SearchableProgramDropdown programs={programs} selectedId={newRow.program_id} onChange={(id) => setNewRow({ ...newRow, program_id: id })} allowEmpty emptyLabel="Program" />
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
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '2%' }} />
          </colgroup>
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
              <th>Tenrox</th>
              <th>User Story Title</th>
              <th>Story Points</th>
              <th>Allocation</th>
              <th>Hours</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAllocations.length === 0 && <tr><td colSpan="8" className="empty-state"><TableProperties size={22} /><strong>No data available</strong><span>Add resources to start planning allocations.</span></td></tr>}
            {sortedAllocations.map((allocation) => {
              const draftAllocation = Number(allocation.story_points || 0) * 0.1;
              const matchingPrograms = !allocation.program_id && allocation.matching_program_ids?.length
                ? programs.filter((program) => allocation.matching_program_ids.includes(program.id))
                : programs;
              const requiresProgramSelection = !allocation.program_id && allocation.matching_program_ids?.length > 1;
              return (
                <tr key={allocation.id}>
                  <td>
                    <select className="cell-input" value={allocation.resource_id} onChange={(e) => saveAllocationPatch(allocation, { resource_id: e.target.value })}>
                      {resources
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <SearchableProgramDropdown
                      programs={matchingPrograms}
                      selectedId={allocation.program_id}
                      onChange={(programId) => handleProgramChange(allocation, programId)}
                      className={`cell-input ${requiresProgramSelection ? 'border-amber-300 bg-amber-50' : ''}`}
                      allowEmpty={requiresProgramSelection}
                      placeholder={allocation.program_id ? 'Search program' : allocation.program_name === 'Unknown' ? 'Unknown · search program' : requiresProgramSelection ? 'Select Program' : 'Search program'}
                    />
                  </td>
                  <td className="whitespace-nowrap text-sm text-graphite">{allocation.tenrox_code || 'N/A'}</td>
                  <td className="min-w-[320px] max-w-xl text-sm text-graphite">{allocation.user_story_title || ''}</td>
                  <td><input className="cell-input min-w-[88px]" type="number" step="0.1" min="0" value={allocation.story_points} onChange={(e) => saveAllocationPatch(allocation, { story_points: Number(e.target.value) })} /></td>
                  <td className="whitespace-nowrap">{num(draftAllocation)}</td>
                  <td className="whitespace-nowrap">{num(draftAllocation * (dashboard?.totals.monthly_hours || 0))}</td>
                  <td>
                    <button title="Delete allocation" className="inline-flex h-8 items-center rounded-md border border-rose-200 bg-rose-50 px-2 text-sm font-semibold text-rose-800" onClick={() => deleteAllocation(allocation.id)}>
                      <Trash2 size={15} />
                    </button>
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
  const { importFile, commitImport, deletePreviewRow, previewRows, dashboard } = useRmsStore();
  const rows = useMemo(() => previewRows, [previewRows]);

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="section-heading section-heading-inline"><div className="section-icon section-icon-amber"><Database size={20} /></div><div><h2>Azure Boards Import</h2><p>Review stories before moving them into allocation planning.</p></div></div>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
          <Upload size={16} /> Upload CSV
          <input className="hidden" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </label>
      </div>
      <div className="grid-shell">
        <table className="data-table">
          <thead><tr><th>Assigned To</th><th>User Story Title</th><th>Story Points</th><th>Program</th><th>Tenrox</th><th>Allocation</th><th>Hours</th><th>Action</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="8" className="text-center text-graphite">No preview rows. Upload an Azure Boards CSV.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.assigned_to}</td>
                <td className="max-w-xs text-sm text-graphite">{row.user_story_title || ''}</td>
                <td>{num(row.story_points)}</td>
                <td>{row.program}</td>
                <td>{row.tenrox_code || 'N/A'}</td>
                <td>{num(row.allocation_percentage ?? row.story_points * 0.1)}</td>
                <td>{num((row.allocation_percentage ?? row.story_points * 0.1) * dashboard.totals.monthly_hours)}</td>
                <td>
                  <button title="Delete preview row" className="inline-flex h-8 items-center rounded-md border border-rose-200 bg-rose-50 px-2 text-sm font-semibold text-rose-800" onClick={() => deletePreviewRow(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </td>
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
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-lockup">
            <img className="cat-logo" src={`${import.meta.env.BASE_URL}cat-logo.png`} alt="CAT" />
            <div className="brand-divider" />
            <div><h1>SITRA</h1><p>SIT Resource Allocation Platform</p></div>
          </div>
          <div className="header-actions">
            <button title="Refresh data" className="button-secondary" onClick={load}><RefreshCcw size={16} /> Refresh</button>
            <button title="Export Excel" className="button-primary" onClick={() => api.exportExcel()}><Download size={16} /> Export</button>
            <button title="Save Snapshot" className="button-secondary" onClick={() => saveSnapshot()}><Save size={16} /> Save Snapshot</button>
            <button title="Load Snapshot" className="button-secondary" onClick={() => setShowSnapshots((current) => !current)}><Database size={16} /> Load Snapshot</button>
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
