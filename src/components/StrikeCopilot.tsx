import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trader, SimulationResult, RecommendationAnalysis } from '../types/strike';
import {
  CopilotMessage,
  CopilotResponseOutput,
  generateCopilotResponse,
} from '../utils/strikeCopilot';
import {
  formatPercent,
  formatUSD,
  getDrawdown30d,
  getTrader24hVolatility,
  truncateAddress,
} from '../services/strikeApi';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { RiskBarGauge } from './ui/RiskBarGauge';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calculator,
  ChevronDown,
  Compass,
  CornerDownLeft,
  ExternalLink,
  Flame,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';

export interface StrikeCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  activeTrader?: Trader | null;
  allTraders?: Trader[];
  userCapital: number;
  currentView: 'discovery' | 'simulator' | 'watchlist' | 'copilot';
  recommendationAnalysis?: RecommendationAnalysis | null;
  simulationResult?: SimulationResult | null;
  onNavigateToSimulator?: (trader?: Trader) => void;
  onNavigateToDiscovery?: () => void;
  onSelectTrader?: (trader: Trader) => void;
  onExpandToDedicatedPage?: () => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

/**
 * Clean text formatter with markdown bold & bullet support
 */
export const FormattedCopilotText: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split('\n\n');

  return (
    <div className="space-y-3 font-sans text-xs leading-relaxed text-slate-200">
      {paragraphs.map((paragraph, pIdx) => {
        // Bullet list lines
        if (
          paragraph.startsWith('• ') ||
          paragraph.startsWith('- ') ||
          paragraph.startsWith('1. ') ||
          paragraph.startsWith('2. ') ||
          paragraph.startsWith('3. ') ||
          paragraph.startsWith('4. ')
        ) {
          const lines = paragraph.split('\n');
          return (
            <div key={pIdx} className="space-y-2 my-2">
              {lines.map((line, lIdx) => {
                const isBullet = line.trim().startsWith('• ') || line.trim().startsWith('- ');
                const isNumbered = /^\d+\.\s/.test(line.trim());
                const cleanLine = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');

                return (
                  <div key={lIdx} className="flex items-start gap-2.5 text-slate-300">
                    {isBullet && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] shrink-0 mt-1.5 shadow-[0_0_6px_rgba(0,242,157,0.4)]" />
                    )}
                    {isNumbered && (
                      <span className="w-4 h-4 rounded-md bg-[#19202f] border border-[#273248] text-[10px] font-bold text-[#00f29d] flex items-center justify-center shrink-0 mt-0.5">
                        {line.trim().split('.')[0]}
                      </span>
                    )}
                    <div className="flex-1 leading-relaxed">
                      {parseBoldMarkdown(cleanLine)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        return <p key={pIdx}>{parseBoldMarkdown(paragraph)}</p>;
      })}
    </div>
  );
};

function parseBoldMarkdown(content: string): React.ReactNode {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Single Message Bubble with clear visual hierarchy and rich elements
 */
export const CopilotMessageBubble: React.FC<{
  message: CopilotMessage;
  onSendChip: (chip: string) => void;
  onActionClick?: (actionCard: CopilotMessage['actionCard']) => void;
}> = ({ message, onSendChip, onActionClick }) => {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-2.5 pl-8">
        <div className="bg-[#19202f] text-white border border-[#273248] rounded-2xl rounded-tr-xs px-4 py-3 text-xs leading-relaxed max-w-[85%] shadow-sm">
          <p className="whitespace-pre-wrap font-sans">{message.text}</p>
          <div className="text-[10px] text-slate-400 mt-1.5 text-right tabular-nums">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="w-7 h-7 rounded-xl bg-[#19202f] border border-[#273248] text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5 pr-4 sm:pr-8">
      {/* Copilot Subtle Avatar */}
      <div className="w-7 h-7 rounded-xl bg-[#00f29d]/12 border border-[#00f29d]/30 text-[#00f29d] flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-[#00f29d]/10">
        <Bot className="w-4 h-4" />
      </div>

      <div className="space-y-2.5 max-w-[92%] sm:max-w-[88%]">
        {/* Message Container */}
        <div className="bg-[#121722] text-slate-200 border border-[#1c2438] rounded-2xl rounded-tl-xs p-4 text-xs font-sans shadow-sm">
          {/* Header Label */}
          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#1c2438]/80">
            <span className="font-bold text-white text-xs tracking-tight">Strike Copilot</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#00f29d]/15 text-[#00f29d] border border-[#00f29d]/30">
              Risk Engine
            </span>
            <span className="text-[10px] text-slate-500 tabular-nums ml-auto">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Highlighted Warning Banner (If Present) */}
          {message.warningBanner && (
            <div
              className={`mb-3.5 p-3 rounded-xl border flex items-start gap-2.5 ${
                message.warningBanner.type === 'alert'
                  ? 'bg-rose-950/25 border-rose-500/35 text-rose-200'
                  : 'bg-amber-950/25 border-amber-500/35 text-amber-200'
              }`}
            >
              {message.warningBanner.type === 'alert' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-xs text-white">
                  {message.warningBanner.title}
                </div>
                <div className="text-[11px] leading-relaxed mt-0.5 text-slate-300">
                  {message.warningBanner.description}
                </div>
              </div>
            </div>
          )}

          {/* Formatted Text Content */}
          <FormattedCopilotText text={message.text} />

          {/* Action Card (If Present) */}
          {message.actionCard && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-[#0a0d14] border border-[#1c2438] space-y-2 shadow-inner">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                {message.actionCard.type === 'confirmation' ? (
                  <Shield className="w-4 h-4 text-amber-400" />
                ) : message.actionCard.type === 'volatility_warning' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Zap className="w-4 h-4 text-[#00f29d]" />
                )}
                <span>{message.actionCard.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {message.actionCard.description}
              </p>
              {message.actionCard.actionLabel && (
                <button
                  onClick={() => onActionClick && onActionClick(message.actionCard)}
                  className="w-full mt-2 py-2 px-3 bg-[#00f29d] hover:bg-[#50ffae] text-[#003921] font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#00f29d]/20 active:scale-[0.99]"
                >
                  <span>{message.actionCard.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contextual Suggested Reply / Action Chips Under Copilot Message */}
        {message.suggestedChips && message.suggestedChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
            {message.suggestedChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => onSendChip(chip)}
                className="px-2.5 py-1 rounded-lg bg-[#161d2b] hover:bg-[#1f293d] text-slate-300 hover:text-white border border-[#273248] hover:border-[#00f29d]/40 text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-[#00f29d]" />
                <span>{chip}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Slide-over Chat Drawer for Strike Copilot
 */
export const StrikeCopilot: React.FC<StrikeCopilotProps> = ({
  isOpen,
  onClose,
  onOpen,
  activeTrader,
  allTraders = [],
  userCapital,
  currentView,
  recommendationAnalysis,
  simulationResult,
  onNavigateToSimulator,
  onNavigateToDiscovery,
  onSelectTrader,
  onExpandToDedicatedPage,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: `Hello, I'm **Strike Copilot**. I provide calm, risk-adjusted intelligence to help you evaluate lead traders, understand real downside risks, and size your positions prudently before risking any capital.

You can ask me to evaluate any trader, calculate conservative allocation for your capital ($${userCapital.toLocaleString()}), or explain platform mechanics like 24h Drawdown Spikes and Fixed Ratio vs Fixed Amount.`,
      timestamp: Date.now(),
      suggestedChips: [
        activeTrader
          ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
          : 'Compare top traders',
        'Explain risks',
        `How to size a $${userCapital.toLocaleString()} account?`,
        'Fixed Ratio vs Fixed Amount',
      ],
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTraderPickerOpen, setIsTraderPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Handle external prompt injection (e.g. from buttons on TraderCards)
  useEffect(() => {
    if (initialPrompt) {
      if (!isOpen) onOpen();
      handleSend(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const response: CopilotResponseOutput = generateCopilotResponse(text, {
        activeTrader,
        allTraders,
        userCapital,
        currentView,
        recommendationAnalysis,
        simulationResult,
      });

      const copilotMsg: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: response.text,
        timestamp: Date.now(),
        warningBanner: response.warningBanner,
        suggestedChips: response.suggestedChips,
        actionCard: response.actionCard,
      };

      setMessages((prev) => [...prev, copilotMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'copilot',
        text: `Chat reset. I am ready to evaluate traders, size positions for your capital ($${userCapital.toLocaleString()}), or explain any Strike risk concept. How can I assist you?`,
        timestamp: Date.now(),
        suggestedChips: [
          activeTrader
            ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
            : 'Compare top traders',
          'Explain risks',
          `How to size a $${userCapital.toLocaleString()} account?`,
          'Fixed Ratio vs Fixed Amount',
        ],
      },
    ]);
  };

  const quickPrompts = useMemo(() => {
    return [
      activeTrader
        ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
        : 'Compare top traders',
      `How to size a $${userCapital.toLocaleString()} account?`,
      'Explain 24h Volatility Alerts',
      'Fixed Ratio vs Fixed Amount',
      'What leverage is safest for copy trading?',
      'Explain risks',
    ];
  }, [activeTrader, userCapital]);

  const activeTraderVol = activeTrader ? getTrader24hVolatility(activeTrader) : null;

  return (
    <>
      {/* Floating Trigger Button (When Drawer Closed) */}
      {!isOpen && (
        <button
          onClick={onOpen}
          aria-label="Open Strike Copilot"
          className="fixed bottom-6 right-6 z-40 bg-[#121722] hover:bg-[#19202f] text-white border border-[#00f29d]/50 hover:border-[#00f29d] rounded-2xl px-4 py-3 shadow-2xl shadow-[#00f29d]/20 transition-all flex items-center gap-3 group hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-[#00f29d]/15 flex items-center justify-center text-[#00f29d]">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00f29d] animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white group-hover:text-[#00f29d] transition-colors flex items-center gap-1.5">
              <span>Strike Copilot</span>
              <span className="text-[10px] text-[#00f29d] font-semibold bg-[#00f29d]/15 px-1.5 py-0.2 rounded">
                AI
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {activeTrader
                ? `Context: ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
                : 'Risk & Sizing Guide'}
            </div>
          </div>
        </button>
      )}

      {/* Backdrop overlay for drawer on small screens */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Expanded Copilot Panel (Drawer) */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#101520] border-l border-[#1c2438] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="p-4 border-b border-[#1c2438] bg-[#0a0d14] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#00f29d]/15 border border-[#00f29d]/30 flex items-center justify-center text-[#00f29d] shrink-0 shadow-sm shadow-[#00f29d]/10">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white truncate">Strike Copilot</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00f29d]/15 text-[#00f29d] border border-[#00f29d]/30">
                    Downside-First
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] inline-block" />
                  <span>Capital: ${userCapital.toLocaleString()}</span>
                  <span>·</span>
                  <span>Institutional Risk Models</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onExpandToDedicatedPage && (
                <button
                  onClick={() => {
                    onExpandToDedicatedPage();
                    onClose();
                  }}
                  title="Expand to dedicated page"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#19202f] transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleResetChat}
                title="Start new conversation"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#19202f] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                title="Close Copilot"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#19202f] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Context Strip */}
          <div className="px-4 py-2.5 bg-[#0a0d14]/80 border-b border-[#1c2438] flex items-center justify-between text-xs text-slate-300 relative">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-500 shrink-0">Target:</span>
              {activeTrader ? (
                <button
                  onClick={() => setIsTraderPickerOpen(!isTraderPickerOpen)}
                  className="flex items-center gap-1.5 text-white font-semibold truncate hover:text-[#00f29d] cursor-pointer"
                >
                  <span className="truncate">
                    {activeTrader.display_name || truncateAddress(activeTrader.address, 4)}
                  </span>
                  <span className="text-[#00f29d] tabular-nums font-mono">
                    Score {activeTrader.copy_score}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => setIsTraderPickerOpen(!isTraderPickerOpen)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>General Analysis (Select trader)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              {activeTraderVol?.hasAlert && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/40 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>24h Spike</span>
                </span>
              )}
              {activeTrader && onNavigateToSimulator && (
                <button
                  onClick={() => {
                    onNavigateToSimulator(activeTrader);
                    onClose();
                  }}
                  className="text-xs text-[#00f29d] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Simulate</span>
                </button>
              )}
            </div>

            {/* Trader Picker Dropdown */}
            {isTraderPickerOpen && (
              <div className="absolute top-full left-0 right-0 z-30 bg-[#121722] border-b border-[#1c2438] shadow-2xl p-2 max-h-60 overflow-y-auto">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Switch Active Trader Context
                </div>
                {allTraders.slice(0, 10).map((t) => (
                  <button
                    key={t.address}
                    onClick={() => {
                      if (onSelectTrader) onSelectTrader(t);
                      setIsTraderPickerOpen(false);
                      handleSend(`Evaluate ${t.display_name || truncateAddress(t.address, 4)}`);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      activeTrader?.address === t.address
                        ? 'bg-[#19202f] text-[#00f29d]'
                        : 'text-slate-300 hover:bg-[#161d2b] hover:text-white'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-semibold text-white mr-1.5">
                        {t.display_name || truncateAddress(t.address, 4)}
                      </span>
                      <span className="text-[11px] text-slate-400">{t.style}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[11px] tabular-nums font-mono">
                      <span>Score {t.copy_score}</span>
                      <span className={parseFloat(t.roi?.['30d'] || '0') >= 0 ? 'text-[#00f29d]' : 'text-rose-400'}>
                        {parseFloat(t.roi?.['30d'] || '0') >= 0 ? '+' : ''}
                        {parseFloat(t.roi?.['30d'] || '0').toFixed(0)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <CopilotMessageBubble
                key={msg.id}
                message={msg}
                onSendChip={handleSend}
                onActionClick={(actionCard) => {
                  if (onNavigateToSimulator) {
                    onNavigateToSimulator(activeTrader || undefined);
                    onClose();
                  }
                }}
              />
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-xs text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-[#00f29d]/12 border border-[#00f29d]/30 text-[#00f29d] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#121722] border border-[#1c2438] rounded-2xl rounded-tl-xs px-4 py-2.5 flex items-center gap-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-slate-400 text-xs ml-1">
                    Analyzing risk metrics & historical track record...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips (Pinned above input) */}
          <div className="p-2.5 bg-[#0a0d14] border-t border-[#1c2438] overflow-x-auto no-scrollbar">
            <div className="flex gap-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-1.5 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] hover:border-[#00f29d]/40 text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium shadow-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-[#0a0d14] border-t border-[#1c2438]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about risk, position sizing, or any trader..."
                className="flex-1 bg-[#121722] border border-[#1c2438] focus:border-[#00f29d]/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-sans outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2.5 bg-[#00f29d] hover:bg-[#50ffae] disabled:opacity-40 disabled:hover:bg-[#00f29d] text-[#003921] font-bold rounded-xl shadow-md shadow-[#00f29d]/20 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-[11px] text-slate-500 mt-2 text-center">
              Strike Copilot prioritizes capital preservation and downside protection.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Dedicated Full-Page Workspace for Strike Copilot
 * (Renders when activeTab === 'copilot')
 */
export const StrikeCopilotWorkspace: React.FC<{
  activeTrader?: Trader | null;
  allTraders: Trader[];
  userCapital: number;
  setUserCapital: (capital: number) => void;
  onNavigateToSimulator: (trader?: Trader) => void;
  onNavigateToDiscovery: () => void;
  onSelectTrader: (trader: Trader) => void;
}> = ({
  activeTrader,
  allTraders,
  userCapital,
  setUserCapital,
  onNavigateToSimulator,
  onNavigateToDiscovery,
  onSelectTrader,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-workspace',
      sender: 'copilot',
      text: `Welcome to the **Strike Copilot Intelligence Desk**.

My purpose is to help you thoroughly evaluate copy-trading strategies, review verified drawdown records, calibrate safe position sizes, and understand key mechanics before risking real capital.

${
  activeTrader
    ? `Currently focused on **${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}** (Strike Score: ${activeTrader.copy_score}/100, 30d Drawdown: -${getDrawdown30d(activeTrader).toFixed(1)}%).`
    : `No specific trader locked. You can select any trader from the right panel or ask general allocation questions.`
}`,
      timestamp: Date.now(),
      suggestedChips: [
        activeTrader
          ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
          : 'Compare top traders',
        'Explain risks',
        `How to size a $${userCapital.toLocaleString()} account?`,
        'Fixed Ratio vs Fixed Amount',
      ],
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const response: CopilotResponseOutput = generateCopilotResponse(text, {
        activeTrader,
        allTraders,
        userCapital,
        currentView: 'copilot',
      });

      const copilotMsg: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: response.text,
        timestamp: Date.now(),
        warningBanner: response.warningBanner,
        suggestedChips: response.suggestedChips,
        actionCard: response.actionCard,
      };

      setMessages((prev) => [...prev, copilotMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'copilot',
        text: `Conversation reset. Ask about risk models, simulate parameters for your $${userCapital.toLocaleString()} account, or pick a trader to analyze.`,
        timestamp: Date.now(),
        suggestedChips: [
          activeTrader
            ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
            : 'Compare top traders',
          'Explain risks',
          `How to size a $${userCapital.toLocaleString()} account?`,
          'Fixed Ratio vs Fixed Amount',
        ],
      },
    ]);
  };

  const activeVol = activeTrader ? getTrader24hVolatility(activeTrader) : null;
  const activeDrawdown = activeTrader ? getDrawdown30d(activeTrader) : 15;
  const activeScore = activeTrader ? parseFloat(activeTrader.copy_score || '0') : 80;

  // Sizing Calculations for sidebar
  const peakPos = activeTrader ? Math.max(1, Math.round(parseFloat(activeTrader.peak_concurrent_entries || '3'))) : 3;
  const conservativeSize = Math.round(userCapital / Math.max(peakPos * 1.5, 4));
  const conservativePct = Math.round((conservativeSize / userCapital) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col min-h-[calc(100vh-140px)]">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#1c2438]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00f29d]/15 border border-[#00f29d]/30 text-[#00f29d] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Strike Copilot Intelligence Desk
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Calm, data-grounded guidance for risk assessment, position sizing, and drawdown evaluation before risking capital.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetChat}
            className="px-3.5 py-2 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
          <button
            onClick={onNavigateToDiscovery}
            className="px-3.5 py-2 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Browse All Traders</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1">
        {/* Left / Center Column: Conversation Thread (8 cols) */}
        <div className="lg:col-span-8 bg-[#101520] border border-[#1c2438] rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-[620px] lg:min-h-[700px]">
          {/* Active Context Banner */}
          <div className="px-5 py-3.5 bg-[#0a0d14] border-b border-[#1c2438] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Active Context:</span>
              {activeTrader ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    {activeTrader.display_name || truncateAddress(activeTrader.address, 4)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#00f29d]/15 text-[#00f29d] border border-[#00f29d]/30 font-mono">
                    Score {activeTrader.copy_score}
                  </span>
                  {activeVol?.hasAlert && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/40 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>24h Volatility Alert</span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400">General Portfolio & Capital Sizing</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Account Capital:</span>
              <div className="flex items-center gap-1 bg-[#121722] border border-[#1c2438] rounded-lg px-2 py-1 text-xs">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  value={userCapital}
                  onChange={(e) => setUserCapital(Math.max(100, Number(e.target.value)))}
                  className="w-16 bg-transparent text-white font-mono text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <CopilotMessageBubble
                key={msg.id}
                message={msg}
                onSendChip={handleSend}
                onActionClick={(actionCard) => {
                  onNavigateToSimulator(activeTrader || undefined);
                }}
              />
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-xs text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-[#00f29d]/12 border border-[#00f29d]/30 text-[#00f29d] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#121722] border border-[#1c2438] rounded-2xl rounded-tl-xs px-4 py-2.5 flex items-center gap-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-slate-400 text-xs ml-1">
                    Evaluating drawdown curves & liquidity factors...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts Strip */}
          <div className="p-3 bg-[#0a0d14] border-t border-[#1c2438] overflow-x-auto no-scrollbar">
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleSend(
                    activeTrader
                      ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
                      : 'Compare top traders'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] hover:border-[#00f29d]/40 text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium"
              >
                {activeTrader
                  ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}`
                  : 'Compare top traders'}
              </button>
              <button
                onClick={() => handleSend(`How to size a $${userCapital.toLocaleString()} account?`)}
                className="px-3 py-1.5 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] hover:border-[#00f29d]/40 text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium"
              >
                How to size ${userCapital.toLocaleString()}?
              </button>
              <button
                onClick={() => handleSend('Explain risks')}
                className="px-3 py-1.5 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] hover:border-[#00f29d]/40 text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium"
              >
                Explain risks
              </button>
              <button
                onClick={() => handleSend('Fixed Ratio vs Fixed Amount')}
                className="px-3 py-1.5 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] hover:border-[#00f29d]/40 text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium"
              >
                Fixed Ratio vs Fixed Amount
              </button>
              <button
                onClick={() => handleSend('Explain 24h Volatility Alerts')}
                className="px-3 py-1.5 rounded-xl bg-[#121722] hover:bg-[#19202f] text-slate-300 hover:text-white border border-[#1c2438] hover:border-[#00f29d]/40 text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium"
              >
                Explain 24h Volatility
              </button>
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-[#0a0d14] border-t border-[#1c2438]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Strike Copilot about risk models, position sizing, or trader evaluation..."
                className="flex-1 bg-[#121722] border border-[#1c2438] focus:border-[#00f29d]/60 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 font-sans outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="px-5 py-3 bg-[#00f29d] hover:bg-[#50ffae] disabled:opacity-40 disabled:hover:bg-[#00f29d] text-[#003921] font-bold rounded-xl shadow-md shadow-[#00f29d]/20 transition-all cursor-pointer shrink-0 flex items-center gap-2 text-xs"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="text-[11px] text-slate-500 mt-2 text-center">
              Strike Copilot is designed to protect your capital and prevent reckless copy trading.
            </div>
          </div>
        </div>

        {/* Right Column: Trader Intelligence Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Active Target Card */}
          {activeTrader ? (
            <div className="bg-[#121722] border border-[#1c2438] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1c2438]">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target Intelligence
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#19202f] text-slate-300 border border-[#273248]">
                  {activeTrader.platform?.toUpperCase() || 'STRIKE'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-white truncate">
                    {activeTrader.display_name || truncateAddress(activeTrader.address, 4)}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5 truncate font-mono">
                    {truncateAddress(activeTrader.address, 6)}
                  </div>
                </div>
                <ScoreRadialGauge score={activeScore} size={46} showLabel={false} />
              </div>

              {/* 24h Volatility Alert Callout if Active */}
              {activeVol?.hasAlert && (
                <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-300">
                      24h Drawdown Spike: -{activeVol.drawdown24hPct.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Intraday pullback detected. Stabilizing before copying is advised.
                    </div>
                  </div>
                </div>
              )}

              {/* Risk & Return Metrics */}
              <div className="space-y-3 pt-2">
                <RiskBarGauge drawdownPct={activeDrawdown} showDetails={true} />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-[#0a0d14] border border-[#1c2438]">
                    <div className="text-[11px] text-slate-400">30d Net ROI</div>
                    <div
                      className={`text-sm font-bold tabular-nums mt-0.5 ${
                        parseFloat(activeTrader.roi?.['30d'] || '0') >= 0 ? 'text-[#00f29d]' : 'text-rose-400'
                      }`}
                    >
                      {parseFloat(activeTrader.roi?.['30d'] || '0') >= 0 ? '+' : ''}
                      {parseFloat(activeTrader.roi?.['30d'] || '0').toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0a0d14] border border-[#1c2438]">
                    <div className="text-[11px] text-slate-400">Trading Style</div>
                    <div className="text-sm font-bold text-white mt-0.5 truncate">
                      {activeTrader.style || 'Discretionary'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Position Sizing Blueprint */}
              <div className="p-3.5 rounded-xl bg-[#0a0d14] border border-[#1c2438] space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Recommended Sizing</span>
                  <span className="text-[#00f29d] font-mono">${userCapital.toLocaleString()} Account</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Allocate <strong className="text-white">~${conservativeSize.toLocaleString()}</strong> ({conservativePct}%) per trade with <strong className="text-white">1x–2x</strong> max leverage. Keep 35% in reserve.
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => onNavigateToSimulator(activeTrader)}
                  className="w-full py-2.5 px-4 bg-[#00f29d] hover:bg-[#50ffae] text-[#003921] font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00f29d]/20"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Launch Simulation</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#121722] border border-[#1c2438] rounded-2xl p-6 text-center shadow-lg">
              <Bot className="w-8 h-8 text-[#00f29d] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">No Trader Selected</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a candidate below to view real-time risk gauges and calibrated sizing.
              </p>
            </div>
          )}

          {/* Quick Trader Switcher List */}
          <div className="bg-[#121722] border border-[#1c2438] rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Trader to Evaluate
              </span>
              <span className="text-xs text-slate-500">{allTraders.length} available</span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
              {allTraders.slice(0, 7).map((trader) => {
                const isSelected = activeTrader?.address === trader.address;
                const score = parseFloat(trader.copy_score || '0');
                const roi = parseFloat(trader.roi?.['30d'] || '0');
                const vol = getTrader24hVolatility(trader);

                return (
                  <button
                    key={trader.address}
                    onClick={() => {
                      onSelectTrader(trader);
                      handleSend(`Evaluate ${trader.display_name || truncateAddress(trader.address, 4)}`);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#19202f] border border-[#00f29d]/40 text-white'
                        : 'bg-[#0a0d14] border border-[#1c2438] text-slate-300 hover:border-[#273248] hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{trader.display_name || truncateAddress(trader.address, 4)}</span>
                        {vol.hasAlert && (
                          <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" title="24h Drawdown Spike" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        DD: -{getDrawdown30d(trader).toFixed(1)}% · {trader.style || 'Discretionary'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#00f29d] tabular-nums font-mono">
                        {score.toFixed(0)}
                      </div>
                      <div
                        className={`text-[10px] tabular-nums font-mono ${
                          roi >= 0 ? 'text-[#00f29d]' : 'text-rose-400'
                        }`}
                      >
                        {roi >= 0 ? '+' : ''}
                        {roi.toFixed(0)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
