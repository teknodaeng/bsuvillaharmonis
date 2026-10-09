import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Sparkles,
  Calendar,
  Search,
  Tag,
  ChevronDown,
  ChevronUp,
  Clock,
  Receipt,
  Scale,
  ShieldCheck,
  Layers,
  Cpu,
  FileSpreadsheet,
  Database,
  Code,
  Key,
  Package,
  ArrowLeft,
  CheckCircle2,
  GitCommit,
  Info,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { APP_NAME, APP_VERSION, APP_RELEASE_DATE } from "../../constants/app";
import { useAuthStore } from "../../stores/authStore";
import { CHANGELOG_DATA } from "./changelogData";

export const ChangelogPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [expandedVersions, setExpandedVersions] = useState({
    "v2.2.0": true,
    "v2.1.0": true,
  });

  const toggleExpand = (ver) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [ver]: !prev[ver],
    }));
  };

  const expandAll = () => {
    const all = {};
    CHANGELOG_DATA.forEach((item) => {
      all[item.version] = true;
    });
    setExpandedVersions(all);
  };

  const collapseAll = () => {
    setExpandedVersions({});
  };

  // Section icon resolver
  const renderSectionIcon = (iconName) => {
    const props = { className: "w-4 h-4 shrink-0" };
    switch (iconName) {
      case "Clock":
        return <Clock {...props} />;
      case "Receipt":
        return <Receipt {...props} />;
      case "Scale":
        return <Scale {...props} />;
      case "Layers":
        return <Layers {...props} />;
      case "ShieldCheck":
        return <ShieldCheck {...props} />;
      case "Cpu":
        return <Cpu {...props} />;
      case "FileSpreadsheet":
        return <FileSpreadsheet {...props} />;
      case "Database":
        return <Database {...props} />;
      case "Code":
        return <Code {...props} />;
      case "Key":
        return <Key {...props} />;
      case "Package":
        return <Package {...props} />;
      default:
        return <Sparkles {...props} />;
    }
  };

  // Section badge style resolver
  const getSectionBadge = (type) => {
    switch (type) {
      case "feature":
        return {
          label: "Fitur Baru",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          bulletColor: "bg-emerald-500",
        };
      case "improvement":
        return {
          label: "Penyempurnaan",
          className: "bg-blue-50 text-blue-700 border-blue-200/80",
          bulletColor: "bg-blue-500",
        };
      case "fix":
        return {
          label: "Perbaikan Bug",
          className: "bg-amber-50 text-amber-700 border-amber-200/80",
          bulletColor: "bg-amber-500",
        };
      case "security":
        return {
          label: "Keamanan & Pengujian",
          className: "bg-rose-50 text-rose-700 border-rose-200/80",
          bulletColor: "bg-rose-500",
        };
      default:
        return {
          label: "Pembaruan",
          className: "bg-gray-50 text-gray-700 border-gray-200/80",
          bulletColor: "bg-gray-500",
        };
    }
  };

  // Filtered changelog
  const filteredChangelog = useMemo(() => {
    return CHANGELOG_DATA.filter((item) => {
      // Tag filter
      if (selectedTag === "V2" && !item.version.startsWith("v2.")) return false;
      if (selectedTag === "V1" && !item.version.startsWith("v1.")) return false;
      if (selectedTag === "V0" && !item.version.startsWith("v0.")) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchVersion = item.version.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchSections = item.sections.some(
        (sec) =>
          sec.title.toLowerCase().includes(q) ||
          sec.items.some((it) => it.toLowerCase().includes(q))
      );

      return matchVersion || matchTitle || matchSummary || matchSections;
    });
  }, [searchQuery, selectedTag]);

  const backLink = user?.role === "ADMIN" ? "/admin/dashboard" : isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Catatan Perubahan (Changelog)"
        subtitle={`Dokumentasi riwayat versi, fitur baru, dan perbaikan sistem ${APP_NAME}`}
        actions={
          <Link to={backLink}>
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Kembali ke Dashboard
            </Button>
          </Link>
        }
      />

      {/* Hero Release Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-lg border border-slate-700/60">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Versi Rilis Aktif</span>
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                  v{APP_VERSION}
                </h2>
                <span className="text-xs sm:text-sm font-semibold text-emerald-400">
                  (Current Stable)
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                Dilengkapi pilihan tanggal & waktu transaksi kustom, dukungan transaksi susulan (backdate),
                penyelarasan jam bukti cetak, dan sinkronisasi presisi distribusi berat sampah multi-item.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tanggal Rilis: <strong className="text-white">{APP_RELEASE_DATE}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Arsitektur: <strong className="text-white">Hono v4 + TypeScript</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Status UAT: <strong className="text-emerald-300">100% Lulus (41 Tests)</strong></span>
            </div>
          </div>
        </div>

        {/* Decorative Background Blob */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Version Categories Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Semua Versi" },
              { id: "V2", label: "v2.x (Modern/Hono)" },
              { id: "V1", label: "v1.x (Production Ready)" },
              { id: "V0", label: "v0.x (Inisialisasi)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTag(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTag === tab.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Collapse / Expand Buttons & Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Input
                type="text"
                placeholder="Cari fitur, bug, versi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
                className="text-xs py-1.5"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="xs"
                onClick={expandAll}
                title="Buka seluruh versi"
              >
                Buka Semua
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={collapseAll}
                title="Tutup seluruh versi"
              >
                Tutup Semua
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Changelog Timeline List */}
      <div className="space-y-5">
        {filteredChangelog.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200/80 p-8 space-y-2">
            <Info className="w-8 h-8 text-gray-400 mx-auto" />
            <h3 className="text-sm font-semibold text-gray-700">
              Tidak ada catatan perubahan yang cocok
            </h3>
            <p className="text-xs text-gray-400">
              Coba gunakan kata kunci pencarian lain atau pilih tab kategori "Semua Versi".
            </p>
          </div>
        ) : (
          filteredChangelog.map((release) => {
            const isExpanded = expandedVersions[release.version] ?? false;

            return (
              <div
                key={release.version}
                className={`rounded-2xl border transition-all duration-200 bg-white overflow-hidden shadow-xs ${
                  release.isCurrent
                    ? "border-emerald-300 ring-2 ring-emerald-500/10"
                    : "border-gray-200/80 hover:border-gray-300"
                }`}
              >
                {/* Release Header */}
                <div
                  onClick={() => toggleExpand(release.version)}
                  className={`p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                    release.isCurrent
                      ? "bg-gradient-to-r from-emerald-50/50 via-white to-white hover:bg-emerald-50/70"
                      : "hover:bg-gray-50/60"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    {/* Version Badge */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-xs ${
                        release.isCurrent
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {release.version}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate">
                          {release.title}
                        </h3>
                        {release.isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Versi Terkini
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {release.date}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {release.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <span className="hidden sm:inline-block text-[11px] font-semibold text-gray-400">
                      {isExpanded ? "Sembunyikan" : "Rincian"}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-gray-100 space-y-5">
                    {release.sections.map((section, sIdx) => {
                      const badgeInfo = getSectionBadge(section.type);

                      return (
                        <div
                          key={sIdx}
                          className="p-4 sm:p-5 rounded-xl bg-gray-50/80 border border-gray-200/60 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                              <span className="text-gray-500">
                                {renderSectionIcon(section.icon)}
                              </span>
                              <span>{section.title}</span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeInfo.className}`}
                            >
                              {badgeInfo.label}
                            </span>
                          </div>

                          <ul className="space-y-2 text-xs text-gray-600 pl-1">
                            {section.items.map((item, iIdx) => (
                              <li key={iIdx} className="flex items-start gap-2.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${badgeInfo.bulletColor}`}
                                />
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center pt-4 text-xs text-gray-400 font-mono">
        {APP_NAME} &bull; Catatan Perubahan Terkelola &bull; Format Keep a Changelog & SemVer
      </div>
    </div>
  );
};

export default ChangelogPage;
