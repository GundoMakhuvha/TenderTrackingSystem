// Copies the shared calendar module into the email function folder.
// Supabase functions can only import files inside their own folder, so the
// function keeps a generated copy. Run: npm run sync:calendar
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'src/lib/calendar.ts';
const DEST = 'supabase/functions/send-notification-email/calendar.ts';
export const HEADER =
  '// GENERATED FILE — do not edit. Source: src/lib/calendar.ts (run `npm run sync:calendar`).\n';

writeFileSync(DEST, HEADER + readFileSync(SRC, 'utf8'));
console.log(`Synced ${SRC} -> ${DEST}`);
