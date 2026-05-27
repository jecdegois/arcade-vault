import { createClient } from '../../lib/supabase/server';
import { LibraryGrid } from './LibraryGrid';

export default async function GamesPage() {
  const supabase = await createClient();
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .order('created_at');

  return <LibraryGrid games={games ?? []} />;
}
