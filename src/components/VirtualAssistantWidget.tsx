import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, MessageCircle, Send, X } from 'lucide-react';
import { ASSISTANT_PROFILE, answerAssistantQuestion, type AssistantReply } from '../lib/assistantEngine';
import { PETCLICK_IMAGES } from '../lib/defaults';
import { formatBRL } from '../lib/format';
import { useStore } from '../context/StoreContext';
import { SmartImage } from './SmartImage';

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  reply?: AssistantReply;
}

const QUICK_PROMPTS = [
  'Frete e entrega',
  'Formas de pagamento',
  'Ofertas de hoje',
  'Trocas e contato',
];

export const VirtualAssistantWidget: React.FC = () => {
  const { products, categories, settings, shippingSettings, navigate, cartDrawerOpen } = useStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: ASSISTANT_PROFILE.welcomeMessage,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  if (cartDrawerOpen) {
    return null;
  }

  const sendQuestion = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    const reply = answerAssistantQuestion(trimmed, {
      products,
      categories,
      settings,
      shippingSettings,
    });

    const botMsg: ChatMessage = {
      id: `a_${Date.now() + 1}`,
      sender: 'assistant',
      text: reply.text,
      reply,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-5 sm:left-5 z-40 no-print">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Abrir atendimento com ${ASSISTANT_PROFILE.name}`}
          className="group flex items-center gap-2.5 bg-white hover:bg-emerald-50/90 text-emerald-950 border border-stone-200 hover:border-emerald-700 rounded-full p-1.5 sm:pr-4 shadow-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-orange-500 bg-stone-100 shrink-0">
            <SmartImage
              src={PETCLICK_IMAGES.assistantAvatar}
              alt={`${ASSISTANT_PROFILE.name} — ${ASSISTANT_PROFILE.role}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="hidden sm:block text-left pr-1">
            <div className="text-xs font-extrabold text-emerald-950 leading-tight whitespace-nowrap">
              {ASSISTANT_PROFILE.name} · Ajuda
            </div>
            <div className="text-[11px] text-stone-500 leading-tight whitespace-nowrap">
              Dúvidas rápidas
            </div>
          </div>
          <MessageCircle className="w-4 h-4 text-orange-600 sm:hidden mr-1.5" />
        </button>
      ) : (
        <section
          aria-label={`Atendimento virtual com ${ASSISTANT_PROFILE.name}`}
          className="w-[calc(100vw-2rem)] sm:w-[370px] max-h-[min(560px,calc(100vh-5rem))] bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header with Mel's Photo & Name */}
          <div className="bg-emerald-950 text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-orange-400 bg-white shrink-0">
                <SmartImage
                  src={PETCLICK_IMAGES.assistantAvatar}
                  alt={`${ASSISTANT_PROFILE.name} — ${ASSISTANT_PROFILE.role}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-white truncate">
                  {ASSISTANT_PROFILE.name}
                </h2>
                <p className="text-[11px] text-emerald-200/90 truncate">
                  {ASSISTANT_PROFILE.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar atendimento"
              className="p-2 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F6]"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-emerald-900 text-white rounded-br-sm'
                        : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.reply?.recommendedProducts && msg.reply.recommendedProducts.length > 0 && (
                    <div className="w-full max-w-[92%] space-y-1.5">
                      {msg.reply.recommendedProducts.map((prod) => {
                        const effectivePrice =
                          prod.promoPrice && prod.promoPrice > 0 && prod.promoPrice < prod.price
                            ? prod.promoPrice
                            : prod.price;
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              navigate(`/produto/${prod.slug || prod.id}`);
                              setOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 p-2 bg-white border border-stone-200 hover:border-emerald-700 rounded-xl text-left transition-colors cursor-pointer"
                          >
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                              <SmartImage
                                src={prod.images[0]}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-stone-900 line-clamp-1">
                                {prod.name}
                              </div>
                              <div className="text-xs font-bold text-emerald-900 font-mono-tabular">
                                {formatBRL(effectivePrice)}
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {msg.reply?.actionLink && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(msg.reply!.actionLink!.path);
                        setOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <span>{msg.reply.actionLink.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {msg.reply?.externalLink && (
                    <a
                      href={msg.reply.externalLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                    >
                      <span>{msg.reply.externalLink.label}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Replies */}
          <div className="px-3 py-2 bg-white border-t border-stone-100 flex flex-wrap gap-1.5 shrink-0">
            {QUICK_PROMPTS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => sendQuestion(label)}
                className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 text-stone-700 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Pergunte algo para a ${ASSISTANT_PROFILE.name}...`}
              className="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-800"
            />
            <button
              type="submit"
              aria-label="Enviar pergunta"
              className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}
    </div>
  );
};
