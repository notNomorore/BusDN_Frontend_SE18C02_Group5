import React, { useCallback, useEffect, useState } from 'react';
import {
  FaBus,
  FaChild,
  FaClock,
  FaDollarSign,
  FaMoneyBillWave,
  FaPercent,
  FaPlus,
  FaRoute,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaTicketAlt,
  FaTrashAlt,
  FaUsers,
  FaWheelchair
} from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const createEmptyMatrix = () => ({
  singleRide: {
    basePrice: 7000,
    distanceTiers: [
      { minDistanceKm: 0, maxDistanceKm: 5, price: 7000, peakMultiplier: 1 },
      { minDistanceKm: 5.1, maxDistanceKm: 10, price: 10000, peakMultiplier: 1.15 },
      { minDistanceKm: 10.1, maxDistanceKm: 20, price: 15000, peakMultiplier: 1.3 },
      { minDistanceKm: 20.1, maxDistanceKm: null, price: 20000, peakMultiplier: 1.45 }
    ]
  },
  monthly: {
    interRoutePrice: 300000,
    singleRouteDefaultPrice: 200000,
    standardAdultPrice: 200000,
    studentSeniorPrice: 100000,
    employerSubsidizedPrice: 150000,
    touristWeekPrice: 70000
  },
  priorityDiscounts: {
    defaultPercent: 20,
    studentPercent: 50,
    warVeteranPercent: 100,
    disabledPercent: 100,
    elderlyPercent: 30,
    otherPercent: 20
  },
  freeRideRules: {
    enabled: true,
    underAgeEnabled: true,
    underAge: 6,
    overAgeEnabled: false,
    overAge: 75,
    accessibilityEnabled: true,
    accessibilityCategory: 'disabled',
    accessibilityStartHour: '10:00',
    accessibilityEndHour: '15:00',
    priorityCategories: ['disabled', 'war veteran'],
    note: 'Free fares apply to configured age groups and verified categories.'
  }
});

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-sky-100 text-sky-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  SUSPENDED: 'bg-gray-200 text-gray-700',
  INACTIVE: 'bg-gray-100 text-gray-600'
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} d`;
const formatPercent = (value) => `${Number(value || 0)}%`;

const mergeMatrix = (incoming = {}) => {
  const base = createEmptyMatrix();
  const rawTiers = Array.isArray(incoming?.singleRide?.distanceTiers) && incoming.singleRide.distanceTiers.length
    ? incoming.singleRide.distanceTiers
    : base.singleRide.distanceTiers;

  const distanceTiers = rawTiers.map((tier, index) => {
    const previous = rawTiers[index - 1];
    const fallbackMin = index === 0 ? 0 : Number((Number(previous?.maxDistanceKm || 0) + 0.1).toFixed(1));
    return {
      minDistanceKm: Number(tier?.minDistanceKm ?? fallbackMin),
      maxDistanceKm: tier?.maxDistanceKm === null || tier?.maxDistanceKm === undefined || tier?.maxDistanceKm === '' ? null : Number(tier.maxDistanceKm),
      price: Number(tier?.price ?? 0),
      peakMultiplier: Number(tier?.peakMultiplier ?? 1)
    };
  });

  return {
    ...base,
    ...incoming,
    singleRide: {
      ...base.singleRide,
      ...incoming.singleRide,
      distanceTiers
    },
    monthly: {
      ...base.monthly,
      ...incoming.monthly
    },
    priorityDiscounts: {
      ...base.priorityDiscounts,
      ...incoming.priorityDiscounts
    },
    freeRideRules: {
      ...base.freeRideRules,
      ...incoming.freeRideRules,
      priorityCategories: Array.isArray(incoming?.freeRideRules?.priorityCategories)
        ? incoming.freeRideRules.priorityCategories
        : base.freeRideRules.priorityCategories
    }
  };
};

const resolveTierForDistance = (distance, matrix) => {
  const safeDistance = Number(distance || 0);
  const tiers = matrix.singleRide.distanceTiers || [];
  for (const tier of tiers) {
    if (tier.maxDistanceKm === null || safeDistance <= Number(tier.maxDistanceKm || 0)) return tier;
  }
  return tiers[tiers.length - 1] || { price: matrix.singleRide.basePrice, peakMultiplier: 1 };
};

const estimateSingleRide = (distance, matrix) => Number(resolveTierForDistance(distance, matrix)?.price || matrix.singleRide.basePrice || 0);
const estimatePeakRide = (distance, matrix) => {
  const tier = resolveTierForDistance(distance, matrix);
  return Math.round(Number(tier?.price || matrix.singleRide.basePrice || 0) * Number(tier?.peakMultiplier || 1));
};

const FareMatrix = () => {
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState('DEFAULT');
  const [matrix, setMatrix] = useState(createEmptyMatrix());
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState({ activeRoutes: 0, averageMonthlyFare: 0, activePasses: 0, pendingApprovals: 0, averageSingleRideFare: 0 });
  const [recommendation, setRecommendation] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityCategoriesInput, setPriorityCategoriesInput] = useState('disabled, war veteran');

  const applyPayload = useCallback((payload) => {
    const nextMatrix = mergeMatrix(payload.matrix || {});
    setMatrix(nextMatrix);
    setSource(payload.source || 'DEFAULT');
    setStats(payload.stats || { activeRoutes: 0, averageMonthlyFare: 0, activePasses: 0, pendingApprovals: 0, averageSingleRideFare: 0 });
    setRecommendation(payload.recommendation || null);
    setPriorityCategoriesInput((nextMatrix.freeRideRules.priorityCategories || []).join(', '));
    setRoutes(
      Array.isArray(payload.routes)
        ? payload.routes.map((route) => ({
            ...route,
            _editMonthlyPassPrice: Number(route.monthlyPassPrice || 0)
          }))
        : []
    );
  }, []);

  const fetchFareMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/fare-matrix');
      if (res.data.ok) applyPayload(res.data);
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to load fare configuration.', 'Error');
    } finally {
      setLoading(false);
    }
  }, [applyPayload, showAlert]);

  useEffect(() => {
    fetchFareMatrix();
  }, [fetchFareMatrix]);

  const setTierValue = (index, field, rawValue) => {
    setMatrix((current) => ({
      ...current,
      singleRide: {
        ...current.singleRide,
        distanceTiers: current.singleRide.distanceTiers.map((tier, tierIndex) => {
          if (tierIndex !== index) return tier;
          if (field === 'maxDistanceKm') {
            return {
              ...tier,
              maxDistanceKm: rawValue === '' ? null : Number(rawValue)
            };
          }
          return {
            ...tier,
            [field]: Number(rawValue)
          };
        })
      }
    }));
  };

  const addTier = () => {
    setMatrix((current) => {
      const tiers = current.singleRide.distanceTiers || [];
      const lastFinite = [...tiers].reverse().find((tier) => tier.maxDistanceKm !== null);
      const minDistanceKm = lastFinite ? Number((Number(lastFinite.maxDistanceKm || 0) + 0.1).toFixed(1)) : 0;
      const maxDistanceKm = Number((minDistanceKm + 5).toFixed(1));
      return {
        ...current,
        singleRide: {
          ...current.singleRide,
          distanceTiers: [...tiers, { minDistanceKm, maxDistanceKm, price: current.singleRide.basePrice || 0, peakMultiplier: 1 }]
        }
      };
    });
  };

  const removeTier = (index) => {
    setMatrix((current) => {
      if (current.singleRide.distanceTiers.length <= 1) return current;
      return {
        ...current,
        singleRide: {
          ...current.singleRide,
          distanceTiers: current.singleRide.distanceTiers.filter((_, tierIndex) => tierIndex !== index)
        }
      };
    });
  };

  const setMonthlyField = (field, value) => {
    setMatrix((current) => ({
      ...current,
      monthly: {
        ...current.monthly,
        [field]: Number(value)
      }
    }));
  };

  const setPriorityField = (field, value) => {
    setMatrix((current) => ({
      ...current,
      priorityDiscounts: {
        ...current.priorityDiscounts,
        [field]: Number(value)
      }
    }));
  };

  const setFreeRideField = (field, value) => {
    setMatrix((current) => ({
      ...current,
      freeRideRules: {
        ...current.freeRideRules,
        [field]: value
      }
    }));
  };

  const setRouteMonthlyPrice = (routeId, value) => {
    setRoutes((current) => current.map((route) => (
      route._id === routeId ? { ...route, _editMonthlyPassPrice: Number(value) } : route
    )));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        singleRide: matrix.singleRide,
        monthly: {
          ...matrix.monthly,
          singleRouteDefaultPrice: matrix.monthly.standardAdultPrice
        },
        priorityDiscounts: matrix.priorityDiscounts,
        freeRideRules: {
          ...matrix.freeRideRules,
          priorityCategories: priorityCategoriesInput.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
        },
        routeMonthlyOverrides: routes.map((route) => ({
          routeId: route._id,
          monthlyPassPrice: Number(route._editMonthlyPassPrice || 0)
        }))
      };

      const res = await api.put('/api/admin/fare-matrix', payload);
      if (res.data.ok) {
        applyPayload(res.data);
        showAlert(res.data.message || 'Fare configuration saved successfully.', 'Success');
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save fare configuration.', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: 'Active routes', value: stats.activeRoutes, accent: 'border-emerald-300', icon: <FaRoute className="text-emerald-600" /> },
    { label: 'Avg. monthly fare', value: formatMoney(stats.averageMonthlyFare), accent: 'border-teal-300', icon: <FaMoneyBillWave className="text-teal-600" /> },
    { label: 'Active passes', value: stats.activePasses, accent: 'border-sky-300', icon: <FaTicketAlt className="text-sky-600" /> },
    { label: 'Pending approvals', value: stats.pendingApprovals, accent: 'border-amber-300', icon: <FaUsers className="text-amber-600" /> }
  ];

  const monthlyFields = [
    { key: 'standardAdultPrice', label: 'Standard Adult Pass', note: 'Base single-route monthly pass' },
    { key: 'studentSeniorPrice', label: 'Student / Senior Pass', note: 'Reduced verified pass price' },
    { key: 'employerSubsidizedPrice', label: 'Employer Subsidized', note: 'Partner-sponsored commute plan' },
    { key: 'touristWeekPrice', label: 'Tourist / Week Pass', note: 'Short-term travel bundle' },
    { key: 'interRoutePrice', label: 'Inter-route Network Pass', note: 'Network-wide monthly access' }
  ];

  const priorityFields = [
    { key: 'defaultPercent', label: 'Default' },
    { key: 'studentPercent', label: 'Student' },
    { key: 'warVeteranPercent', label: 'War Veteran' },
    { key: 'disabledPercent', label: 'Disabled' },
    { key: 'elderlyPercent', label: 'Elderly' },
    { key: 'otherPercent', label: 'Other' }
  ];

  const filteredRoutes = routes.filter((route) => {
    const matchedSearch = `${route.routeNumber} ${route.name}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchedStatus = statusFilter === 'ALL' || route.status === statusFilter;
    return matchedSearch && matchedStatus;
  });

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-white/70 bg-white p-10 text-center text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        Loading fare configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 text-slate-900">
      <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#ffffff_0%,#f1faf6_65%,#e8f5ef_100%)] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">
              Fare Strategy Matrix
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Fare Configuration</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              Configure distance-based pricing, monthly passes, free-fare eligibility, and route-level fare overrides from a single admin surface.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white">
              Source: {source}
            </span>
            <button onClick={fetchFareMatrix} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700">
              <FiRefreshCw /> Refresh
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#072f28] px-5 py-3 font-bold text-white shadow-[0_20px_40px_rgba(7,47,40,0.18)] disabled:opacity-60">
              <FaSave /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-[1.6rem] border ${card.accent} bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              {card.icon}
            </div>
            <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="space-y-8">
          <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-black text-slate-950"><FaRoute className="text-emerald-600" /> Distance-based Fares</h2>
                <p className="mt-2 text-sm text-slate-500">Edit distance ranges, base rates, and peak multipliers used by fare estimation previews.</p>
              </div>
              <button onClick={addTier} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-700">
                <FaPlus /> Add Tier
              </button>
            </div>

            <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                    <th className="px-5 py-4">Start (km)</th>
                    <th className="px-5 py-4">End (km)</th>
                    <th className="px-5 py-4">Base Rate</th>
                    <th className="px-5 py-4">Peak Multiplier</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {matrix.singleRide.distanceTiers.map((tier, index) => (
                    <tr key={`${index}-${tier.minDistanceKm}-${tier.maxDistanceKm ?? 'INF'}`} className="text-sm text-slate-700">
                      <td className="px-5 py-4"><input type="number" min="0" step="0.1" value={tier.minDistanceKm} onChange={(event) => setTierValue(index, 'minDistanceKm', event.target.value)} className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none" /></td>
                      <td className="px-5 py-4"><input type="number" min="0" step="0.1" value={tier.maxDistanceKm ?? ''} placeholder="INF" onChange={(event) => setTierValue(index, 'maxDistanceKm', event.target.value)} className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none" /></td>
                      <td className="px-5 py-4"><input type="number" min="0" step="500" value={tier.price} onChange={(event) => setTierValue(index, 'price', event.target.value)} className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none" /></td>
                      <td className="px-5 py-4"><input type="number" min="0.5" max="10" step="0.05" value={tier.peakMultiplier} onChange={(event) => setTierValue(index, 'peakMultiplier', event.target.value)} className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none" /></td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => removeTier(index)} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 font-bold text-rose-600">
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h2 className="flex items-center gap-3 text-2xl font-black text-slate-950"><FaMoneyBillWave className="text-emerald-600" /> Monthly Pass Pricing</h2>
            <p className="mt-2 text-sm text-slate-500">Strategic monthly pricing buckets used for route defaults, network passes, and pricing previews.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {monthlyFields.map((field) => (
                <label key={field.key} className="rounded-[1.4rem] border border-slate-100 bg-slate-50/80 p-4">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{field.label}</span>
                  <div className="mt-3 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <FaDollarSign className="text-slate-400" />
                    <input type="number" min="0" step="1000" value={matrix.monthly[field.key]} onChange={(event) => setMonthlyField(field.key, event.target.value)} className="w-full bg-transparent px-3 text-base font-bold text-slate-900 outline-none" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{field.note}</p>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h2 className="flex items-center gap-3 text-2xl font-black text-slate-950"><FaPercent className="text-emerald-600" /> Priority Discounts</h2>
            <p className="mt-2 text-sm text-slate-500">These percentages feed the existing monthly pass and fare-discount logic for verified priority riders.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {priorityFields.map((field) => (
                <label key={field.key} className="rounded-[1.4rem] border border-slate-100 bg-slate-50/80 p-4">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{field.label}</span>
                  <div className="mt-3 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <FaPercent className="text-slate-400" />
                    <input type="number" min="0" max="100" value={matrix.priorityDiscounts[field.key]} onChange={(event) => setPriorityField(field.key, event.target.value)} className="w-full bg-transparent px-3 text-base font-bold text-slate-900 outline-none" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatPercent(matrix.priorityDiscounts[field.key])}</p>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="overflow-hidden rounded-[2rem] bg-[#072f28] p-7 text-white shadow-[0_30px_70px_rgba(7,47,40,0.26)]">
            <div className="relative z-10">
              <h2 className="text-3xl font-black tracking-tight">Free Fare Rules</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-emerald-50/75">Control who rides free by age and accessibility category, then attach a note for the operations team.</p>

              <div className="mt-8 space-y-6">
                <div className="flex items-center justify-between rounded-[1.4rem] bg-white/8 p-4">
                  <div>
                    <p className="text-lg font-bold text-white"><FaChild className="mr-2 inline text-emerald-300" /> Underage Children</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/65">Free under age</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" max="18" value={matrix.freeRideRules.underAge} onChange={(event) => setFreeRideField('underAge', Number(event.target.value))} className="w-20 rounded-xl bg-[#001a0f] px-3 py-2 text-center text-lg font-black text-white outline-none" />
                    <input type="checkbox" checked={matrix.freeRideRules.underAgeEnabled} onChange={(event) => setFreeRideField('underAgeEnabled', event.target.checked)} className="h-5 w-5 rounded border-white/20 bg-white/10 text-emerald-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[1.4rem] bg-white/8 p-4">
                  <div>
                    <p className="text-lg font-bold text-white"><FaClock className="mr-2 inline text-emerald-300" /> Senior Citizens</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/65">Free from age</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" max="120" value={matrix.freeRideRules.overAge} onChange={(event) => setFreeRideField('overAge', Number(event.target.value))} className="w-20 rounded-xl bg-[#001a0f] px-3 py-2 text-center text-lg font-black text-white outline-none" />
                    <input type="checkbox" checked={matrix.freeRideRules.overAgeEnabled} onChange={(event) => setFreeRideField('overAgeEnabled', event.target.checked)} className="h-5 w-5 rounded border-white/20 bg-white/10 text-emerald-400" />
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white"><FaWheelchair className="mr-2 inline text-emerald-300" /> Accessibility Pass</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-emerald-100/65">Waive fares for verified accessibility riders</p>
                    </div>
                    <input type="checkbox" checked={matrix.freeRideRules.accessibilityEnabled} onChange={(event) => setFreeRideField('accessibilityEnabled', event.target.checked)} className="h-5 w-5 rounded border-white/20 bg-white/10 text-emerald-400" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input value={matrix.freeRideRules.accessibilityCategory} onChange={(event) => setFreeRideField('accessibilityCategory', event.target.value)} placeholder="disabled" className="rounded-xl bg-[#001a0f] px-4 py-3 text-sm text-white outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={matrix.freeRideRules.accessibilityStartHour} onChange={(event) => setFreeRideField('accessibilityStartHour', event.target.value)} type="time" className="rounded-xl bg-[#001a0f] px-4 py-3 text-sm text-white outline-none" />
                      <input value={matrix.freeRideRules.accessibilityEndHour} onChange={(event) => setFreeRideField('accessibilityEndHour', event.target.value)} type="time" className="rounded-xl bg-[#001a0f] px-4 py-3 text-sm text-white outline-none" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.4rem] bg-white/8 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-100/65">Extra Free Categories</p>
                  <input value={priorityCategoriesInput} onChange={(event) => setPriorityCategoriesInput(event.target.value)} placeholder="disabled, war veteran" className="mt-3 w-full rounded-xl bg-[#001a0f] px-4 py-3 text-sm text-white outline-none" />
                  <textarea value={matrix.freeRideRules.note} onChange={(event) => setFreeRideField('note', event.target.value)} rows={4} className="mt-3 w-full rounded-xl bg-[#001a0f] px-4 py-3 text-sm text-white outline-none" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="flex items-center gap-3 text-2xl font-black text-slate-950"><FaShieldAlt className="text-emerald-600" /> Pricing Insight</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Avg. single ride preview is currently <span className="font-bold text-slate-900">{formatMoney(stats.averageSingleRideFare)}</span>. Keep route-specific overrides aligned with your default strategy so customer pricing stays predictable.
            </p>
            {recommendation ? (
              <div className="mt-5 rounded-[1.4rem] border-l-4 border-emerald-500 bg-emerald-50 px-5 py-4">
                <p className="text-sm font-black text-slate-950">{recommendation.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{recommendation.message}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Route Pricing Preview</h2>
            <p className="mt-2 text-sm text-slate-500">Preview how each route inherits the current pricing strategy and adjust route-specific monthly fares before saving.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <FaSearch className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search route..." className="w-52 bg-transparent px-3 text-sm text-slate-700 outline-none" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none">
              <option value="ALL">All statuses</option>
              {Object.keys(STATUS_STYLES).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                <th className="px-6 py-4">Route</th>
                <th className="px-5 py-4">Monthly Fare</th>
                <th className="px-5 py-4">Effective Fare</th>
                <th className="px-5 py-4">Single Trip</th>
                <th className="px-5 py-4">Peak Trip</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-500">No routes match the current filters.</td>
                </tr>
              ) : (
                filteredRoutes.map((route) => {
                  const effectiveMonthlyPrice = Number(route._editMonthlyPassPrice || 0) > 0
                    ? Number(route._editMonthlyPassPrice || 0)
                    : Number(matrix.monthly.singleRouteDefaultPrice || matrix.monthly.standardAdultPrice || 0);
                  const singleRideFare = estimateSingleRide(route.distance, matrix);
                  const peakRideFare = estimatePeakRide(route.distance, matrix);

                  return (
                    <tr key={route._id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><FaBus /></div>
                          <div>
                            <p className="font-black text-slate-900">{route.routeNumber}</p>
                            <p className="mt-1 text-sm text-slate-500">{route.name} · {Number(route.distance || 0).toLocaleString('vi-VN')} km</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <input type="number" min="0" step="1000" value={route._editMonthlyPassPrice} onChange={(event) => setRouteMonthlyPrice(route._id, event.target.value)} className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 outline-none" />
                      </td>
                      <td className="px-5 py-5 font-black text-emerald-700">{formatMoney(effectiveMonthlyPrice)}</td>
                      <td className="px-5 py-5 font-semibold text-slate-700">{formatMoney(singleRideFare)}</td>
                      <td className="px-5 py-5 font-semibold text-slate-700">{formatMoney(peakRideFare)}</td>
                      <td className="px-5 py-5">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[route.status] || 'bg-slate-100 text-slate-600'}`}>
                          {route.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FareMatrix;
