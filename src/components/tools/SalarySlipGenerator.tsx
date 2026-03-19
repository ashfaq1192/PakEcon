/**
 * Salary Slip Generator (T044, T045, T046, T047)
 * - Auto-calculates income tax advance using FBR 2026 slabs (TypeScript constants only, no D1)
 * - PDF generation via pdf-lib (zero network requests)
 * - localStorage template persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { calculateTax } from '../../lib/utils/tax-slabs';
import { trackToolUse } from '../../lib/utils/analytics';

interface LineItem {
  id: string;
  label: string;
  amount: string;
  readOnly?: boolean;
}

const EOBI_FIXED = 370; // PKR 370/month as of FY2025-26

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_EARNINGS: LineItem[] = [
  { id: 'basic', label: 'Basic Salary', amount: '', readOnly: false },
  { id: 'hra', label: 'House Rent Allowance', amount: '', readOnly: false },
  { id: 'medical', label: 'Medical Allowance', amount: '', readOnly: false },
  { id: 'conveyance', label: 'Conveyance Allowance', amount: '', readOnly: false },
];

const DEFAULT_DEDUCTIONS: LineItem[] = [
  { id: 'eobi', label: 'EOBI Contribution', amount: String(EOBI_FIXED), readOnly: false },
  { id: 'income_tax', label: 'Income Tax Advance', amount: '', readOnly: false },
];

interface ToastState { message: string; visible: boolean }

export default function SalarySlipGenerator() {
  const [companyName, setCompanyName] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [slipMonth, setSlipMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [earnings, setEarnings] = useState<LineItem[]>(DEFAULT_EARNINGS);
  const [deductions, setDeductions] = useState<LineItem[]>(DEFAULT_DEDUCTIONS);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  // Load template from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('salarySlipTemplate');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.designation) setDesignation(data.designation);
        if (data.department) setDepartment(data.department);
        if (data.earnings) setEarnings(data.earnings);
        if (data.deductions) setDeductions(data.deductions);
      }
    } catch {
      // ignore
    }
  }, []);

  const grossSalary = earnings.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  // Auto-compute income tax when basic salary / gross changes
  useEffect(() => {
    if (grossSalary <= 0) return;
    const annualIncome = grossSalary * 12;
    const taxResult = calculateTax(annualIncome);
    const monthlyTax = Math.round(taxResult.totalTax / 12);

    setDeductions(prev =>
      prev.map(d =>
        d.id === 'income_tax' ? { ...d, amount: String(monthlyTax) } : d
      )
    );
  }, [grossSalary]);

  const totalDeductions = deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const netSalary = grossSalary - totalDeductions;

  function showToast(message: string) {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2500);
  }

  function saveTemplate() {
    try {
      localStorage.setItem(
        'salarySlipTemplate',
        JSON.stringify({ companyName, designation, department, earnings, deductions })
      );
      showToast('Template saved');
    } catch {
      showToast('Failed to save template');
    }
  }

  function addEarning() {
    setEarnings(prev => [...prev, { id: generateId(), label: '', amount: '' }]);
  }

  function addDeduction() {
    setDeductions(prev => [...prev, { id: generateId(), label: '', amount: '' }]);
  }

  function updateEarning(id: string, field: 'label' | 'amount', value: string) {
    setEarnings(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  function updateDeduction(id: string, field: 'label' | 'amount', value: string) {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }

  function removeEarning(id: string) {
    setEarnings(prev => prev.filter(e => e.id !== id || e.id === 'basic'));
  }

  function removeDeduction(id: string) {
    setDeductions(prev => prev.filter(d => d.id !== id));
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const [monthLabel, yearLabel] = (() => {
    const [y, m] = slipMonth.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return [
      d.toLocaleString('en-PK', { month: 'long' }),
      y,
    ];
  })();

  async function generatePDF() {
    trackToolUse('salary-slip-generator');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const green = rgb(0.09, 0.64, 0.29);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.9, 0.9, 0.9);

    let y = height - 50;

    // Header bar
    page.drawRectangle({ x: 0, y: y - 10, width, height: 50, color: green });
    page.drawText(companyName || 'Company Name', {
      x: 30, y: y + 10, size: 16, font: fontBold, color: rgb(1, 1, 1),
    });

    y -= 40;
    page.drawText(`SALARY SLIP — ${monthLabel.toUpperCase()} ${yearLabel}`, {
      x: 30, y, size: 12, font: fontBold, color: black,
    });

    y -= 25;
    // Employee details
    const details = [
      ['Employee Name:', employeeName || '—'],
      ['Designation:', designation || '—'],
      ['Department:', department || '—'],
    ];
    for (const [label, value] of details) {
      page.drawText(label, { x: 30, y, size: 9, font: fontBold, color: gray });
      page.drawText(value, { x: 180, y, size: 9, font: fontReg, color: black });
      y -= 16;
    }

    y -= 10;

    // Two-column layout: Earnings | Deductions
    const colX = [30, 300];
    const tableWidth = 245;

    function drawTableHeader(x: number, title: string) {
      page.drawRectangle({ x, y: y - 4, width: tableWidth, height: 20, color: lightGray });
      page.drawText(title, { x: x + 6, y: y + 2, size: 9, font: fontBold, color: black });
      page.drawText('PKR', { x: x + tableWidth - 40, y: y + 2, size: 9, font: fontBold, color: black });
    }

    function drawRow(x: number, label: string, amount: number, isTotal = false) {
      if (isTotal) {
        page.drawRectangle({ x, y: rowY - 4, width: tableWidth, height: 18, color: rgb(0.85, 0.97, 0.87) });
      }
      page.drawText(label, {
        x: x + 6, y: rowY,
        size: isTotal ? 9 : 8,
        font: isTotal ? fontBold : fontReg,
        color: black,
      });
      page.drawText(fmt(amount), {
        x: x + tableWidth - 40, y: rowY,
        size: isTotal ? 9 : 8,
        font: isTotal ? fontBold : fontReg,
        color: black,
      });
    }

    drawTableHeader(colX[0], 'Earnings');
    drawTableHeader(colX[1], 'Deductions');
    y -= 22;

    let rowY = y;
    const maxRows = Math.max(earnings.length, deductions.length) + 1;

    for (let i = 0; i < earnings.length; i++) {
      const e = earnings[i];
      const amt = parseFloat(e.amount) || 0;
      drawRow(colX[0], e.label || `Earning ${i + 1}`, amt);
      rowY -= 16;
    }
    // Gross total
    drawRow(colX[0], 'Gross Salary', grossSalary, true);

    rowY = y;
    for (let i = 0; i < deductions.length; i++) {
      const d = deductions[i];
      const amt = parseFloat(d.amount) || 0;
      drawRow(colX[1], d.label || `Deduction ${i + 1}`, amt);
      rowY -= 16;
    }
    drawRow(colX[1], 'Total Deductions', totalDeductions, true);

    y = rowY - 30;

    // Net salary box
    page.drawRectangle({ x: 30, y: y - 8, width: width - 60, height: 28, color: green });
    page.drawText('NET SALARY', { x: 40, y: y + 4, size: 11, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`PKR ${fmt(netSalary)}`, {
      x: width - 140, y: y + 4, size: 11, font: fontBold, color: rgb(1, 1, 1),
    });

    y -= 50;

    // Signatures
    page.drawText('Prepared by:', { x: 30, y, size: 8, font: fontReg, color: gray });
    page.drawText('Authorized Signatory:', { x: 300, y, size: 8, font: fontReg, color: gray });
    y -= 25;
    page.drawLine({ start: { x: 30, y }, end: { x: 180, y }, thickness: 0.5, color: gray });
    page.drawLine({ start: { x: 300, y }, end: { x: 450, y }, thickness: 0.5, color: gray });

    // Footer
    page.drawText('Generated by HisaabKar.pk — hisaabkar.pk', {
      x: 30, y: 20, size: 7, font: fontReg, color: gray,
    });

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-slip-${monthLabel.toLowerCase()}-${yearLabel}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-2xl mx-auto relative">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-sm z-50">
          {toast.message}
        </div>
      )}

      {/* Company & Employee Details */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
        {[
          { label: 'Company Name', value: companyName, setter: setCompanyName, full: true },
          { label: 'Employee Name', value: employeeName, setter: setEmployeeName },
          { label: 'Designation', value: designation, setter: setDesignation },
          { label: 'Department', value: department, setter: setDepartment },
        ].map(({ label, value, setter, full }) => (
          <div key={label} className={full ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="text"
              value={value}
              onChange={e => setter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Month / Year</label>
          <input
            type="month"
            value={slipMonth}
            onChange={e => setSlipMonth(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Earnings */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Earnings</h3>
        <div className="space-y-2">
          {earnings.map(e => (
            <div key={e.id} className="grid grid-cols-[1fr_140px_auto] gap-2 items-center">
              <input
                type="text" value={e.label}
                onChange={ev => updateEarning(e.id, 'label', ev.target.value)}
                placeholder="Description"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <input
                type="number" min="0" value={e.amount}
                onChange={ev => updateEarning(e.id, 'amount', ev.target.value)}
                placeholder="PKR"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {e.id !== 'basic' ? (
                <button onClick={() => removeEarning(e.id)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
              ) : <span />}
            </div>
          ))}
        </div>
        <button onClick={addEarning} className="mt-2 text-xs text-green-700 underline">+ Add Earning</button>
        <div className="mt-2 flex justify-between text-sm font-semibold border-t pt-2">
          <span>Gross Salary</span>
          <span>PKR {fmt(grossSalary)}</span>
        </div>
      </div>

      {/* Deductions */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Deductions</h3>
        <div className="space-y-2">
          {deductions.map(d => (
            <div key={d.id} className="grid grid-cols-[1fr_140px_auto] gap-2 items-center">
              <input
                type="text" value={d.label}
                onChange={ev => updateDeduction(d.id, 'label', ev.target.value)}
                placeholder="Description"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <input
                type="number" min="0" value={d.amount}
                onChange={ev => updateDeduction(d.id, 'amount', ev.target.value)}
                placeholder="PKR"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button onClick={() => removeDeduction(d.id)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
            </div>
          ))}
        </div>
        <button onClick={addDeduction} className="mt-2 text-xs text-green-700 underline">+ Add Deduction</button>
        <div className="mt-2 flex justify-between text-sm font-semibold border-t pt-2">
          <span>Total Deductions</span>
          <span>PKR {fmt(totalDeductions)}</span>
        </div>
      </div>

      {/* Net Salary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center mb-4">
        <span className="font-bold text-base">Net Salary</span>
        <span className="font-bold text-xl text-green-700">PKR {fmt(netSalary)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={generatePDF}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Download PDF
        </button>
        <button
          onClick={saveTemplate}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Save Template
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Income Tax Advance is auto-calculated from FBR 2026 slabs based on gross salary. You can override it manually.
        PDF generation is entirely client-side — no data is sent to any server.
      </p>
    </div>
  );
}
