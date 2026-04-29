function normalizeNumber(value) {
  return Number(value || 0);
}

function percent(part, whole) {
  if (!whole) {
    return 0;
  }

  return (part / whole) * 100;
}

function round(value) {
  return Math.round(Number(value || 0));
}

function pushInsight(collection, insight) {
  collection.push({
    priority: insight.priority || "medium",
    category: insight.category || "general",
    title: insight.title,
    message: insight.message,
    action: insight.action,
  });
}

function buildReportInsights({
  summary,
  branchPerformance,
  topServices,
  topCustomers,
  dailySales,
  paymentMethods,
  barberPerformance,
}) {
  const insights = [];
  const grossSales = normalizeNumber(summary.gross_sales);
  const finalSales = normalizeNumber(summary.final_sales);
  const expenses = normalizeNumber(summary.total_expenses_amount);
  const discounts = normalizeNumber(summary.total_discount);
  const totalInvoices = Number(summary.total_invoices || 0);
  const estimatedProfit = normalizeNumber(summary.estimated_profit);

  if (!totalInvoices) {
    pushInsight(insights, {
      priority: "high",
      category: "sales",
      title: "No invoices were found in this date range",
      message:
        "HMS cannot generate strong business advice until invoices are being recorded in the selected period.",
      action:
        "Check the report dates and make sure completed services are closed through the invoice screen.",
    });

    return insights;
  }

  const discountRate = percent(discounts, grossSales);
  if (discountRate >= 15) {
    pushInsight(insights, {
      priority: "high",
      category: "pricing",
      title: "Discounts are reducing revenue too aggressively",
      message: `Discounts are consuming about ${round(
        discountRate
      )}% of gross sales in this period.`,
      action:
        "Review who can give discounts, set approval rules for large reductions, and check whether service prices need to be raised instead.",
    });
  }

  const expenseRate = percent(expenses, finalSales);
  if (expenseRate >= 60) {
    pushInsight(insights, {
      priority: "high",
      category: "finance",
      title: "Expenses are putting profit under pressure",
      message: `Recorded expenses are about ${round(
        expenseRate
      )}% of final sales in this period.`,
      action:
        "Inspect branch-level spending, product usage, and non-essential costs before expanding promotions or discounts.",
    });
  } else if (estimatedProfit > 0) {
    pushInsight(insights, {
      priority: "medium",
      category: "finance",
      title: "The business is profitable in this selected range",
      message: `Estimated profit is ${round(
        estimatedProfit
      )} AFN after subtracting recorded expenses.`,
      action:
        "Use this as the owner benchmark, then compare branches and staff patterns to decide where to invest more attention.",
    });
  }

  const sortedBranches = [...branchPerformance]
    .map((branch) => ({
      ...branch,
      final_sales: normalizeNumber(branch.final_sales),
    }))
    .sort((left, right) => right.final_sales - left.final_sales);

  if (sortedBranches.length >= 2) {
    const leader = sortedBranches[0];
    const trailing = sortedBranches[sortedBranches.length - 1];
    const gap = leader.final_sales - trailing.final_sales;

    if (gap > 0) {
      pushInsight(insights, {
        priority: "medium",
        category: "branch",
        title: `${leader.name} is the strongest branch right now`,
        message: `${leader.name} is ahead of ${trailing.name} by ${round(
          gap
        )} AFN in final sales in this report range.`,
        action:
          "Compare staffing, booking flow, and service mix between branches and move the better habits into the lower-performing location.",
      });
    }
  }

  const topService = topServices[0];
  if (topService) {
    const serviceShare = percent(
      normalizeNumber(topService.total_sales),
      finalSales
    );

    pushInsight(insights, {
      priority: serviceShare >= 40 ? "high" : "low",
      category: "services",
      title: `${topService.item_name} is driving service demand`,
      message: `${topService.item_name} contributes about ${round(
        serviceShare
      )}% of final sales.`,
      action:
        serviceShare >= 40
          ? "Protect service quality and pricing here, but also build secondary offers so the business does not depend on one service too much."
          : "Bundle this service with add-ons to improve average invoice size.",
    });
  }

  const topCustomer = topCustomers[0];
  if (topCustomer) {
    pushInsight(insights, {
      priority: "low",
      category: "customers",
      title: `${topCustomer.full_name} is one of your highest-value customers`,
      message: `${topCustomer.full_name} spent ${round(
        topCustomer.total_spent
      )} AFN across ${topCustomer.total_invoices} invoices.`,
      action:
        "Create loyalty rewards or direct follow-up for your top repeat customers so they stay attached to the salon.",
    });
  }

  const totalPayments = paymentMethods.reduce((sum, item) => {
    return sum + normalizeNumber(item.total_amount);
  }, 0);
  const cashEntry = paymentMethods.find((item) => item.payment_method === "cash");
  const cashShare = percent(normalizeNumber(cashEntry?.total_amount), totalPayments);

  if (cashShare >= 80) {
    pushInsight(insights, {
      priority: "medium",
      category: "payments",
      title: "Most payment volume is still cash",
      message: `Cash represents about ${round(cashShare)}% of payments in this period.`,
      action:
        "Encourage bank or mobile payments for larger tickets if you want cleaner reconciliation and better owner-level control.",
    });
  }

  if (dailySales.length >= 6) {
    const midpoint = Math.floor(dailySales.length / 2);
    const firstHalf = dailySales.slice(0, midpoint).reduce((sum, day) => {
      return sum + normalizeNumber(day.final_sales);
    }, 0);
    const secondHalf = dailySales.slice(midpoint).reduce((sum, day) => {
      return sum + normalizeNumber(day.final_sales);
    }, 0);

    if (secondHalf < firstHalf * 0.85) {
      pushInsight(insights, {
        priority: "high",
        category: "trend",
        title: "Sales weakened in the later part of the period",
        message:
          "The second half of the selected range is noticeably softer than the first half.",
        action:
          "Check pricing, branch staffing, promotions, and appointment flow to identify what slowed down demand or execution.",
      });
    } else if (secondHalf > firstHalf * 1.1) {
      pushInsight(insights, {
        priority: "medium",
        category: "trend",
        title: "Sales momentum improved through the period",
        message:
          "The later days are performing better than the earlier days in the selected range.",
        action:
          "Look at which recent changes helped, such as staffing, promotions, or service focus, and keep repeating that pattern.",
      });
    }
  }

  const rankedBarbers = [...barberPerformance]
    .map((barber) => ({
      ...barber,
      total_tokens: Number(barber.total_tokens || 0),
      completion_rate: Number(barber.completion_rate || 0),
    }))
    .sort((left, right) => right.total_tokens - left.total_tokens);

  if (rankedBarbers.length >= 2) {
    const busiest = rankedBarbers[0];
    const lightest = rankedBarbers[rankedBarbers.length - 1];

    if (busiest.total_tokens >= Math.max(4, lightest.total_tokens * 2)) {
      pushInsight(insights, {
        priority: "medium",
        category: "staff",
        title: "Barber workload distribution looks uneven",
        message: `${busiest.barber_name} handled ${busiest.total_tokens} tokens while ${lightest.barber_name} handled ${lightest.total_tokens}.`,
        action:
          "Keep availability statuses accurate and use HMS auto-assignment more consistently so queue work is shared more fairly.",
      });
    }
  }

  const lowCompletionBarber = rankedBarbers.find(
    (barber) => barber.total_tokens >= 5 && barber.completion_rate < 60
  );
  if (lowCompletionBarber) {
    pushInsight(insights, {
      priority: "high",
      category: "staff",
      title: `${lowCompletionBarber.barber_name} has a weak completion pattern`,
      message: `${lowCompletionBarber.barber_name} completed only ${round(
        lowCompletionBarber.completion_rate
      )}% of assigned tokens in this period.`,
      action:
        "Check if this barber needs schedule support, better front-desk coordination, or a cleaner status-updating process.",
    });
  }

  return insights.slice(0, 8);
}

function buildDashboardInsights({ dashboard, tokens }) {
  const insights = [];
  const waitingTokens = tokens.filter((token) => token.status === "waiting").length;
  const inProgressTokens = tokens.filter(
    (token) => token.status === "in_progress"
  ).length;

  if (waitingTokens >= 5) {
    pushInsight(insights, {
      priority: "high",
      category: "operations",
      title: "The live queue is getting heavy",
      message: `${waitingTokens} customers are currently waiting in the system.`,
      action:
        "Check barber availability, push delayed tokens forward, and open more chair capacity if possible.",
    });
  }

  if (!dashboard.total_invoices_today && dashboard.total_tokens_today > 0) {
    pushInsight(insights, {
      priority: "high",
      category: "billing",
      title: "Queue activity exists but billing is missing",
      message:
        "Today's service flow has started, but matching invoice volume is not yet visible.",
      action:
        "Make sure every finished service is closed through the invoice screen so reporting stays accurate.",
    });
  }

  if (dashboard.total_appointments_today > dashboard.total_tokens_today * 1.5) {
    pushInsight(insights, {
      priority: "medium",
      category: "booking",
      title: "Appointments are driving most demand today",
      message:
        "Booked traffic is stronger than walk-in traffic, which changes how staffing and reception should be planned.",
      action:
        "Make sure reception and barbers are ready for time-based bookings and reduce idle gaps between appointments.",
    });
  }

  if (inProgressTokens > 0 && waitingTokens === 0) {
    pushInsight(insights, {
      priority: "low",
      category: "operations",
      title: "Queue flow looks healthy right now",
      message:
        "Customers are currently being handled without a visible waiting backlog.",
      action:
        "Keep barber statuses updated so the auto-assignment logic stays accurate through the day.",
    });
  }

  return insights.slice(0, 4);
}

module.exports = {
  buildReportInsights,
  buildDashboardInsights,
};
