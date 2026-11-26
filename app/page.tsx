import AppShell from '@/components/AppShell';
import { crmStore } from '@/lib/crm-store';
import { ragEngine } from '@/lib/rag-engine';
import { semanticCache } from '@/lib/semantic-cache';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const initialLead = crmStore.getActiveLead();
  const initialLeads = crmStore.getLeads();
  const initialSlots = crmStore.getCalendarSlots(false);
  const initialChunks = ragEngine.getAllChunks();
  const initialCacheStats = semanticCache.getStats();

  return (
    <AppShell
      initialLead={initialLead}
      initialLeads={initialLeads}
      initialSlots={initialSlots}
      initialChunks={initialChunks}
      initialCacheStats={initialCacheStats}
    />
  );
}
