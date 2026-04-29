function normalizeNumber(value) {
  return Number(value || 0);
}

function buildLoyaltyRewards(loyaltyPoints) {
  const points = Number(loyaltyPoints || 0);

  return [
    {
      id: "free_wash",
      label: "Free Wash",
      points_required: 10,
      eligible: points >= 10,
      description: "Offer a free wash to encourage the next repeat visit.",
    },
    {
      id: "beard_discount",
      label: "10% Beard Discount",
      points_required: 20,
      eligible: points >= 20,
      description: "A simple loyalty reward for beard trim or grooming service.",
    },
    {
      id: "vip_upgrade",
      label: "VIP Candidate",
      points_required: 35,
      eligible: points >= 35,
      description: "This customer is strong enough to consider for VIP treatment.",
    },
  ];
}

function buildVipSuggestion({ totalSpent, totalVisits, loyaltyPoints, isVip }) {
  const spent = normalizeNumber(totalSpent);
  const visits = Number(totalVisits || 0);
  const points = Number(loyaltyPoints || 0);

  if (isVip) {
    return {
      should_suggest: false,
      level: "active",
      title: "Customer is already VIP",
      reason: "This customer already has VIP status in HMS.",
    };
  }

  if (spent >= 5000 || visits >= 8 || points >= 35) {
    return {
      should_suggest: true,
      level: "strong",
      title: "Strong VIP candidate",
      reason:
        "This customer has high spend, frequent visits, or enough loyalty points to deserve VIP review.",
    };
  }

  if (spent >= 2500 || visits >= 5 || points >= 20) {
    return {
      should_suggest: true,
      level: "watch",
      title: "Watch for VIP upgrade",
      reason:
        "This customer is becoming a strong repeat client and may be ready for future VIP treatment.",
    };
  }

  return {
    should_suggest: false,
    level: "standard",
    title: "Standard customer",
    reason: "Keep building loyalty through repeat visits and points.",
  };
}

module.exports = {
  buildLoyaltyRewards,
  buildVipSuggestion,
};
