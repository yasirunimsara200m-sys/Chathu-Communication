import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { money, roundMoney } from "../lib/money.js";

export const drawerRouter = Router();
drawerRouter.use(requireAuth);

drawerRouter.get("/current", async (_req, res) => {
  const open = await prisma.drawerSession.findFirst({
    where: { closedAt: null },
    include: { openedBy: { select: { id: true, name: true } } },
    orderBy: { openedAt: "desc" },
  });
  if (!open) return res.json({ session: null, expectedCash: 0 });

  const salesAgg = await prisma.sale.aggregate({
    where: {
      status: "COMPLETED",
      createdAt: { gte: open.openedAt },
    },
    _sum: { total: true, cashAmount: true, cardAmount: true, creditAmount: true },
    _count: { id: true },
  });

  const totalRevenue = money(salesAgg._sum.total);
  const cashSales = money(salesAgg._sum.cashAmount);
  const cardSales = money(salesAgg._sum.cardAmount);
  const creditSales = money(salesAgg._sum.creditAmount);
  const billCount = salesAgg._count.id;
  const expectedCash = roundMoney(money(open.openingFloat) + cashSales);

  res.json({
    session: {
      ...open,
      openingFloat: money(open.openingFloat),
    },
    expectedCash,
    cashSales,
    dayIncome: {
      totalRevenue,
      cashSales,
      cardSales,
      creditSales,
      billCount,
    },
  });
});

drawerRouter.post("/open", async (req, res) => {
  const parsed = z
    .object({ openingFloat: z.number().nonnegative() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Opening float required" });

  const existing = await prisma.drawerSession.findFirst({ where: { closedAt: null } });
  if (existing) {
    return res.status(409).json({ error: "A drawer session is already open" });
  }
  const session = await prisma.drawerSession.create({
    data: {
      openedById: req.user.id,
      openingFloat: parsed.data.openingFloat,
    },
  });
  res.status(201).json(session);
});

drawerRouter.post("/close", async (req, res) => {
  const parsed = z
    .object({
      actualCash: z.number().nonnegative(),
      notes: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Counted cash required" });

  const open = await prisma.drawerSession.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
  });
  if (!open) return res.status(404).json({ error: "No open drawer session" });

  const cashSales = await prisma.sale.aggregate({
    where: { status: "COMPLETED", createdAt: { gte: open.openedAt } },
    _sum: { cashAmount: true },
  });
  const expectedCash = roundMoney(
    money(open.openingFloat) + money(cashSales._sum.cashAmount)
  );
  const actualCash = parsed.data.actualCash;
  const variance = roundMoney(actualCash - expectedCash);

  const closed = await prisma.drawerSession.update({
    where: { id: open.id },
    data: {
      closedById: req.user.id,
      expectedCash,
      actualCash,
      variance,
      notes: parsed.data.notes,
      closedAt: new Date(),
    },
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });

  res.json({
    ...closed,
    openingFloat: money(closed.openingFloat),
    expectedCash: money(closed.expectedCash),
    actualCash: money(closed.actualCash),
    variance: money(closed.variance),
    cashSales: money(cashSales._sum.cashAmount),
  });
});

drawerRouter.get("/history", async (_req, res) => {
  const rows = await prisma.drawerSession.findMany({
    where: { closedAt: { not: null } },
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
    orderBy: { closedAt: "desc" },
    take: 30,
  });
  res.json(
    rows.map((r) => ({
      ...r,
      openingFloat: money(r.openingFloat),
      expectedCash: money(r.expectedCash),
      actualCash: money(r.actualCash),
      variance: money(r.variance),
    }))
  );
});
