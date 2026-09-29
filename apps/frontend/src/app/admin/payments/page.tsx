"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ReusableTable, {
  ColumnDef,
} from "@/components/admin/ReusableTable";
import ChartCard from "@/components/admin/ChartCard";
import { fetchPayments, createPayment, PaymentRow } from "@/data/admin/tables";
import {
  IndianRupee,
  CreditCard,
  Clock,
  CheckCircle2,
} from "@/components/admin/icons";

type Payment = {
  id: string;
  transactionId: string;
  payerName: string;
  schoolOrUser: string;
  amount: number;
  date: string;
  method: string;
  status: "Completed" | "Pending" | "Refunded";
};

function toPayment(row: PaymentRow): Payment {
  return { ...row, amount: Number(row.amount) };
}

/* ─── Generate Invoice Modal ────────────────────────────────────────────────── */
function GenerateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ payerName: "", schoolOrUser: "", amount: "", method: "UPI", status: "PENDING" as const });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.payerName.trim() || !form.amount.trim()) { setError("Payer name and amount are required."); return; }
    setSaving(true); setError("");
    const result = await createPayment({
      payerName: form.payerName,
      schoolOrUser: form.schoolOrUser || undefined,
      amount: Number(form.amount) || 0,
      method: form.method,
      status: form.status,
    });
    setSaving(false);
    if (result.success) { onCreated(); onClose(); }
    else { setError(result.message); }
  }

  const f = (k: keyof typeof form, label: string, type = "text") => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{label}</label>
      <input type={type} style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }}
        value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:460, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Generate Invoice</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        </div>
        {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {f("payerName", "Payer Name *")}
          {f("schoolOrUser", "School / User")}
          {f("amount", "Amount (₹) *", "number")}
          {f("method", "Payment Method")}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <button type="button" onClick={onClose} style={{ padding:"9px 18px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving ? .6 : 1 }}>
              {saving ? "Generating…" : "Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const loadPayments = () => {
    setLoading(true);
    fetchPayments().then((rows) => { setPayments(rows.map(toPayment)); setLoading(false); });
  };

  useEffect(() => { loadPayments(); }, []);

  /* =========================
     DYNAMIC PAYMENT STATISTICS
  ========================= */

  const paymentStats = useMemo(() => {
    const revenue = payments
      .filter((payment) => payment.status === "Completed")
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);

    const completedTransactions = payments.filter(
      (payment) => payment.status === "Completed"
    ).length;

    const pendingInvoices = payments
      .filter((payment) => payment.status === "Pending")
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);

    const activeSubscriptions = payments.filter(
      (payment) => payment.status === "Completed"
    ).length;

    return {
      revenue,
      completedTransactions,
      pendingInvoices,
      activeSubscriptions,
    };
  }, [payments]);

  /* =========================
     TABLE COLUMNS
  ========================= */

  const paymentColumns: ColumnDef<Payment>[] = [
    {
      header: "Transaction ID",
      accessor: (row) => (
        <span className="font-bold text-slate-700">
          {row.transactionId}
        </span>
      ),
    },

    {
      header: "Payer / School",
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">
            {row.payerName}
          </div>

          <div className="text-xs text-slate-500">
            {row.schoolOrUser}
          </div>
        </div>
      ),
    },

    {
      header: "Amount",
      accessor: (row) => (
        <span className="font-bold text-slate-900">
          ₹{Number(row.amount || 0).toLocaleString("en-IN")}
        </span>
      ),
    },

    {
      header: "Payment Date",
      accessor: "date",
    },

    {
      header: "Method",
      accessor: "method",
    },

    {
      header: "Status",
      accessor: (row) => {
        const statusClass =
          row.status === "Completed"
            ? "completed"
            : row.status === "Pending"
              ? "pending"
              : "inactive";

        return (
          <span className={`status-badge ${statusClass}`}>
            {row.status}
          </span>
        );
      },
    },
  ];

  /* =========================
     GENERATE INVOICE
  ========================= */

  const handleGenerateInvoice = () => {
    setShowInvoiceModal(true);
  };

  return (
    <AdminLayout>
      {showInvoiceModal && (
        <GenerateInvoiceModal
          onClose={() => setShowInvoiceModal(false)}
          onCreated={loadPayments}
        />
      )}
      <div className="space-y-6">

        {/* =========================
            PAGE HEADER
        ========================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wide text-orange-600">
                Finance & Billing
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Payments & Subscriptions
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Manage school subscriptions, transactions, invoices and
              payment activity.
            </p>
          </div>

          <button
            onClick={handleGenerateInvoice}
            className="admin-btn-primary"
          >
            + Generate Invoice
          </button>
        </div>

        {/* =========================
            KPI CARDS
        ========================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Revenue */}
          <div className="admin-card payment-kpi-card">
            <div className="payment-kpi-icon orange">
              <IndianRupee className="w-6 h-6" />
            </div>

            <div>
              <p className="payment-kpi-label">
                Revenue (MTD)
              </p>

              <h2 className="payment-kpi-value">
                ₹{paymentStats.revenue.toLocaleString("en-IN")}
              </h2>

              <p className="payment-kpi-subtitle">
                From completed payments
              </p>
            </div>
          </div>

          {/* Completed */}
          <div className="admin-card payment-kpi-card">
            <div className="payment-kpi-icon green">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <p className="payment-kpi-label">
                Completed Transactions
              </p>

              <h2 className="payment-kpi-value">
                {paymentStats.completedTransactions.toLocaleString("en-IN")}
              </h2>

              <p className="payment-kpi-subtitle">
                Successful payments
              </p>
            </div>
          </div>

          {/* Pending */}
          <div className="admin-card payment-kpi-card">
            <div className="payment-kpi-icon amber">
              <Clock className="w-6 h-6" />
            </div>

            <div>
              <p className="payment-kpi-label">
                Pending Invoices
              </p>

              <h2 className="payment-kpi-value">
                ₹{paymentStats.pendingInvoices.toLocaleString("en-IN")}
              </h2>

              <p className="payment-kpi-subtitle">
                Awaiting payment
              </p>
            </div>
          </div>

          {/* Subscriptions */}
          <div className="admin-card payment-kpi-card">
            <div className="payment-kpi-icon blue">
              <CreditCard className="w-6 h-6" />
            </div>

            <div>
              <p className="payment-kpi-label">
                Active Subscriptions
              </p>

              <h2 className="payment-kpi-value">
                {paymentStats.activeSubscriptions.toLocaleString("en-IN")}
              </h2>

              <p className="payment-kpi-subtitle">
                Active paid accounts
              </p>
            </div>
          </div>

        </div>

        {/* =========================
            REVENUE CHART
        ========================= */}

        <div className="admin-card payment-chart-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Monthly Billing & Revenue
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Revenue generated from completed transactions.
              </p>
            </div>

            <span className="payment-live-badge">
              Live Data
            </span>
          </div>

          {payments.length > 0 ? (
            <ChartCard
              type="revenue"
              title="Revenue Breakdown"
            />
          ) : (
            <div className="payment-empty-chart">
              <div className="payment-empty-icon">
                <IndianRupee className="w-7 h-7" />
              </div>

              <h3>
                No payment data yet
              </h3>

              <p>
                Revenue analytics will appear here once payment
                transactions are added.
              </p>
            </div>
          )}
        </div>

        {/* =========================
            TRANSACTION TABLE
        ========================= */}

        <div className="admin-card payment-table-wrapper">

          <ReusableTable
            title="Transaction History & Billing Logs"
            subtitle={loading ? "Loading transactions…" : "View payments, invoice status, UPI transactions and school subscription renewals."}
            data={payments}
            columns={paymentColumns}
            searchPlaceholder="Search by transaction ID, school or method..."
            primaryActionLabel="Generate Invoice"
            onPrimaryAction={handleGenerateInvoice}
          />

          {/* Empty State */}
          {payments.length === 0 && (
            <div className="payment-empty-state">

              <div className="payment-empty-circle">
                <CreditCard className="w-8 h-8" />
              </div>

              <h3>
                No transactions yet
              </h3>

              <p>
                Payment records will appear here when transactions
                are added to the platform.
              </p>

              <button
                onClick={handleGenerateInvoice}
                className="admin-btn-primary mt-4"
              >
                + Generate First Invoice
              </button>

            </div>
          )}

        </div>

      </div>
    </AdminLayout>
  );
}