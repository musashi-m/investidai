// Motor de Cálculo de Renda Fixa em JavaScript (Regras ANBIMA / B3)

function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getBrazilianHolidays(year) {
  const easter = getEasterDate(year);
  const addDays = (d, days) => new Date(d.getTime() + days * 86400000);

  const carnivalMonday = addDays(easter, -48);
  const carnivalTuesday = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  const formatDate = (date) => date.toISOString().split('T')[0];

  return new Set([
    `${year}-01-01`, // Confraternização Universal
    formatDate(carnivalMonday),
    formatDate(carnivalTuesday),
    formatDate(goodFriday),
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalho
    formatDate(corpusChristi),
    `${year}-09-07`, // Independência
    `${year}-10-12`, // N. Sra. Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-11-20`, // Dia da Consciência Negra (Lei 14.759/2023)
    `${year}-12-25`, // Natal
  ]);
}

export function countBusinessDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  if (start >= end) return 0;

  const holidaysCache = {};
  let current = new Date(start.getTime());
  let businessDays = 0;

  while (current < end) {
    const year = current.getUTCFullYear();
    if (!holidaysCache[year]) {
      holidaysCache[year] = getBrazilianHolidays(year);
    }

    const dayOfWeek = current.getUTCDay(); // 0 = Domingo, 6 = Sábado
    const dateStr = current.toISOString().split('T')[0];

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysCache[year].has(dateStr)) {
      businessDays++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return businessDays;
}

export function isBusinessDay(dateObj) {
  const d = dateObj || new Date();
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  const holidays = getBrazilianHolidays(d.getFullYear());
  const dateStr = d.toISOString().split('T')[0];
  return !holidays.has(dateStr);
}

export function calculateIncomeTaxRate(calendarDays, isTaxFree) {
  if (isTaxFree) return 0.0;
  if (calendarDays <= 180) return 22.5;
  if (calendarDays <= 360) return 20.0;
  if (calendarDays <= 720) return 17.5;
  return 15.0;
}

export function calculateFixedIncomePosition({
  initial_amount,
  start_date,
  maturity_date,
  indexer_type = 'CDI',
  indexer_rate = 100,
  is_tax_free = false,
  selic_annual = 13.75,
  cdi_annual = 13.65,
  ipca_annual = 4.58,
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const startStr = start_date || todayStr;
  let calcDateStr = todayStr;
  let isMatured = false;

  if (maturity_date && todayStr > maturity_date) {
    calcDateStr = maturity_date;
    isMatured = true;
  }

  const startDate = new Date(startStr + 'T00:00:00Z');
  const calcDate = new Date(calcDateStr + 'T00:00:00Z');
  const today = new Date(todayStr + 'T00:00:00Z');

  const calendarDays = Math.max(0, Math.floor((calcDate - startDate) / 86400000));
  const businessDays = countBusinessDays(startStr, calcDateStr);

  let daysLeft = null;
  let progressPercent = 0.0;
  if (maturity_date) {
    const matDate = new Date(maturity_date + 'T00:00:00Z');
    const totalDays = Math.max(1, Math.floor((matDate - startDate) / 86400000));
    const elapsedDays = Math.max(0, Math.floor((today - startDate) / 86400000));
    progressPercent = Math.min(100.0, Math.max(0.0, (elapsedDays / totalDays) * 100.0));
    daysLeft = Math.floor((matDate - today) / 86400000);
  }

  const idxType = (indexer_type || 'CDI').toUpperCase().trim();
  const idxRate = parseFloat(indexer_rate) || 100;
  const initial = parseFloat(initial_amount) || 0;

  const cdiDec = cdi_annual / 100.0;
  const selicDec = selic_annual / 100.0;
  const ipcaDec = ipca_annual / 100.0;

  let dailyYieldFactor = 0.0;
  let accumulatedFactor = 1.0;

  if (idxType === 'CDI') {
    // Fórmula oficial ANBIMA: Fator diário = ((1 + CDI)^(1/252) - 1) * (%CDI / 100)
    const daily100 = Math.pow(1.0 + cdiDec, 1.0 / 252.0) - 1.0;
    dailyYieldFactor = daily100 * (idxRate / 100.0);
    if (businessDays > 0) {
      accumulatedFactor = Math.pow(1.0 + dailyYieldFactor, businessDays);
    }
  } else if (idxType === 'SELIC') {
    const totalAnnual = selicDec + (idxRate / 100.0);
    dailyYieldFactor = Math.pow(1.0 + totalAnnual, 1.0 / 252.0) - 1.0;
    if (businessDays > 0) {
      accumulatedFactor = Math.pow(1.0 + totalAnnual, businessDays / 252.0);
    }
  } else if (idxType === 'PREFIXADO') {
    const annualRate = idxRate / 100.0;
    dailyYieldFactor = Math.pow(1.0 + annualRate, 1.0 / 252.0) - 1.0;
    if (businessDays > 0) {
      accumulatedFactor = Math.pow(1.0 + annualRate, businessDays / 252.0);
    }
  } else if (idxType === 'IPCA') {
    const realRate = idxRate / 100.0;
    const hybridAnnual = ((1.0 + ipcaDec) * (1.0 + realRate)) - 1.0;
    dailyYieldFactor = Math.pow(1.0 + hybridAnnual, 1.0 / 252.0) - 1.0;
    if (businessDays > 0) {
      accumulatedFactor = Math.pow(1.0 + hybridAnnual, businessDays / 252.0);
    }
  } else {
    const annualRate = idxRate / 100.0;
    dailyYieldFactor = Math.pow(1.0 + annualRate, 1.0 / 252.0) - 1.0;
    if (businessDays > 0) {
      accumulatedFactor = Math.pow(1.0 + annualRate, businessDays / 252.0);
    }
  }

  const grossAmount = initial * accumulatedFactor;
  const grossProfit = grossAmount - initial;
  const grossProfitPercent = initial > 0 ? (grossProfit / initial) * 100.0 : 0.0;

  const irRate = calculateIncomeTaxRate(calendarDays, is_tax_free);
  const irAmount = grossProfit > 0 ? grossProfit * (irRate / 100.0) : 0.0;
  const netAmount = grossAmount - irAmount;
  const netProfit = grossProfit - irAmount;
  const netProfitPercent = initial > 0 ? (netProfit / initial) * 100.0 : 0.0;

  const estimatedDailyGain = !isMatured ? grossAmount * dailyYieldFactor : 0.0;

  let indexerLabel = `${idxRate}%`;
  if (idxType === 'CDI') indexerLabel = `${idxRate}% do CDI`;
  else if (idxType === 'IPCA') indexerLabel = `IPCA + ${idxRate}% a.a.`;
  else if (idxType === 'PREFIXADO') indexerLabel = `${idxRate}% a.a.`;
  else if (idxType === 'SELIC') indexerLabel = idxRate > 0 ? `Selic + ${idxRate}%` : 'Selic 100%';

  return {
    initial_amount: Math.round(initial * 100) / 100,
    current_amount: Math.round(grossAmount * 100) / 100,
    gross_profit: Math.round(grossProfit * 100) / 100,
    gross_profit_percent: Math.round(grossProfitPercent * 100) / 100,
    net_amount: Math.round(netAmount * 100) / 100,
    net_profit: Math.round(netProfit * 100) / 100,
    net_profit_percent: Math.round(netProfitPercent * 100) / 100,
    ir_rate: irRate,
    ir_amount: Math.round(irAmount * 100) / 100,
    calendar_days: calendarDays,
    business_days: businessDays,
    days_left: daysLeft,
    progress_percent: Math.round(progressPercent * 10) / 10,
    is_matured: isMatured,
    estimated_daily_gain: Math.round(estimatedDailyGain * 100) / 100,
    daily_yield_percent: Math.round(dailyYieldFactor * 10000) / 100,
    indexer_label: indexerLabel,
  };
}

