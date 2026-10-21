/**
 * Calculadora y Generador de Presupuestos de Gestión y Suministro
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState } from 'react';
import { PileAnalysisRecord, AppSettings, PricingRates } from '../../types';
import {
  Building2,
  DollarSign,
  Copy,
  Printer,
  Sparkles,
  AlertTriangle,
  Check,
  Percent,
} from 'lucide-react';

interface BudgetCalculatorProps {
  initialRecord?: PileAnalysisRecord | null;
  settings: AppSettings;
  onClearInitialRecord?: () => void;
}

export const BudgetCalculator: React.FC<BudgetCalculatorProps> = ({
  initialRecord,
  settings,
  onClearInitialRecord,
}) => {
  const [clientName, setClientName] = useState('Constructora Cinca Medio S.L.');
  const [projectLocation, setProjectLocation] = useState(
    initialRecord ? initialRecord.location : 'Obra Urbanización Monzón'
  );
  const [material, setMaterial] = useState<string>(
    initialRecord ? initialRecord.effectiveMaterial : 'Escombro mixto'
  );
  const [billingUnit, setBillingUnit] = useState<'tonnes' | 'm3'>('tonnes');
  const [quantity, setQuantity] = useState<number>(
    initialRecord
      ? billingUnit === 'tonnes'
        ? initialRecord.effectiveWeightTonnes
        : initialRecord.effectiveVolumeM3
      : 150
  );
  const [quantityMin, setQuantityMin] = useState<number>(
    initialRecord
      ? billingUnit === 'tonnes'
        ? initialRecord.effectiveWeightRange[0]
        : initialRecord.effectiveVolumeRange[0]
      : 135
  );
  const [quantityMax, setQuantityMax] = useState<number>(
    initialRecord
      ? billingUnit === 'tonnes'
        ? initialRecord.effectiveWeightRange[1]
        : initialRecord.effectiveVolumeRange[1]
      : 165
  );

  const [rejectionLevel, setRejectionLevel] = useState<'limpio' | 'mixto' | 'sucio' | 'muy_sucio'>(
    initialRecord ? initialRecord.effectiveCleanliness.level : 'mixto'
  );

  const [customPricePerUnit, setCustomPricePerUnit] = useState<number>(
    settings.rates[material]
      ? billingUnit === 'tonnes'
        ? settings.rates[material].pricePerTonne
        : settings.rates[material].pricePerM3
      : 11.50
  );

  const [copiado, setCopiado] = useState(false);

  // Cuando cambia el material o unidad, actualizar precio base sugerido
  const handleMaterialChange = (newMat: string) => {
    setMaterial(newMat);
    const rate = settings.rates[newMat];
    if (rate) {
      setCustomPricePerUnit(billingUnit === 'tonnes' ? rate.pricePerTonne : rate.pricePerM3);
    }
  };

  const handleUnitChange = (unit: 'tonnes' | 'm3') => {
    setBillingUnit(unit);
    const rate = settings.rates[material];
    if (rate) {
      setCustomPricePerUnit(unit === 'tonnes' ? rate.pricePerTonne : rate.pricePerM3);
    }
    if (initialRecord) {
      setQuantity(unit === 'tonnes' ? initialRecord.effectiveWeightTonnes : initialRecord.effectiveVolumeM3);
      setQuantityMin(unit === 'tonnes' ? initialRecord.effectiveWeightRange[0] : initialRecord.effectiveVolumeRange[0]);
      setQuantityMax(unit === 'tonnes' ? initialRecord.effectiveWeightRange[1] : initialRecord.effectiveVolumeRange[1]);
    }
  };

  // Recargos por rechazo según nivel
  let surchargePercent = 0;
  if (rejectionLevel === 'muy_sucio') {
    surchargePercent = settings.rejectionThresholds.surchargePercentMuySucio || 35;
  } else if (rejectionLevel === 'sucio') {
    surchargePercent = 15;
  }

  const effectiveRate = customPricePerUnit * (1 + surchargePercent / 100);

  // Cálculos económicos
  const subtotalNominal = quantity * effectiveRate;
  const subtotalMin = quantityMin * effectiveRate;
  const subtotalMax = quantityMax * effectiveRate;

  const iva = subtotalNominal * 0.21;
  const totalConIva = subtotalNominal + iva;

  const handleCopyBudget = () => {
    const text = `📄 ESTIMACIÓN DE PRESUPUESTO - RCD CIRCULAR (MONZÓN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliente: ${clientName}
Ubicación / Proyecto: ${projectLocation}
Concepto: Recepción y valorización de ${material}
Nivel de Limpieza: ${rejectionLevel.toUpperCase()}${surchargePercent > 0 ? ` (Recargo triaje +${surchargePercent}%)` : ''}

📊 MEDICIÓN ESTIMADA:
- Cantidad estimada: ≈ ${quantity.toFixed(1)} ${billingUnit === 'tonnes' ? 't' : 'm³'} (Rango: ${quantityMin.toFixed(1)} – ${quantityMax.toFixed(1)})
- Tarifa aplicada: ${effectiveRate.toFixed(2)} €/${billingUnit === 'tonnes' ? 't' : 'm³'} (Base ${customPricePerUnit.toFixed(2)} € + recargo ${surchargePercent}%)

💰 PRESUPUESTO ORIENTATIVO:
- Base Imponible estimada: ${subtotalNominal.toFixed(2)} €
  (Rango probable: ${subtotalMin.toFixed(2)} € - ${subtotalMax.toFixed(2)} €)
- IVA (21%): ${iva.toFixed(2)} €
- TOTAL ESTIMADO: ${totalConIva.toFixed(2)} €

ℹ️ Presupuesto calculado a partir de cubicación por visión artificial. La liquidación definitiva se basará en el pesaje oficial de báscula a la entrada de planta La Campaneta.
RCD Circular · Monzón (Huesca) · Tel: 974 00 00 00`;

    navigator.clipboard.writeText(text);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Cabecera */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider block">
            Valor para el Cliente y Presupuestos Rápidos
          </span>
          <h2 className="text-xl font-bold text-white font-mono mt-0.5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span>Calculadora de Presupuestos de RCD</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Genera presupuestos comerciales transparentes en obra o planta con rangos ajustados por visión artificial.
          </p>
        </div>

        {initialRecord && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl text-amber-300 text-xs">
            <span>Cargado desde: <strong>{initialRecord.pileName}</strong></span>
            {onClearInitialRecord && (
              <button
                type="button"
                onClick={onClearInitialRecord}
                className="text-amber-400 hover:text-white underline text-[11px]"
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Parámetros Comerciales */}
        <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-2">
            Datos del Cliente y Parámetros del Servicio
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Cliente / Constructora:</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Obra / Destino:</label>
              <input
                type="text"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Tipo de Material / Residuo:</label>
              <select
                value={material}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {Object.keys(settings.rates).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Unidad de Facturación:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUnitChange('tonnes')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                    billingUnit === 'tonnes'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Toneladas (t)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitChange('m3')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                    billingUnit === 'm3'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Metros Cúbicos (m³)
                </button>
              </div>
            </div>
          </div>

          {/* Cantidad y rango */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Cantidad Estimada:
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Rango Mínimo:</label>
              <input
                type="number"
                step="1"
                min="0"
                value={quantityMin}
                onChange={(e) => setQuantityMin(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Rango Máximo:</label>
              <input
                type="number"
                step="1"
                min="1"
                value={quantityMax}
                onChange={(e) => setQuantityMax(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
              />
            </div>
          </div>

          {/* Nivel de rechazo y recargos */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Nivel de Limpieza / Rechazo en Inspección Visual:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'limpio', label: 'Limpio (0%)' },
                { id: 'mixto', label: 'Mixto (0%)' },
                { id: 'sucio', label: 'Sucio (+15%)' },
                { id: 'muy_sucio', label: `Muy Sucio (+${settings.rejectionThresholds.surchargePercentMuySucio}%)` },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setRejectionLevel(lvl.id as any)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition ${
                    rejectionLevel === lvl.id
                      ? lvl.id === 'muy_sucio'
                        ? 'bg-red-500/20 text-red-300 border-red-500/60 font-bold'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tarifa base editable */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">Tarifa Base:</span>
              <span className="text-[11px] text-slate-400">
                Tarifa de RCD Circular antes de recargos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                value={customPricePerUnit}
                onChange={(e) => setCustomPricePerUnit(parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono text-center"
              />
              <span className="text-xs text-slate-400 font-mono">€/{billingUnit === 'tonnes' ? 't' : 'm³'}</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Resumen Presupuestario */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl border-2 border-amber-500/40 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                Presupuesto Estimado
              </span>
              {surchargePercent > 0 && (
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  +{surchargePercent}% Recargo Rechazo
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">Total Estimado (Base Imponible)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-black text-white font-mono">
                  {subtotalNominal.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-amber-400 font-mono">€</span>
              </div>
              <span className="text-xs text-slate-400 font-mono block mt-1">
                Rango: {subtotalMin.toFixed(2)} € – {subtotalMax.toFixed(2)} €
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Tarifa efectiva final:</span>
                <span className="font-mono font-bold text-white">
                  {effectiveRate.toFixed(2)} €/{billingUnit === 'tonnes' ? 't' : 'm³'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IVA (21%):</span>
                <span className="font-mono">{iva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-800 text-sm">
                <span>TOTAL CON IVA:</span>
                <span className="font-mono text-amber-400">{totalConIva.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <button
              type="button"
              onClick={handleCopyBudget}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/25 active:scale-98"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiado ? '¡Presupuesto Copiado!' : 'Copiar para WhatsApp / Email'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Imprimir Oferta Comercial</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
