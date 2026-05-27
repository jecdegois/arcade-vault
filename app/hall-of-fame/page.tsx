import { createClient } from '../../lib/supabase/server';
import { HallOfFameClient } from './HallOfFameClient';

export default async function HallOfFamePage() {
  const supabase = await createClient();
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .order('created_at');

  return <HallOfFameClient games={games ?? []} />;
}
