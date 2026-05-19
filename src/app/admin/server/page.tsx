"use client";

import useSWR from "swr";
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  Globe, 
  Clock, 
  Power 
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  
  return parts.length > 0 ? parts.join(" ") : "< 1m";
}

function ProgressBar({ value, max, label, color = "bg-green-500", suffix = "%" }: { value: number, max: number, label: string, color?: string, suffix?: string }) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="w-full bg-[var(--muted)] rounded-full h-1.5 mb-1 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }}></div>
      </div>
      <div className="text-[10px] text-[var(--muted-foreground)]">
        {percentage.toFixed(2)}{suffix} used
      </div>
    </div>
  );
}

export default function ServerSpecsPage() {
  // Poll every 3 seconds
  const { data, error, isLoading } = useSWR("/api/admin/server", fetcher, { 
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });

  const stats = data?.stats;

  return (
    <div className="p-5 md:p-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Server size={24} className="text-[var(--primary-light)]" />
            <h1 className="text-2xl font-bold">Server Specs</h1>
            {stats && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Online
              </span>
            )}
          </div>
          <p className="text-[var(--muted-foreground)] ml-9">
            Real-time VPS resources and specifications
          </p>
        </div>
      </div>

      {isLoading && !stats ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Connecting to server...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 border-red-500/20 bg-red-500/5 text-center">
          <Activity size={32} className="mx-auto text-red-400 mb-3" />
          <h3 className="text-lg font-semibold text-red-400">Connection Failed</h3>
          <p className="text-[var(--muted-foreground)] mt-2">Could not retrieve server specifications. Ensure you are an admin.</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Main Resource View mimicking the screenshot */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--accent)]/50">
              <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-[var(--primary-light)]" />
                Resource View
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-center">
                
                {/* Server Info */}
                <div className="lg:col-span-1 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                    <Server size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">MailVerifyPro</h3>
                    <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[120px]">
                      {stats.os.distro} {stats.os.release}
                    </p>
                  </div>
                </div>

                {/* Network */}
                <div className="lg:col-span-1">
                   <ProgressBar 
                     value={stats.network.tx_bytes} 
                     max={stats.network.tx_bytes + stats.network.rx_bytes || 1} 
                     label="Network (TX/Total)" 
                     color="bg-sky-500" 
                     suffix="% TX"
                   />
                   <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                     {formatBytes(stats.network.tx_bytes)} / {formatBytes(stats.network.rx_bytes)} RX
                   </p>
                </div>

                {/* Disk */}
                <div className="lg:col-span-1">
                   <ProgressBar 
                     value={stats.disk.used} 
                     max={stats.disk.total} 
                     label="Disk" 
                     color="bg-amber-500" 
                   />
                   <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                     {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
                   </p>
                </div>

                {/* Memory */}
                <div className="lg:col-span-1">
                   <ProgressBar 
                     value={stats.memory.used} 
                     max={stats.memory.total} 
                     label="Memory" 
                     color="bg-green-500" 
                   />
                   <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                     {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
                   </p>
                </div>

                {/* CPU */}
                <div className="lg:col-span-1">
                   <ProgressBar 
                     value={stats.cpu.load} 
                     max={100} 
                     label="CPU" 
                     color="bg-purple-500" 
                   />
                   <p className="text-[10px] text-[var(--muted-foreground)] mt-1 truncate">
                     {stats.cpu.cores} Cores @ {stats.cpu.speed}GHz
                   </p>
                </div>

                {/* Status */}
                <div className="lg:col-span-1 flex flex-col items-end justify-center">
                  <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Status</span>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Power size={18} className="text-emerald-500" />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Detailed Specs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="glass-card p-5 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <Globe size={20} />
                </div>
                <h3 className="font-semibold">System OS</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Platform</span>
                  <span className="font-medium capitalize">{stats.os.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Distro</span>
                  <span className="font-medium">{stats.os.distro}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Release</span>
                  <span className="font-medium">{stats.os.release}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Hostname</span>
                  <span className="font-medium">{stats.os.hostname}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Cpu size={20} />
                </div>
                <h3 className="font-semibold">Processor</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Brand</span>
                  <span className="font-medium truncate max-w-[120px]" title={stats.cpu.brand}>{stats.cpu.brand || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Cores</span>
                  <span className="font-medium">{stats.cpu.cores} Cores</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Speed</span>
                  <span className="font-medium">{stats.cpu.speed} GHz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Current Load</span>
                  <span className="font-medium text-purple-400">{stats.cpu.load.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Activity size={20} />
                </div>
                <h3 className="font-semibold">Memory (RAM)</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Total</span>
                  <span className="font-medium">{formatBytes(stats.memory.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Used</span>
                  <span className="font-medium text-emerald-400">{formatBytes(stats.memory.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Free</span>
                  <span className="font-medium">{formatBytes(stats.memory.free)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Active</span>
                  <span className="font-medium">{formatBytes(stats.memory.active)}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <HardDrive size={20} />
                </div>
                <h3 className="font-semibold">Storage & Uptime</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Filesystem</span>
                  <span className="font-medium">{stats.disk.fs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Total Disk</span>
                  <span className="font-medium">{formatBytes(stats.disk.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Used Disk</span>
                  <span className="font-medium text-amber-400">{stats.disk.use.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><Clock size={14}/> Uptime</span>
                  <span className="font-medium text-[var(--primary-light)]">{formatUptime(stats.os.uptime)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
