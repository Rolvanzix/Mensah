import { ConfidenceLevel, CopyMode, RecommendationAnalysis, SimulationPoint, SimulationResult, SimulatorParams, Trader } from '../types/strike';
import { getDrawdown30d } from '../services/strikeApi';

/**
 * Run historical copy simulation for a given trader and parameter set
 */
export function runCopySimulation(
  trader: Trader,
  params: SimulatorParams
): SimulationResult {
  const { capital, copyMode, leverage, maxMarginPerSymbol, fixedAmountPerTrade, feeBufferBps } = params;

  const equityCurve = trader.equity_curve_30d || [];
  const pnlCurve = trader.pnl_curve_30d || [];

  if (equityCurve.length < 2) {
    return {
      mode: copyMode,
      initialCapital: capital,
      finalEquity: capital,
      netPnL: 0,
      roiPct: 0,
      maxDrawdownPct: 0,
      maxDrawdownUsd: 0,
      profitFactor: 1,
      winPeriodsPct: 0,
      curve: [],
      liquidated: false,
      warnings: ['Insufficient curve points to run accurate simulation (requires >= 2 steps).'],
    };
  }

  const warnings: string[] = [];
  const feeRate = (feeBufferBps || 0) / 10000; // e.g. 10 bps = 0.0010 (0.10%)
  const curvePoints: SimulationPoint[] = [];

  let currentEquity = capital;
  let peakEquity = capital;
  let maxDrawdownUsd = 0;
  let maxDrawdownPct = 0;
  let grossProfits = 0;
  let grossLosses = 0;
  let winSteps = 0;
  let totalSteps = 0;
  let liquidated = false;

  const t0 = equityCurve[0][0];
  curvePoints.push({
    timestamp: t0,
    traderEquity: parseFloat(equityCurve[0][1]) || 0,
    simulatedEquity: currentEquity,
    simulatedPnL: 0,
    drawdownPct: 0,
  });

  // Calculate trader's average base equity
  const initialTraderEquity = Math.max(parseFloat(equityCurve[0][1]) || 1, 1000);

  for (let i = 1; i < equityCurve.length; i++) {
    if (liquidated) {
      curvePoints.push({
        timestamp: equityCurve[i][0],
        traderEquity: parseFloat(equityCurve[i][1]) || 0,
        simulatedEquity: 0,
        simulatedPnL: -capital,
        drawdownPct: 100,
      });
      continue;
    }

    const prevTraderEquity = parseFloat(equityCurve[i - 1][1]) || initialTraderEquity;
    const currTraderEquity = parseFloat(equityCurve[i][1]) || prevTraderEquity;

    // Period rate of return of the lead trader
    const rawStepReturn = prevTraderEquity > 0
      ? (currTraderEquity - prevTraderEquity) / prevTraderEquity
      : 0;

    let periodPnL = 0;

    if (copyMode === 'fixed_ratio') {
      // User allocates proportionally to current capital with leverage
      // Capped by max margin per symbol constraint if applicable
      const effectiveCapital = currentEquity;
      const nominalTradeExposure = effectiveCapital * leverage;
      
      // If maxMarginPerSymbol is specified and smaller than nominalTradeExposure
      const cappedExposure = maxMarginPerSymbol > 0
        ? Math.min(nominalTradeExposure, maxMarginPerSymbol * leverage)
        : nominalTradeExposure;

      const rawPnL = cappedExposure * rawStepReturn;
      const fees = Math.abs(cappedExposure) * feeRate * 0.5; // per-period turnover fee
      periodPnL = rawPnL - fees;
    } else {
      // Fixed Amount mode: User commits a fixed dollar margin per position
      const fixedBase = Math.min(fixedAmountPerTrade || (capital * 0.25), currentEquity);
      const fixedExposure = maxMarginPerSymbol > 0
        ? Math.min(fixedBase * leverage, maxMarginPerSymbol * leverage)
        : fixedBase * leverage;

      const rawPnL = fixedExposure * rawStepReturn;
      const fees = Math.abs(fixedExposure) * feeRate * 0.5;
      periodPnL = rawPnL - fees;
    }

    if (periodPnL > 0) {
      grossProfits += periodPnL;
      winSteps++;
    } else if (periodPnL < 0) {
      grossLosses += Math.abs(periodPnL);
    }
    totalSteps++;

    currentEquity += periodPnL;

    // Check liquidation threshold (if equity drops below 5% of initial or <= 0)
    if (currentEquity <= capital * 0.05) {
      currentEquity = 0;
      liquidated = true;
      warnings.push(`Liquidation occurred at step ${i} due to high leverage or severe drawdown.`);
    }

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }

    const currentDdUsd = Math.max(0, peakEquity - currentEquity);
    const currentDdPct = peakEquity > 0 ? (currentDdUsd / peakEquity) * 100 : 0;

    if (currentDdUsd > maxDrawdownUsd) maxDrawdownUsd = currentDdUsd;
    if (currentDdPct > maxDrawdownPct) maxDrawdownPct = currentDdPct;

    curvePoints.push({
      timestamp: equityCurve[i][0],
      traderEquity: currTraderEquity,
      simulatedEquity: Math.max(0, currentEquity),
      simulatedPnL: currentEquity - capital,
      drawdownPct: currentDdPct,
    });
  }

  const netPnL = currentEquity - capital;
  const roiPct = capital > 0 ? (netPnL / capital) * 100 : 0;
  const profitFactor = grossLosses > 0 ? grossProfits / grossLosses : grossProfits > 0 ? 99.9 : 1.0;
  const winPeriodsPct = totalSteps > 0 ? (winSteps / totalSteps) * 100 : 0;

  // Additional safety warnings
  const traderMaxDd = getDrawdown30d(trader);
  if (leverage > 3 && traderMaxDd > 20) {
    warnings.push(`Caution: Trader had a ${traderMaxDd.toFixed(1)}% 30d drawdown. Using ${leverage}x leverage significantly raises risk of liquidation.`);
  }

  const peakEntries = parseFloat(trader.peak_concurrent_entries || '5');
  if (copyMode === 'fixed_amount' && (fixedAmountPerTrade * peakEntries) > capital) {
    warnings.push(`Trader holds up to ${Math.round(peakEntries)} concurrent positions. Your fixed amount per trade ($${fixedAmountPerTrade}) exceeds total balance when fully deployed.`);
  }

  return {
    mode: copyMode,
    initialCapital: capital,
    finalEquity: currentEquity,
    netPnL,
    roiPct,
    maxDrawdownPct,
    maxDrawdownUsd,
    profitFactor,
    winPeriodsPct,
    curve: curvePoints,
    liquidated,
    warnings,
  };
}

/**
 * Calculate advanced recommendation analysis for a trader based on Strike metrics and simulation
 */
export function getAdvancedRecommendation(
  trader: Trader,
  userCapital: number,
  baseParams?: Partial<SimulatorParams>
): RecommendationAnalysis {
  const ddPct = getDrawdown30d(trader);
  const peakEntries = Math.max(1, Math.round(parseFloat(trader.peak_concurrent_entries || '4')));
  const copyScore = parseFloat(trader.copy_score || '50');
  const style = (trader.style || 'swing').toLowerCase();
  const dataPointsCount = trader.equity_curve_30d?.length || 0;

  // 1. Determine optimal leverage based on trader style and historical drawdown
  let recLeverage = 1;
  if (ddPct < 10) {
    recLeverage = (style === 'day' || style === 'scalp') ? 2 : 3;
  } else if (ddPct < 22) {
    recLeverage = 2;
  } else {
    recLeverage = 1; // High drawdown requires 1x spot/perp safety
  }

  // 2. Position sizing recommendations based on user capital and style
  let sizeFraction = 1 / Math.max(peakEntries * 1.35, 3);
  if (style === 'day' || style === 'scalp') {
    sizeFraction = Math.min(sizeFraction, 0.15);
  } else if (style === 'swing' || style === 'momentum') {
    sizeFraction = Math.max(sizeFraction, 0.18);
  }
  sizeFraction = Math.min(Math.max(sizeFraction, 0.08), 0.30);

  const suggestedMaxMarginPerSymbol = Math.max(100, Math.round(userCapital * sizeFraction));
  const suggestedPositionSizeUsd = Math.max(50, Math.round(userCapital / Math.max(peakEntries * 1.4, 3)));
  const suggestedPositionSizePct = Math.round((suggestedPositionSizeUsd / userCapital) * 100);

  // 3. Run both simulation modes with aligned sizing
  const defaultFeeBps = baseParams?.feeBufferBps ?? 8;

  const ratioResult = runCopySimulation(trader, {
    capital: userCapital,
    copyMode: 'fixed_ratio',
    leverage: recLeverage,
    maxMarginPerSymbol: suggestedMaxMarginPerSymbol,
    fixedAmountPerTrade: suggestedPositionSizeUsd,
    feeBufferBps: defaultFeeBps,
  });

  const amountResult = runCopySimulation(trader, {
    capital: userCapital,
    copyMode: 'fixed_amount',
    leverage: recLeverage,
    maxMarginPerSymbol: suggestedMaxMarginPerSymbol,
    fixedAmountPerTrade: suggestedPositionSizeUsd,
    feeBufferBps: defaultFeeBps,
  });

  // 4. Calculate Risk-Adjusted Score = Net PnL / Max Drawdown (higher is better)
  const minDdFloor = Math.max(1, userCapital * 0.005); // $5 min floor on $1000 to prevent division by zero
  const ratioDdUsd = Math.max(ratioResult.maxDrawdownUsd, minDdFloor);
  const amountDdUsd = Math.max(amountResult.maxDrawdownUsd, minDdFloor);

  const ratioScore = ratioResult.netPnL / ratioDdUsd;
  const amountScore = amountResult.netPnL / amountDdUsd;

  // 5. Compare scores and determine winner (with 10% tiebreaker)
  const maxAbsScore = Math.max(Math.abs(ratioScore), Math.abs(amountScore), 0.001);
  const scoreDiffPct = (Math.abs(ratioScore - amountScore) / maxAbsScore) * 100;
  const sameDirection = (ratioScore >= 0 && amountScore >= 0) || (ratioScore < 0 && amountScore < 0);
  const wasCloseCall = sameDirection && scoreDiffPct <= 10;

  let winnerMode: CopyMode;
  let decisionRationale = '';
  let explanation = '';

  if (wasCloseCall) {
    // Within 10%: prefer the mode with lower max drawdown
    if (amountResult.maxDrawdownPct < ratioResult.maxDrawdownPct) {
      winnerMode = 'fixed_amount';
      decisionRationale = `Scores are within 10% (${amountScore.toFixed(2)} vs ${ratioScore.toFixed(2)}). Fixed Amount won tie-breaker with lower peak drawdown (${amountResult.maxDrawdownPct.toFixed(1)}% vs ${ratioResult.maxDrawdownPct.toFixed(1)}%).`;
      explanation = `Fixed Amount is recommended for lower downside volatility. Because both modes produced comparable risk-adjusted returns, Fixed Amount protects capital better during adverse market swings.`;
    } else {
      winnerMode = 'fixed_ratio';
      decisionRationale = `Scores are within 10% (${ratioScore.toFixed(2)} vs ${amountScore.toFixed(2)}). Fixed Ratio won tie-breaker with lower peak drawdown (${ratioResult.maxDrawdownPct.toFixed(1)}% vs ${amountResult.maxDrawdownPct.toFixed(1)}%).`;
      explanation = `Fixed Ratio is recommended for superior downside control. Both modes performed similarly on risk-adjusted metrics, but Fixed Ratio restricted max drawdown to ${ratioResult.maxDrawdownPct.toFixed(1)}%.`;
    }
  } else {
    if (ratioScore > amountScore) {
      winnerMode = 'fixed_ratio';
      decisionRationale = `Fixed Ratio achieved a significantly higher risk-adjusted score (${ratioScore.toFixed(2)} vs ${amountScore.toFixed(2)}, +${scoreDiffPct.toFixed(0)}% better efficiency).`;
      explanation = `Fixed Ratio generated superior profit per dollar of drawdown risk ($${ratioResult.netPnL >= 0 ? '+' : ''}${Math.round(ratioResult.netPnL)} net profit with ${ratioResult.maxDrawdownPct.toFixed(1)}% max DD). It compounds wins and downscales sizing during drawdowns.`;
    } else {
      winnerMode = 'fixed_amount';
      decisionRationale = `Fixed Amount achieved a significantly higher risk-adjusted score (${amountScore.toFixed(2)} vs ${ratioScore.toFixed(2)}, +${scoreDiffPct.toFixed(0)}% better efficiency).`;
      explanation = `Fixed Amount generated superior profit per dollar of drawdown risk. Maintaining a disciplined position size of $${suggestedPositionSizeUsd} limited exposure and prevented oversized losses during volatile runs.`;
    }
  }

  const winnerScore = winnerMode === 'fixed_ratio' ? ratioScore : amountScore;
  const alternateMode: CopyMode = winnerMode === 'fixed_ratio' ? 'fixed_amount' : 'fixed_ratio';
  const alternateScore = winnerMode === 'fixed_ratio' ? amountScore : ratioScore;

  // 6. Confidence indicator
  const consistencyPct = Math.round(
    winnerMode === 'fixed_ratio' ? ratioResult.winPeriodsPct : amountResult.winPeriodsPct
  );

  let pointScore = 0;
  if (dataPointsCount >= 35) pointScore = 40;
  else if (dataPointsCount >= 20) pointScore = 30;
  else if (dataPointsCount >= 10) pointScore = 18;
  else pointScore = 8;

  let consistencyScore = 0;
  if (consistencyPct >= 65) consistencyScore = 35;
  else if (consistencyPct >= 50) consistencyScore = 25;
  else consistencyScore = 12;

  let scoreWeight = 0;
  if (copyScore >= 70) scoreWeight = 25;
  else if (copyScore >= 50) scoreWeight = 18;
  else scoreWeight = 8;

  const totalConfidenceScore = pointScore + consistencyScore + scoreWeight;
  let confidence: ConfidenceLevel = 'Medium';
  let confidenceReasoning = '';

  if (totalConfidenceScore >= 72 && dataPointsCount >= 20) {
    confidence = 'High';
    confidenceReasoning = `High confidence based on ${dataPointsCount} verified curve snapshots, ${consistencyPct}% winning step consistency, and a strong Strike rating of ${copyScore.toFixed(0)}.`;
  } else if (totalConfidenceScore >= 45 && dataPointsCount >= 8) {
    confidence = 'Medium';
    confidenceReasoning = `Medium confidence: sufficient performance track record (${dataPointsCount} data points) with moderate variance. Sizing recommendation is calibrated for safety.`;
  } else {
    confidence = 'Low';
    confidenceReasoning = `Low confidence: limited sample size (${dataPointsCount} data points) or high drawdown volatility. Exercise caution and consider smaller sizing.`;
  }

  const sizingReasoning = `For a $${userCapital.toLocaleString()} portfolio with ${style} style and ${Math.round(peakEntries)} peak positions: deploy ~$${suggestedPositionSizeUsd} (~${suggestedPositionSizePct}%) per trade with ${recLeverage}x leverage and a $${suggestedMaxMarginPerSymbol} max margin cap.`;

  const reasoning: string[] = [
    decisionRationale,
    `Risk-Adjusted Efficiency: ${winnerMode === 'fixed_ratio' ? 'Fixed Ratio' : 'Fixed Amount'} score = ${winnerScore.toFixed(2)} (Net PnL / Max Drawdown).`,
    `Optimal Leverage: ${recLeverage}x recommended based on ${ddPct.toFixed(1)}% historical drawdown and ${style} style.`,
    `Position Sizing: ~$${suggestedPositionSizeUsd} margin per trade (${suggestedPositionSizePct}% of balance) across up to ${peakEntries} concurrent positions.`,
  ];

  return {
    winnerMode,
    winnerScore,
    alternateMode,
    alternateScore,
    scoreDifferencePct: scoreDiffPct,
    wasCloseCall,
    decisionRationale,
    explanation,
    recommendedLeverage: recLeverage,
    suggestedPositionSizeUsd,
    suggestedPositionSizePct,
    suggestedMaxMarginPerSymbol,
    maxRecommendedPositions: peakEntries,
    sizingReasoning,
    confidence,
    confidenceScore: totalConfidenceScore,
    confidenceReasoning,
    dataPointsCount,
    consistencyPct,
    suggestedParams: {
      copyMode: winnerMode,
      leverage: recLeverage,
      maxMarginPerSymbol: suggestedMaxMarginPerSymbol,
      fixedAmountPerTrade: suggestedPositionSizeUsd,
    },
    reasoning,
  };
}

/**
 * Calculate recommended copy settings for a trader based on Strike metrics
 */
export function getRecommendedSettings(trader: Trader, userCapital: number): {
  recommendedMode: CopyMode;
  recommendedLeverage: number;
  recommendedMaxMargin: number;
  recommendedFixedAmount: number;
  minRecommendedCapital: number;
  reasoning: string[];
  analysis?: RecommendationAnalysis;
} {
  const analysis = getAdvancedRecommendation(trader, userCapital);

  return {
    recommendedMode: analysis.winnerMode,
    recommendedLeverage: analysis.recommendedLeverage,
    recommendedMaxMargin: analysis.suggestedMaxMarginPerSymbol,
    recommendedFixedAmount: analysis.suggestedPositionSizeUsd,
    minRecommendedCapital: Math.max(250, Math.round(analysis.suggestedPositionSizeUsd * 2)),
    reasoning: analysis.reasoning,
    analysis,
  };
}

