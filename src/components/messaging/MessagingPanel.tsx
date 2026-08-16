import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send, Check, CheckCheck, MessageCircle, ArrowLeft, Search, X, Calendar, Users, User, ArrowDownAZ, ArrowUpAZ, Clock, ArrowDownWideNarrow } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Conversation, Message, ProviderProfile, ConsumerProfile } from '@/types/database';

interface ChatListEntry {
  conversation: Conversation;
  displayName: string;
  lastMessage?: string;
  lastTime?: string;
  unread: number;
}

interface MessageSearchResult {
  message: Message;
  conversationId: string;
  displayName: string;
}

interface Props {
  activeConversationId?: string;
  onClearActive?: () => void;
}

function formatDateGroup(d: Date, todayLabel: string, yesterdayLabel: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const dStr = d.toDateString();
  if (dStr === today.toDateString()) return todayLabel;
  if (dStr === yesterday.toDateString()) return yesterdayLabel;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toLocalDateInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function MessagingPanel({ activeConversationId, onClearActive }: Props) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ChatListEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(activeConversationId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [sortBy, setSortBy] = useState<'dateNewest' | 'dateOldest' | 'nameAsc' | 'nameDesc'>('dateNewest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  useEffect(() => {
    if (activeConversationId) setActiveId(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (!profile) return;
    const col = profile.role === 'consumer' ? 'consumer_id' : 'provider_id';
    (async () => {
      setLoadingList(true);
      const { data: convos } = await supabase
        .from('conversations')
        .select('*')
        .eq(col, profile.id)
        .order('created_at', { ascending: false });
      const convoList = (convos as Conversation[] | null) ?? [];

      const providerIds = convoList.map((c) => c.provider_id);
      const consumerIds = convoList.map((c) => c.consumer_id);

      let provMap: Record<string, string> = {};
      if (providerIds.length) {
        const { data: provs } = await supabase
          .from('provider_profiles')
          .select('user_id, company_name, alias')
          .in('user_id', providerIds);
        (provs as { user_id: string; company_name: string; alias: string }[] | null)?.forEach((p) => {
          provMap[p.user_id] = p.alias || p.company_name || t('msg.provider');
        });
      }
      let consMap: Record<string, string> = {};
      if (consumerIds.length) {
        const { data: conss } = await supabase.from('consumer_profiles').select('user_id, name').in('user_id', consumerIds);
        (conss as { user_id: string; name: string }[] | null)?.forEach((c) => {
          consMap[c.user_id] = c.name || t('msg.consumer');
        });
      }

      const entries: ChatListEntry[] = await Promise.all(
        convoList.map(async (c) => {
          const { data: last } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const lastMsg = last as Message | null;
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', c.id)
            .neq('sender_id', profile.id)
            .neq('status', 'read');
          const displayName =
            profile.role === 'consumer' ? provMap[c.provider_id] ?? t('msg.provider') : consMap[c.consumer_id] ?? t('msg.consumer');

          // Load all messages for this conversation for search
          const { data: allMsgs } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: true });
          const msgList = (allMsgs as Message[] | null) ?? [];

          setAllMessages((prev) => ({ ...prev, [c.id]: msgList }));

          return {
            conversation: c,
            displayName,
            lastMessage: lastMsg?.content,
            lastTime: lastMsg?.created_at,
            unread: count ?? 0,
          };
        })
      );
      setConversations(entries);
      setLoadingList(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    (async () => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeId)
        .order('created_at', { ascending: true });
      setMessages((msgs as Message[] | null) ?? []);
      setLoadingMessages(false);

      if (profile) {
        await supabase
          .from('messages')
          .update({ status: 'read' })
          .eq('conversation_id', activeId)
          .neq('sender_id', profile.id)
          .neq('status', 'read');
      }
    })();

    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          setAllMessages((prev) => ({
            ...prev,
            [activeId]: prev[activeId] ? [...prev[activeId], newMsg] : [newMsg],
          }));
          if (profile && newMsg.sender_id !== profile.id) {
            supabase
              .from('messages')
              .update({ status: 'read' })
              .eq('id', newMsg.id)
              .neq('sender_id', profile.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Client-side search across all loaded messages
  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const dateFilter = searchDate ? new Date(searchDate + 'T00:00:00') : null;
    const dateEnd = dateFilter ? new Date(searchDate + 'T23:59:59') : null;

    const results: MessageSearchResult[] = [];

    const entriesToSearch = searchScope === 'current' && activeId
      ? conversations.filter((c) => c.conversation.id === activeId)
      : conversations;

    for (const entry of entriesToSearch) {
      const msgs = allMessages[entry.conversation.id] ?? [];

      // Name filter: if query matches display name, include all messages from that conversation
      const nameMatch = query && entry.displayName.toLowerCase().includes(query);

      for (const msg of msgs) {
        const contentMatch = query && msg.content.toLowerCase().includes(query);
        const msgDate = new Date(msg.created_at);
        const dateMatch = dateFilter && msgDate >= dateFilter && msgDate <= dateEnd!;

        if (query && dateFilter) {
          if ((contentMatch || nameMatch) && dateMatch) {
            results.push({ message: msg, conversationId: entry.conversation.id, displayName: entry.displayName });
          }
        } else if (query) {
          if (contentMatch || nameMatch) {
            results.push({ message: msg, conversationId: entry.conversation.id, displayName: entry.displayName });
          }
        } else if (dateFilter) {
          if (dateMatch) {
            results.push({ message: msg, conversationId: entry.conversation.id, displayName: entry.displayName });
          }
        }
      }
    }

    return results.sort((a, b) => new Date(b.message.created_at).getTime() - new Date(a.message.created_at).getTime());
  }, [searchQuery, searchDate, conversations, allMessages, searchScope, activeId]);

  // Filter conversations list by name
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query || searchMode) return conversations;
    return conversations.filter((c) => c.displayName.toLowerCase().includes(query));
  }, [searchQuery, conversations, searchMode]);

  // Sort conversations
  const sortedConversations = useMemo(() => {
    const sorted = [...filteredConversations];
    switch (sortBy) {
      case 'nameAsc':
        sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      case 'nameDesc':
        sorted.sort((a, b) => b.displayName.localeCompare(a.displayName));
        break;
      case 'dateOldest':
        sorted.sort((a, b) => {
          const aTime = a.lastTime ? new Date(a.lastTime).getTime() : new Date(a.conversation.created_at).getTime();
          const bTime = b.lastTime ? new Date(b.lastTime).getTime() : new Date(b.conversation.created_at).getTime();
          return aTime - bTime;
        });
        break;
      case 'dateNewest':
      default:
        sorted.sort((a, b) => {
          const aTime = a.lastTime ? new Date(a.lastTime).getTime() : new Date(a.conversation.created_at).getTime();
          const bTime = b.lastTime ? new Date(b.lastTime).getTime() : new Date(b.conversation.created_at).getTime();
          return bTime - aTime;
        });
        break;
    }
    return sorted;
  }, [filteredConversations, sortBy]);

  const sortOptions: { value: typeof sortBy; label: string; icon: React.ReactNode }[] = [
    { value: 'dateNewest', label: t('msg.sortDateNewest'), icon: <ArrowDownWideNarrow className="h-3.5 w-3.5" /> },
    { value: 'dateOldest', label: t('msg.sortDateOldest'), icon: <Clock className="h-3.5 w-3.5" /> },
    { value: 'nameAsc', label: t('msg.sortNameAsc'), icon: <ArrowDownAZ className="h-3.5 w-3.5" /> },
    { value: 'nameDesc', label: t('msg.sortNameDesc'), icon: <ArrowUpAZ className="h-3.5 w-3.5" /> },
  ];

  async function runSearch() {
    if (!searchQuery.trim() && !searchDate) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchResults(filteredResults);
    setSearching(false);
  }

  useEffect(() => {
    if (searchMode) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchDate, searchMode, filteredResults]);

  function clearSearch() {
    setSearchQuery('');
    setSearchDate('');
    setSearchMode(false);
    setSearchResults([]);
    setSearchScope('all');
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeId || !profile) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: activeId, sender_id: profile.id, content, status: 'sent' })
      .select('*')
      .single();
    if (error) {
      console.error('send failed', error);
      setDraft(content);
    } else if (data) {
      const newMsg = data as Message;
      setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
      setAllMessages((prev) => ({
        ...prev,
        [activeId]: prev[activeId] ? [...prev[activeId], newMsg] : [newMsg],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation.id === activeId
            ? { ...c, lastMessage: content, lastTime: newMsg.created_at }
            : c
        )
      );
    }
    setSending(false);
  }

  if (!profile) return null;

  if (loadingList) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-slate-500">{t('msg.noMessages')}</p>
        <p className="mt-1 text-sm text-slate-400">
          {profile.role === 'consumer'
            ? t('msg.noMessagesConsumer')
            : t('msg.noMessagesProvider')}
        </p>
      </div>
    );
  }

  const active = conversations.find((c) => c.conversation.id === activeId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: '75vh', minHeight: '400px' }}>
      {/* Search bar */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!searchMode && (e.target.value || searchDate)) setSearchMode(true);
              }}
              placeholder={t('msg.searchByNameOrContent')}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-9 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative sm:w-44">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => {
                setSearchDate(e.target.value);
                if (!searchMode && (searchQuery || e.target.value)) setSearchMode(true);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          {searchMode && (
            <button
              onClick={clearSearch}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
              {t('msg.clear')}
            </button>
          )}
        </div>
        {searchMode && (
          <div className="mt-2 flex items-center gap-1">
            <button
              onClick={() => setSearchScope('all')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                searchScope === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              {t('msg.allConversations')}
            </button>
            <button
              onClick={() => setSearchScope('current')}
              disabled={!activeId}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                searchScope === 'current'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              {active ? `${t('msg.thisChat')} (${active.displayName})` : t('msg.currentChat')}
            </button>
          </div>
        )}
      </div>

      {searchMode ? (
        /* Search results view */
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 73px)' }}>
          {searching ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                {searchQuery || searchDate
                  ? t('msg.noResults')
                  : t('msg.enterSearch')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              <p className="px-4 py-2 text-xs font-medium text-slate-400">
                {searchResults.length} {searchResults.length !== 1 ? t('msg.results') : t('msg.result')}
              </p>
              {searchResults.map((r) => {
                const d = new Date(r.message.created_at);
                const mine = r.message.sender_id === profile.id;
                return (
                  <button
                    key={r.message.id}
                    onClick={() => {
                      setActiveId(r.conversationId);
                      setSearchMode(false);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-900">{r.displayName}</p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatDateGroup(d, t('msg.today'), t('msg.yesterday'))} {formatTime(d)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-600">
                        {mine ? t('msg.you') : ''}
                        {r.message.content}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-0 sm:grid-cols-3" style={{ height: 'calc(75vh - 73px)' }}>
          {/* Conversation list */}
          <div className={`border-r border-slate-100 sm:col-span-1 ${activeId ? 'hidden sm:block' : 'block'}`}>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 73px)' }}>
              {/* Sort controls */}
              <div className="flex items-center justify-between border-b border-slate-50 px-4 py-2">
                <span className="text-xs font-medium text-slate-400">{filteredConversations.length} {t('msg.conversations').toLowerCase()}</span>
                <div className="relative">
                  <button
                    onClick={() => setSortMenuOpen((v) => !v)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {sortOptions.find((o) => o.value === sortBy)?.icon}
                    <span>{sortOptions.find((o) => o.value === sortBy)?.label}</span>
                  </button>
                  {sortMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSortBy(opt.value);
                              setSortMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition hover:bg-slate-50 ${
                              sortBy === opt.value ? 'font-semibold text-teal-600' : 'text-slate-600'
                            }`}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {sortedConversations.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {t('msg.noResults')}
                </div>
              ) : (
                sortedConversations.map((c) => (
                  <button
                    key={c.conversation.id}
                    onClick={() => setActiveId(c.conversation.id)}
                    className={`flex w-full items-center justify-between border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      c.conversation.id === activeId ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{c.displayName}</p>
                      <p className="truncate text-xs text-slate-500">{c.lastMessage ?? t('msg.noMessagesYet')}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-semibold text-white">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className={`flex flex-col sm:col-span-2 ${activeId ? 'block' : 'hidden sm:flex'}`}>
            {activeId && active ? (
              <>
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <button
                    onClick={() => {
                      setActiveId(null);
                      onClearActive?.();
                    }}
                    className="text-slate-400 hover:text-slate-700 sm:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h3 className="font-semibold text-slate-900">{active.displayName}</h3>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
                  {loadingMessages ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(() => {
                        let lastGroup = '';
                        return messages.map((m) => {
                          const d = new Date(m.created_at);
                          const group = formatDateGroup(d, t('msg.today'), t('msg.yesterday'));
                          const showGroup = group !== lastGroup;
                          lastGroup = group;
                          const mine = m.sender_id === profile.id;
                          return (
                            <div key={m.id}>
                              {showGroup && (
                                <div className="my-3 text-center text-xs font-medium text-slate-400">{group}</div>
                              )}
                              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                                    mine ? 'bg-teal-600 text-white' : 'bg-white text-slate-800'
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                  <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-teal-100' : 'text-slate-400'}`}>
                                    {formatTime(d)}
                                    {mine && m.status === 'read' && <CheckCheck className="h-3 w-3" />}
                                    {mine && m.status === 'delivered' && <CheckCheck className="h-3 w-3 opacity-60" />}
                                    {mine && m.status === 'sent' && <Check className="h-3 w-3 opacity-60" />}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-slate-100 p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t('msg.typeMessage')}
                    className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {t('msg.selectConversation')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
