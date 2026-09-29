/**
 * GET  /api/admin/payments  — ADMIN-only: list payments/invoices (paged, filtered)
 * POST /api/admin/payments  — ADMIN-only: generate an invoice/payment record
 *
 * Payment rows are never deleted or archived by the API. Financial history is
 * append-only: a mistaken invoice is corrected by raising a REFUNDED record,
 * not by removing the original.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { literalSearch } from "@/lib/db-filters";
import { recordAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const CreatePaymentSchema = z.object({
  payerName: z.string().min(1, "Payer name is required").max(200),
  schoolOrUser: z.string().max(200).optional(),
  amount: z.coerce.number().int().nonnegative(),
  method: z.string().max(60).default("Manual"),
  status: z.enum(["COMPLETED", "PENDING", "REFUNDED"]).default("PENDING"),
});

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status");

  // Financial history only grows, so this list is paged and filtered in the
  // database rather than returning the whole ledger on every page load.
  const where: Prisma.PaymentWhereInput = {
    ...(status === "COMPLETED" || status === "PENDING" || status === "REFUNDED"
      ? { status }
      : {}),
    ...(q
      ? {
          OR: [
            { payerName: { contains: literalSearch(q), mode: "insensitive" } },
            { transactionId: { contains: literalSearch(q), mode: "insensitive" } },
            { schoolOrUser: { contains: literalSearch(q), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, payments, totals] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    // Ledger total for the current filter, summed in the database so the client
    // never has to hold every row just to add them up.
    db.payment.aggregate({ where, _sum: { amount: true } }),
  ]);

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data: payments,
      meta: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        amountTotal: totals._sum.amount ?? 0,
      },
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const result = CreatePaymentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 }
    );
  }

  const transactionId = `INV-${Date.now().toString(36).toUpperCase()}`;
  const payment = await db.payment.create({
    data: { ...result.data, transactionId },
  });

  // Financial records are audited unconditionally: who raised which invoice,
  // for how much, and when.
  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "payment.create",
    entityType: "Payment",
    entityId: payment.id,
    summary: `Generated invoice ${transactionId} for ${payment.payerName} (${payment.amount})`,
    after: payment,
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof payment>>(
    { success: true, message: `Invoice ${transactionId} generated.`, data: payment },
    { status: 201 }
  );
}
