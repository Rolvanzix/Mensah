import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '2mb' }));

// Initialize GoogleGenAI server-side if key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('[Mensah Server] Failed to initialize GoogleGenAI client:', err);
  }
}

/**
 * Server-side Mensah Intelligence API
 * Receives grounded application data and uses gemini-3.8-flash
 */
app.post('/api/intelligence', async (req: Request, res: Response) => {
  const { userQuery, context } = req.body;

  if (!userQuery || typeof userQuery !== 'string') {
    return res.status(400).json({ error: 'userQuery is required' });
  }

  // If no Gemini client or no key, return fallback signal so client uses grounded deterministic engine
  if (!ai || !process.env.GEMINI_API_KEY) {
    return res.json({
      fallback: true,
      reason: 'No GEMINI_API_KEY configured',
    });
  }

  try {
    const marketSummary = context?.marketContext || 'No real-time market data supplied.';
    const traderSummary = context?.traderContext || 'No active trader profile selected.';
    const simulationSummary = context?.simulationContext || 'No simulation result available.';
    const userCapital = context?.userCapital || 2000;

    const practiceSummary = context?.practiceTradingContext || 'No practice trades currently recorded.';
    const systemInstruction = `You are "Ask MENSAH", a friendly, knowledgeable guide and trading assistant in the MENSAH practice-trading application.
Your primary role is to explain trading concepts in plain English, guide beginners, and explain their practice trades and live market charts.

SIMPLIFIED TERMINOLOGY & GUIDANCE RULES:
1. PLAIN ENGLISH FIRST: Replace complex jargon with short, familiar words:
   - "Unrealized P&L" -> "Current Profit/Loss"
   - "Realized P&L" -> "Closed-Trade Profit/Loss"
   - "Open Positions" -> "Trades Currently Running"
   - "Portfolio Allocation" -> "How Your Funds Are Assigned"
   - "Maximum Drawdown" -> "Largest Historical Loss from a Peak"
   - "Funding Rate" -> "Fee Paid Between Traders for Holding Certain Positions"
   - "Leverage" -> "Control a Larger Position With Less of Your Virtual Balance (Caution: losses also grow faster)"
   - "Liquidation" -> "When a Position Is Automatically Closed Because Losses Are Too Large"
   - "Copy-Trading Simulator" -> "Practise Following Another Trader's Strategy"
2. WHAT LONG AND SHORT MEAN:
   - "Long": You predict the price will rise. You make profit if it goes up, loss if it goes down.
   - "Short": You predict the price will fall. You make profit if it drops, loss if it rises.
3. HOW PRACTICE TRADES WORK: Users are given a persistent $10,000 virtual balance to practise risk-free with actual Strike Finance live prices. Practice trades never execute real orders or risk real money.
4. STOP-LOSS & TAKE-PROFIT:
   - Stop-Loss: Automatically closes your practice trade if the market moves against you to cap your loss.
   - Take-Profit: Automatically closes your practice trade when your target gain is reached to lock in your profit.
5. SHORT, CONCISE RESPONSES: Keep answers short, scannable, and helpful (2-4 brief paragraphs or bullet points).
6. NEVER CLAIM REAL EXECUTION: Remind users that all trading on MENSAH is 100% simulated practice.
7. NAVIGATION GUIDE: Guide users to Home, Markets, Traders, Practice Trading, and Ask MENSAH.

GROUNDED DATA CONTEXT:
[LIVE PERPETUAL MARKETS (Strike Finance)]:
${typeof marketSummary === 'object' ? JSON.stringify(marketSummary, null, 2) : marketSummary}

[SELECTED TRADER]:
${typeof traderSummary === 'object' ? JSON.stringify(traderSummary, null, 2) : traderSummary}

[USER PRACTICE TRADING ACTIVITY & POSITIONS]:
${typeof practiceSummary === 'object' ? JSON.stringify(practiceSummary, null, 2) : practiceSummary}

[USER VIRTUAL CAPITAL BASELINE]:
$${userCapital.toLocaleString()} Virtual USD`;

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Intelligence model timeout (12s)')), 12000);
    });

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userQuery,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    const text = response.text || 'Unable to generate response from intelligence model.';
    return res.json({ text, fallback: false });
  } catch (err: any) {
    console.warn('[Mensah Server] Intelligence fallback activated:', err?.message || err);
    return res.json({
      fallback: true,
      error: err?.message || 'Intelligence API unavailable',
    });
  }
});

/**
 * Proxy for Strike Finance REST API
 */
app.use('/api/strike', async (req: Request, res: Response) => {
  try {
    const targetUrl = `https://api.strikefinance.org${req.url.replace(/^\/api\/strike/, '')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const strikeRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await strikeRes.text();
    res.status(strikeRes.status).set('Content-Type', strikeRes.headers.get('content-type') || 'application/json').send(data);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to proxy request to Strike Finance', details: err?.message });
  }
});

async function startServer() {
  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist/
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Mensah Server] Running on http://0.0.0.0:${port}`);
  });
}

startServer();
