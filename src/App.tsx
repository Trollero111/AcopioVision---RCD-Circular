/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, PileAnalysisRecord, UserAccount } from './types';
import { storageService, DEFAULT_SETTINGS } from './services/storageService';
import { userService } from './services/userService';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { NewAnalysisFlow } from './components/NewAnalysis/NewAnalysisFlow';
import { HistoryView } from './components/History/HistoryView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { CalibrationView } from './components/Calibration/CalibrationView';
import { BudgetCalculator } from './components/Budget/BudgetCalculator';
import { VisualGuideView } from './components/VisualGuide/VisualGuideView';
import { SettingsView } from './components/Settings/SettingsView';
import { PrintReportModal } from './components/PrintReportModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ShieldCheck, HelpCircle, X, Sparkles, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('nuevo');
  const [records, setRecords] = useState<PileAnalysisRecord[]>(() => storageService.getLocalRecords());
  const [settings, setSettings] = useState<AppSettings>(() => storageService.getSettings());
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => userService.getCurrentUser());
  const [showUserManagement, setShowUserManagement] = useState(false);

  useEffect(() => {
    const unsub = userService.subscribe((u) => {
      setCurrentUser(u);
    });
    return unsub;
  }, []);

  useEffect(() => {
    storageService.getRecords().then((recs) => {
      if (recs && recs.length > 0) {
        setRecords(recs);
      }
    }).catch(console.error);
  }, []);

  // Modal para presupuesto cargado desde un análisis o inventario
  const [budgetRecord, setBudgetRecord] = useState<PileAnalysisRecord | null>(null);

  // Modal para impresión / exportar informe oficial
  const [printRecord, setPrintRecord] = useState<PileAnalysisRecord | null>(null);

  // Modal de bienvenida / Onboarding
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return !localStorage.getItem('acopiovision_welcomed');
  });

  // Comprobar si hay datos demo
  const hasDemoData = records.some((r) => r.isDemo);

  // Número de alertas de rechazo activas para insignia en el menú
  const alertCount = records.filter(
    (r) => r.effectiveCleanliness.level === 'muy_sucio' || r.effectiveCleanliness.rejection_percentage > 20
  ).length;

  const handleSaveRecord = async (newRecord: PileAnalysisRecord) => {
    await storageService.addRecord(newRecord);
    const updated = await storageService.getRecords();
    setRecords(updated);
  };

  const handleUpdateRecord = async (updatedRecord: PileAnalysisRecord) => {
    await storageService.updateRecord(updatedRecord);
    const updated = await storageService.getRecords();
    setRecords(updated);
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm('¿Eliminar este registro de acopio? Esta acción no se puede deshacer.')) {
      await storageService.deleteRecord(id);
      const updated = await storageService.getRecords();
      setRecords(updated);
    }
  };

  const handleLoadDemoData = async () => {
    await storageService.loadDemoData();
    const updated = await storageService.getRecords();
    setRecords(updated);
  };

  const handleClearDemoData = async () => {
    await storageService.clearDemoData();
    const updated = await storageService.getRecords();
    setRecords(updated);
  };

  const handleClearAllData = () => {
    if (confirm('¿Deseas vaciar todo el historial y dejar la aplicación a cero?')) {
      storageService.clearAllData();
      setRecords([]);
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  const handleGenerateBudget = (record: PileAnalysisRecord) => {
    setBudgetRecord(record);
    setActiveTab('presupuesto');
  };

  const closeWelcome = () => {
    localStorage.setItem('acopiovision_welcomed', 'true');
    setShowWelcome(false);
  };

  // Número de acopios visibles para el usuario activo
  const visibleRecords = useMemo(() => {
    return userService.filterRecordsForUser(records, currentUser);
  }, [records, currentUser]);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 ${settings.theme === 'light' ? 'light-mode' : ''}`}>
      {/* Cabecera institucional */}
      <Header
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        hasDemoData={hasDemoData}
        onLoadDemoData={handleLoadDemoData}
        onClearDemoData={handleClearDemoData}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        records={records}
        onOpenUserManagement={() => setShowUserManagement(true)}
      />

      {/* Contenedor Principal (Sidebar + Contenido) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navegación lateral / inferior */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          recordCount={visibleRecords.length}
          alertCount={alertCount}
        />

        {/* Área de Contenido Principal */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'nuevo' && (
            <NewAnalysisFlow
              settings={settings}
              currentUser={currentUser}
              onSaveRecord={handleSaveRecord}
              onGenerateBudget={handleGenerateBudget}
              onOpenPrintModal={setPrintRecord}
            />
          )}

          {activeTab === 'historial' && (
            <HistoryView
              records={records}
              settings={settings}
              currentUser={currentUser}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onGenerateBudget={handleGenerateBudget}
              onOpenPrintModal={setPrintRecord}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              records={records}
              currentUser={currentUser}
              onNavigateToHistory={() => setActiveTab('historial')}
              onNavigateToNewAnalysis={() => setActiveTab('nuevo')}
              onSelectRecord={(r) => {
                setBudgetRecord(r);
                setActiveTab('historial');
              }}
            />
          )}

          {activeTab === 'calibracion' && (
            <CalibrationView
              records={records}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onUpdateRecord={handleUpdateRecord}
            />
          )}

          {activeTab === 'presupuesto' && (
            <BudgetCalculator
              initialRecord={budgetRecord}
              settings={settings}
              onClearInitialRecord={() => setBudgetRecord(null)}
            />
          )}

          {activeTab === 'guia' && <VisualGuideView settings={settings} />}

          {activeTab === 'ajustes' && (
            <SettingsView
              settings={settings}
              currentUser={currentUser}
              onUpdateSettings={handleUpdateSettings}
              onLoadDemoData={handleLoadDemoData}
              onClearDemoData={handleClearDemoData}
              onClearAllData={handleClearAllData}
              hasDemoData={hasDemoData}
              onOpenUserManagement={() => setShowUserManagement(true)}
            />
          )}
        </main>
      </div>

      {/* Modal de Gestión de Usuarios y Roles */}
      {showUserManagement && (
        <UserManagementModal
          currentUser={currentUser}
          onClose={() => setShowUserManagement(false)}
          onUserSelected={setCurrentUser}
        />
      )}

      {/* Modal de Informe Imprimible */}
      <PrintReportModal record={printRecord} onClose={() => setPrintRecord(null)} />

      {/* Modal de Bienvenida (Onboarding en 3 pasos) */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={closeWelcome}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/25">
                AV
              </div>
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  RCD Circular · Monzón (Aragón)
                </span>
                <h3 className="text-xl font-bold text-white font-mono">
                  Bienvenido a AcopioVision
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Herramienta de visión artificial y fotogrametría terrestre diseñada para estimar volumen (m³), peso (t), calidad y rechazo de acopios de áridos y escombros desde el suelo.
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono inline-flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-white block">Toma 1 a 3 fotos desde el suelo</strong>
                  <span className="text-slate-400 text-[11px]">
                    Encuadra el acopio completo e incluye una referencia métrica (persona, cazo de pala o cono).
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono inline-flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-white block">Visión artificial y cálculo determinista</strong>
                  <span className="text-slate-400 text-[11px]">
                    El modelo detecta dimensiones y forma geométrica, calculando el volumen con fórmulas auditables y reproducibles.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono inline-flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-white block">Calibración con báscula oficial</strong>
                  <span className="text-slate-400 text-[11px]">
                    Registra los pesajes reales de báscula puente para calibrar continuamente la densidad aparente.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Estimación asistida. Complementa, no sustituye, el pesaje oficial.</span>
            </div>

            <button
              type="button"
              onClick={closeWelcome}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/25 active:scale-98"
            >
              <span>Comenzar a Usar AcopioVision</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
