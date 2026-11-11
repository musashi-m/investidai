import datetime
from typing import Dict, Any, Optional, Set

def get_easter_date(year: int) -> datetime.date:
    """Calcula a data da Páscoa para qualquer ano pelo algoritmo de Meeus/Jones/Butcher."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return datetime.date(year, month, day)

def get_brazilian_holidays(year: int) -> Set[datetime.date]:
    """Retorna o conjunto de feriados nacionais bancários do Brasil (ANBIMA / B3)."""
    easter = get_easter_date(year)
    carnival_monday = easter - datetime.timedelta(days=48)
    carnival_tuesday = easter - datetime.timedelta(days=47)
    good_friday = easter - datetime.timedelta(days=2) # Sexta-feira da Paixão
    corpus_christi = easter + datetime.timedelta(days=60)

    holidays = {
        datetime.date(year, 1, 1),    # Confraternização Universal
        carnival_monday,              # Segunda de Carnaval
        carnival_tuesday,             # Terça de Carnaval
        good_friday,                  # Sexta-feira Santa
        datetime.date(year, 4, 21),   # Tiradentes
        datetime.date(year, 5, 1),    # Dia do Trabalho
        corpus_christi,               # Corpus Christi
        datetime.date(year, 9, 7),    # Independência do Brasil
        datetime.date(year, 10, 12),  # N. Sra. Aparecida
        datetime.date(year, 11, 2),   # Finados
        datetime.date(year, 11, 15),  # Proclamação da República
        datetime.date(year, 11, 20),  # Dia da Consciência Negra (Lei 14.759/23)
        datetime.date(year, 12, 25),  # Natal
    }
    return holidays

def count_business_days(start_date: datetime.date, end_date: datetime.date) -> int:
    """
    Conta os dias úteis (dias de rendimento) entre duas datas,
    excluindo sábados, domingos e feriados nacionais brasileiros.
    """
    if start_date >= end_date:
        return 0

    holidays_cache = {}
    current = start_date
    business_days = 0

    while current < end_date:
        year = current.year
        if year not in holidays_cache:
            holidays_cache[year] = get_brazilian_holidays(year)

        # Dia útil = Segunda a Sexta e não feriado
        if current.weekday() < 5 and current not in holidays_cache[year]:
            business_days += 1

        current += datetime.timedelta(days=1)

    return business_days

def is_business_day(d: datetime.date) -> bool:
    """Verifica se uma data específica é dia útil com rendimento."""
    if d.weekday() >= 5:
        return False
    holidays = get_brazilian_holidays(d.year)
    return d not in holidays

def calculate_income_tax_rate(days_calendar: int, is_tax_free: bool = False) -> float:
    """
    Tabela regressiva de IR para Renda Fixa:
    - Até 180 dias corridos: 22.5%
    - 181 a 360 dias: 20.0%
    - 361 a 720 dias: 17.5%
    - Acima de 720 dias: 15.0%
    - LCI/LCA/CRI/CRA: 0.0% (Isento)
    """
    if is_tax_free:
        return 0.0
    if days_calendar <= 180:
        return 22.5
    elif days_calendar <= 360:
        return 20.0
    elif days_calendar <= 720:
        return 17.5
    else:
        return 15.0

def calculate_fixed_income_position(
    initial_amount: float,
    start_date_str: str,
    maturity_date_str: Optional[str],
    indexer_type: str,
    indexer_rate: float,
    selic_rate_annual: float,
    cdi_rate_annual: float,
    ipca_rate_annual: float,
    is_tax_free: bool = False,
    override_current_amount: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calcula automaticamente o rendimento acumulado de um ativo de renda fixa
    de acordo com as regras reais de mercado:
    - Dias úteis (convenção 252 DU/ano)
    - CDI diário composto (Fórmula padrão ANBIMA)
    - Selic diária composta
    - Prefixado diário composto
    - IPCA + juro real
    - Alíquota regressiva de Imposto de Renda
    - Rendimento diário estimado para o próximo dia útil
    """
    today = datetime.date.today()
    try:
        start_date = datetime.date.fromisoformat(start_date_str)
    except Exception:
        start_date = today

    maturity_date = None
    if maturity_date_str:
        try:
            maturity_date = datetime.date.fromisoformat(maturity_date_str)
        except Exception:
            pass

    # A data de corte para cálculo é hoje ou a data de vencimento (o que for menor)
    calc_date = today
    is_matured = False
    if maturity_date and today > maturity_date:
        calc_date = maturity_date
        is_matured = True

    # Dias corridos e dias úteis decorridos
    calendar_days = max(0, (calc_date - start_date).days)
    business_days = count_business_days(start_date, calc_date)

    # Dias restantes para o vencimento
    days_left = None
    progress_percent = 0.0
    if maturity_date:
        total_days = max(1, (maturity_date - start_date).days)
        elapsed_days = max(0, (today - start_date).days)
        progress_percent = min(100.0, max(0.0, (elapsed_days / total_days) * 100.0))
        days_left = (maturity_date - today).days

    idx_type = indexer_type.upper().strip()
    idx_rate = float(indexer_rate)

    # Taxa CDI e Selic decimais
    cdi_dec = cdi_rate_annual / 100.0
    selic_dec = selic_rate_annual / 100.0
    ipca_dec = ipca_rate_annual / 100.0

    # 1. Cálculo do Fator Diário e Acumulado
    daily_yield_factor = 0.0
    accumulated_factor = 1.0

    if idx_type == "CDI":
        # Fórmula oficial ANBIMA:
        # Fator diário do CDI 100%: (1 + CDI_anual)^(1/252) - 1
        # Fator diário do ativo: fator_diario_100 * (% do CDI / 100)
        daily_100_cdi = ((1.0 + cdi_dec) ** (1.0 / 252.0)) - 1.0
        daily_yield_factor = daily_100_cdi * (idx_rate / 100.0)
        if business_days > 0:
            accumulated_factor = (1.0 + daily_yield_factor) ** business_days

    elif idx_type == "SELIC":
        # Selic anual + spread (ex: 13.75 + 0.15 = 13.90% a.a.)
        total_annual = selic_dec + (idx_rate / 100.0)
        daily_yield_factor = ((1.0 + total_annual) ** (1.0 / 252.0)) - 1.0
        if business_days > 0:
            accumulated_factor = (1.0 + total_annual) ** (business_days / 252.0)

    elif idx_type == "PREFIXADO":
        # Prefixado a.a. (ex: 13.5% a.a.)
        annual_rate = idx_rate / 100.0
        daily_yield_factor = ((1.0 + annual_rate) ** (1.0 / 252.0)) - 1.0
        if business_days > 0:
            accumulated_factor = (1.0 + annual_rate) ** (business_days / 252.0)

    elif idx_type == "IPCA":
        # IPCA + Juro Real: (1 + IPCA) * (1 + Taxa) - 1
        real_rate = idx_rate / 100.0
        hybrid_annual = ((1.0 + ipca_dec) * (1.0 + real_rate)) - 1.0
        daily_yield_factor = ((1.0 + hybrid_annual) ** (1.0 / 252.0)) - 1.0
        if business_days > 0:
            accumulated_factor = (1.0 + hybrid_annual) ** (business_days / 252.0)

    else:
        # Fallback padrão
        annual_rate = idx_rate / 100.0
        daily_yield_factor = ((1.0 + annual_rate) ** (1.0 / 252.0)) - 1.0
        if business_days > 0:
            accumulated_factor = (1.0 + annual_rate) ** (business_days / 252.0)

    # 2. Saldo Bruto e Rendimento
    if override_current_amount is not None and override_current_amount > 0 and business_days == 0:
        gross_amount = override_current_amount
    else:
        gross_amount = initial_amount * accumulated_factor

    gross_profit = gross_amount - initial_amount
    gross_profit_percent = ((gross_amount / initial_amount) - 1.0) * 100.0 if initial_amount > 0 else 0.0

    # 3. Imposto de Renda Regressivo
    ir_rate = calculate_income_tax_rate(calendar_days, is_tax_free)
    ir_amount = gross_profit * (ir_rate / 100.0) if gross_profit > 0 else 0.0
    net_amount = gross_amount - ir_amount
    net_profit = gross_profit - ir_amount
    net_profit_percent = ((net_amount / initial_amount) - 1.0) * 100.0 if initial_amount > 0 else 0.0

    # 4. Rendimento diário estimado (R$ por dia útil)
    # Se hoje é dia útil, estima o ganho do dia
    is_today_working_day = is_business_day(today)
    estimated_daily_gain = gross_amount * daily_yield_factor if not is_matured else 0.0

    # Rótulo amigável da taxa
    if idx_type == "CDI":
        indexer_label = f"{idx_rate:g}% do CDI"
    elif idx_type == "IPCA":
        indexer_label = f"IPCA + {idx_rate:g}% a.a."
    elif idx_type == "PREFIXADO":
        indexer_label = f"{idx_rate:g}% a.a."
    elif idx_type == "SELIC":
        indexer_label = f"Selic + {idx_rate:g}%" if idx_rate > 0 else "Selic 100%"
    else:
        indexer_label = f"{idx_rate:g}%"

    return {
        "initial_amount": round(initial_amount, 2),
        "current_amount": round(gross_amount, 2),
        "gross_profit": round(gross_profit, 2),
        "gross_profit_percent": round(gross_profit_percent, 2),
        "net_amount": round(net_amount, 2),
        "net_profit": round(net_profit, 2),
        "net_profit_percent": round(net_profit_percent, 2),
        "ir_rate": ir_rate,
        "ir_amount": round(ir_amount, 2),
        "calendar_days": calendar_days,
        "business_days": business_days,
        "days_left": days_left,
        "progress_percent": round(progress_percent, 1),
        "is_matured": is_matured,
        "is_today_working_day": is_today_working_day,
        "estimated_daily_gain": round(estimated_daily_gain, 2),
        "daily_yield_percent": round(daily_yield_factor * 100.0, 4),
        "indexer_label": indexer_label,
        "applied_rate_info": {
            "cdi_used": cdi_rate_annual,
            "selic_used": selic_rate_annual,
            "ipca_used": ipca_rate_annual
        }
    }

