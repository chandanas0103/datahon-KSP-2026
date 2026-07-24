"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, ArrowLeft, TrendingUp, AlertTriangle, Activity,
  MapPin, Users, BarChart3, PieChart as PieIcon, Clock, FileText,
  Flame, Award, CheckCircle2, ChevronRight, Filter, RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

const COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f97316", "#06b6d4", "#a855f7", "#64748b"
];

const STATUS_COLORS: Record<string, string> = {
  Open: "#f59e0b",
  "Under Investigation": "#3b82f6",
  Closed: "#22c55e",
  "Charge Sheeted": "#10b981",
  Acquitted: "#8b5cf6",
  Compromised: "#6b7280",
};

interface Analytics {
  crimeByType: { name: string; count: number }[];
  crimeByStatus: { name: string; count: number }[];
  crimeByPriority: { name: string; count: number }[];
  crimeByArea: { name: string; count: number }[];
  crimeByMonth: { month: string; count: number; resolved: number }[];
  crimeByCategory: { name: string; count: number }[];
  topOfficers: { name: string; rank: string; area: string; case_count: number; resolved: number }[];
  genderDist: { name: string; count: number }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bg: string;
  trend?: string;
}) {
  return (
    <Card className="glass-card glass-card-hover border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{value}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                {label} {sub && <span className="text-slate-500 font-normal">({sub})</span>}
              </p>
            </div>
          </div>
          {trend && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] gap-1 px-2 py-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="glass-card border border-white/10">
      <CardContent className="p-5">
        <Skeleton className="h-5 w-40 mb-4 bg-slate-800" />
        <Skeleton className="h-56 w-full rounded-lg bg-slate-800/60" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalCases = data?.crimeByType?.reduce((s, c) => s + c.count, 0) ?? 0;
  const topArea = data?.crimeByArea?.[0]?.name ?? "Indiranagar";

  const monthData = data?.crimeByMonth?.map((m) => ({
    ...m,
    month: m.month?.slice(5),
    open: m.count - m.resolved,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-lg border border-amber-500/30 text-xs shadow-xl">
          <p className="font-semibold text-amber-400 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}: <span className="font-bold text-white">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 pb-12">
      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 sm:p-6 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BarChart3 className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  KSP Executive Crime Analytics
                </h1>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-2 py-0.5">
                  LIVE TELEMETRY
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Karnataka State Police Datathon 2026 • Real-time FIR intelligence overview across 10 stations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 shadow-md"
            >
              <ArrowLeft className="h-4 w-4" /> Return to AI Intelligence Hub
            </Link>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="Total Crime Cases"
            value={totalCases.toLocaleString()}
            sub="2-Year FIR Records"
            color="text-amber-400"
            bg="bg-amber-500/10"
            trend="+14% this month"
          />
          <StatCard
            icon={AlertTriangle}
            label="Active Investigations"
            value={(
              data?.crimeByStatus
                ?.filter((s) => s.name === "Open" || s.name === "Under Investigation")
                .reduce((sum, s) => sum + s.count, 0) ?? 0
            ).toLocaleString()}
            sub="Open Cases"
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
          <StatCard
            icon={TrendingUp}
            label="Resolution Clearance Rate"
            value={`${
              totalCases > 0
                ? Math.round(
                    ((data?.crimeByStatus
                      ?.filter((s) => s.name === "Closed" || s.name === "Charge Sheeted")
                      .reduce((sum, s) => sum + s.count, 0) ?? 0) /
                      totalCases) * 100
                  )
                : 0
            }%`}
            sub="Closed / Charge Sheeted"
            color="text-emerald-400"
            bg="bg-emerald-500/10"
            trend="High Efficiency"
          />
          <StatCard
            icon={Flame}
            label="Highest Crime Area"
            value={topArea}
            sub="Bangalore Division"
            color="text-rose-400"
            bg="bg-rose-500/10"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : (
          data && (
            <div className="space-y-6">
              {/* Row 1: Monthly Trend Area Chart */}
              <Card className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Monthly Crime Incident & Resolution Trend</h2>
                        <p className="text-xs text-slate-400">Comparing total reported FIR cases vs resolved cases over 12 months</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="count" name="Total FIRs" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                        <Area type="monotone" dataKey="resolved" name="Resolved Cases" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Row 2: Bangalore Police Stations Hotspots Map Visualizer */}
              <Card className="glass-card border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Bangalore Police Station Division Hotspots</h2>
                    <p className="text-xs text-slate-400">Case volume density across 10 major Bangalore urban police stations</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {data.crimeByArea.map((station, idx) => {
                    const maxCount = Math.max(...data.crimeByArea.map(a => a.count));
                    const percentage = Math.round((station.count / maxCount) * 100);
                    const isHot = percentage > 80;
                    return (
                      <div key={station.name} className="glass-card p-3.5 rounded-xl border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-white truncate">{station.name}</span>
                            {isHot && (
                              <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[9px] px-1 py-0">
                                HOTSPOT
                              </Badge>
                            )}
                          </div>
                          <p className="text-xl font-extrabold text-amber-400">{station.count} <span className="text-[10px] font-normal text-slate-400">cases</span></p>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isHot ? "bg-gradient-to-r from-amber-500 to-rose-500" : "bg-gradient-to-r from-amber-500 to-emerald-500"}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 text-right mt-1">{percentage}% of max</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Row 3: Crime Breakdown & Status Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Crime Types Bar Chart */}
                <Card className="glass-card border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2.5 mb-6">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Top Crime Offense Categories</h2>
                      <p className="text-xs text-slate-400">Most frequent crime types reported in FIR records</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.crimeByType.slice(0, 7)} layout="vertical" margin={{ left: 30, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Case Count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Case Status Donut Chart */}
                <Card className="glass-card border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2.5 mb-6">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <PieIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Case Status Distribution</h2>
                      <p className="text-xs text-slate-400">Breakdown by current investigation stage</p>
                    </div>
                  </div>
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.crimeByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="count"
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        >
                          {data.crimeByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Row 4: Top Investigating Officers Leaderboard */}
              <Card className="glass-card border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Top Investigating Officers</h2>
                      <p className="text-xs text-slate-400">Officers leading case resolution and active investigations</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                    10 Featured Officers
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 bg-white/5">
                        <th className="px-4 py-3 font-semibold">Officer Name</th>
                        <th className="px-4 py-3 font-semibold">Rank</th>
                        <th className="px-4 py-3 font-semibold">Station Area</th>
                        <th className="px-4 py-3 font-semibold text-center">Assigned Cases</th>
                        <th className="px-4 py-3 font-semibold text-center">Resolved</th>
                        <th className="px-4 py-3 font-semibold">Clearance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.topOfficers.map((officer, i) => {
                        const rate = Math.round((officer.resolved / officer.case_count) * 100);
                        return (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-white flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-amber-400 font-bold border border-amber-500/20">
                                {i + 1}
                              </span>
                              {officer.name}
                            </td>
                            <td className="px-4 py-3.5 text-slate-300">
                              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-normal">
                                {officer.rank}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-slate-300">{officer.area}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-amber-400">{officer.case_count}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-emerald-400">{officer.resolved}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )
        )}
      </div>
    </div>
  );
}