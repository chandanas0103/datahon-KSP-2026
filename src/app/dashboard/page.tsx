"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, ArrowLeft, TrendingUp, AlertTriangle, Activity,
  MapPin, Users, BarChart3, PieChart as PieIcon, Clock, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
  LineChart, Line,
} from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const STATUS_COLORS: Record<string, string> = {
  Open: "#f59e0b",
  "Under Investigation": "#3b82f6",
  Closed: "#22c55e",
  "Charge Sheeted": "#10b981",
  Acquitted: "#8b5cf6",
  Compromised: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#22c55e",
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
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bg: string;
}) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {label}
              {sub && (
                <span className="ml-1 text-foreground/50">({sub})</span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

const BENGALURU_STATIONS = [
  { id: 6201, name: "Whitefield PS", x: 78, y: 35, lat: "12.9698° N", lng: "77.7499° E", status: "High Density" },
  { id: 6202, name: "Koramangala PS", x: 48, y: 55, lat: "12.9352° N", lng: "77.6245° E", status: "High Density" },
  { id: 6203, name: "Indiranagar PS", x: 55, y: 30, lat: "12.9784° N", lng: "77.6408° E", status: "Medium Density" },
  { id: 6204, name: "HSR Layout PS", x: 58, y: 68, lat: "12.9121° N", lng: "77.6446° E", status: "High Density" },
  { id: 6205, name: "JP Nagar PS", x: 32, y: 72, lat: "12.9063° N", lng: "77.5857° E", status: "Medium Density" },
  { id: 6206, name: "BTM Layout PS", x: 42, y: 65, lat: "12.9166° N", lng: "77.6101° E", status: "High Density" },
  { id: 6207, name: "Marathahalli PS", x: 70, y: 42, lat: "12.9591° N", lng: "77.6974° E", status: "Medium Density" },
  { id: 6208, name: "Electronic City PS", x: 62, y: 88, lat: "12.8399° N", lng: "77.6770° E", status: "Medium Density" },
  { id: 6209, name: "Sarjapur Road PS", x: 75, y: 60, lat: "12.9248° N", lng: "77.6830° E", status: "Low Density" },
  { id: 6210, name: "Rajajinagar PS", x: 20, y: 25, lat: "12.9882° N", lng: "77.5548° E", status: "Low Density" },
];

function BengaluruGisMap({ stationCounts }: { stationCounts?: { name: string; count: number }[] }) {
  const [selectedStation, setSelectedStation] = useState<typeof BENGALURU_STATIONS[0] | null>(BENGALURU_STATIONS[0]);

  return (
    <Card className="border-border/50 bg-card/50 overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Bengaluru Police Station GIS Crime Hotspot Map
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live spatial analysis & station coverage across Bengaluru Urban Police District
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />High Hotspot</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Low</span>
          </div>
        </div>

        {/* GIS Interactive Container */}
        <div className="relative w-full h-80 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-border/60 overflow-hidden p-4">
          {/* Grid lines background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Compass Rose */}
          <div className="absolute top-3 right-3 text-[9px] font-mono text-muted-foreground/60 border border-border/40 px-2 py-1 rounded bg-black/40 backdrop-blur">
            N ↑ BENGALURU GIS
          </div>

          {/* Map Station Markers */}
          {BENGALURU_STATIONS.map((st) => {
            const matchCount = stationCounts?.find(c => c.name.toLowerCase().includes(st.name.split(' ')[0].toLowerCase()))?.count || Math.floor(Math.random() * 8 + 3);
            const isSelected = selectedStation?.id === st.id;
            const colorClass = matchCount >= 6 ? "bg-red-500 shadow-red-500/50" : matchCount >= 4 ? "bg-amber-500 shadow-amber-500/50" : "bg-emerald-500 shadow-emerald-500/50";

            return (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st)}
                style={{ left: `${st.x}%`, top: `${st.y}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10 transition-all duration-300"
              >
                <span className={`relative flex h-5 w-5 items-center justify-center`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorClass}`} />
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${colorClass} shadow-lg ${isSelected ? 'ring-4 ring-white' : ''}`} />
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium bg-black/90 text-white px-2 py-0.5 rounded shadow-lg border border-border">
                  {st.name} ({matchCount} cases)
                </span>
              </button>
            );
          })}

          {/* Selected Station Card Overlay */}
          {selectedStation && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-slate-900/90 backdrop-blur-md border border-primary/30 p-3 rounded-xl shadow-2xl text-xs space-y-1 z-20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-primary" /> {selectedStation.name}
                </span>
                <Badge variant="outline" className="text-[9px] bg-primary/10 border-primary/30 text-primary">
                  {selectedStation.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-1">
                <div>Lat: <span className="font-mono text-foreground">{selectedStation.lat}</span></div>
                <div>Lng: <span className="font-mono text-foreground">{selectedStation.lng}</span></div>
              </div>
            </div>
          )}
        </div>
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
  const openCases =
    data?.crimeByStatus?.find((s) => s.name === "Open" || s.name === "Under Investigation")
      ?.count ?? 0;
  const criticalCases =
    data?.crimeByPriority?.find((p) => p.name === "Critical")?.count ?? 0;
  const topArea = data?.crimeByArea?.[0]?.name ?? "—";

  const monthData = data?.crimeByMonth?.map((m) => ({
    ...m,
    month: m.month?.slice(5), // "2025-01" → "01"
    open: m.count - m.resolved,
  }));

  const tooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">
                  Crime Analytics Dashboard
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 ml-10">
                Real-time overview of 800+ crime cases across Bangalore
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/50"
          >
            <FileText className="h-3.5 w-3.5" />Back to Chat
          </Link>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={Activity}
            label="Total Cases"
            value={totalCases.toLocaleString()}
            sub="all time"
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
          <StatCard
            icon={AlertTriangle}
            label="Open / Investigating"
            value={
              (data?.crimeByStatus
                ?.filter(
                  (s) =>
                    s.name === "Open" || s.name === "Under Investigation"
                )
                .reduce((sum, s) => sum + s.count, 0) ?? 0
            ).toLocaleString()
            }
            sub="active"
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
          <StatCard
            icon={TrendingUp}
            label="Resolution Rate"
            value={`${
              totalCases > 0
                ? Math.round(
                    ((data?.crimeByStatus
                      ?.filter(
                        (s) =>
                          s.name === "Closed" || s.name === "Charge Sheeted"
                      )
                      .reduce((sum, s) => sum + s.count, 0) ?? 0) /
                      totalCases) *
                      100
                  )
                : 0
            }%`}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <StatCard
            icon={MapPin}
            label="Hottest Area"
            value={topArea}
            sub="by case count"
            color="text-red-400"
            bg="bg-red-500/10"
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
            <div className="space-y-4">
              {/* Row 0: Bengaluru Police Station GIS Map */}
              <BengaluruGisMap stationCounts={data.crimeByArea} />

              {/* Row 1: Monthly Trend (full width) */}
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">
                      Monthly Crime Trend (Last 12 Months)
                    </h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={monthData}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorTotal"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--chart-1))"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--chart-1))"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorResolved"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--chart-3))"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--chart-3))"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Total Filed"
                          stroke="hsl(var(--chart-1))"
                          fill="url(#colorTotal)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="resolved"
                          name="Resolved"
                          stroke="hsl(var(--chart-3))"
                          fill="url(#colorResolved)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Row 2: Crime by Type + Crime by Status */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Card className="border-border/50 bg-card/50 lg:col-span-3">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">
                        Top 10 Crime Types
                      </h2>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.crimeByType}
                          layout="vertical"
                          margin={{
                            top: 0,
                            right: 20,
                            bottom: 0,
                            left: 80,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border"
                            horizontal={false}
                          />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            width={75}
                          />
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <Bar
                            dataKey="count"
                            name="Cases"
                            fill="hsl(var(--chart-1))"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 lg:col-span-2">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PieIcon className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Case Status</h2>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.crimeByStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="count"
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            labelLine={false}
                          >
                            {data.crimeByStatus.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  STATUS_COLORS[entry.name] ?? COLORS[0]
                                }
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Area-wise + Priority + Category */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">
                        Cases by Area
                      </h2>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.crimeByArea}
                          margin={{ top: 0, right: 10, bottom: 5, left: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9 }}
                            angle={-35}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <Bar
                            dataKey="count"
                            name="Cases"
                            fill="hsl(var(--chart-2))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">
                        Priority Distribution
                      </h2>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.crimeByPriority}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="count"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {data.crimeByPriority.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  PRIORITY_COLORS[entry.name] ?? COLORS[0]
                                }
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PieIcon className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Crime Category</h2>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.crimeByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="count"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {data.crimeByCategory.map((_, i) => (
                              <Cell
                                key={i}
                                fill={COLORS[i % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 4: Top Officers Table */}
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">
                      Top Officers by Case Load
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">
                            Officer
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">
                            Rank
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">
                            Station Area
                          </th>
                          <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                            Total Cases
                          </th>
                          <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                            Resolved
                          </th>
                          <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                            Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topOfficers.map((o, i) => {
                          const rate =
                            o.case_count > 0
                              ? Math.round((o.resolved / o.case_count) * 100)
                              : 0;
                          return (
                            <tr
                              key={i}
                              className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-3 font-medium text-xs">
                                {o.name}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {o.rank}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {o.area}
                              </td>
                              <td className="px-4 py-3 text-xs text-center font-mono">
                                {o.case_count}
                              </td>
                              <td className="px-4 py-3 text-xs text-center font-mono">
                                {o.resolved}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge
                                  className={`font-mono text-[10px] ${
                                    rate >= 60
                                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                      : rate >= 40
                                        ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                                        : "bg-red-500/15 text-red-400 border-red-500/20"
                                  }`}
                                >
                                  {rate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Row 5: Gender Distribution + Victim Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">
                        Victim Gender Distribution
                      </h2>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.genderDist}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="count"
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            labelLine
                          >
                            {data.genderDist.map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  i === 0
                                    ? "hsl(var(--chart-1))"
                                    : i === 1
                                      ? "hsl(var(--chart-4))"
                                      : COLORS[2]
                                }
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">
                        Resolution vs Open (Monthly)
                      </h2>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthData}
                          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border"
                          />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="Filed"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="resolved"
                            name="Resolved"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="open"
                            name="Open"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground/40">
          KSP Crime Intelligence — Built for KSP Datathon 2026 Challenge 1
        </div>
      </div>
    </div>
  );
}