import sql from '../config/db.js';

// Runs daily at 00:10
export async function startAutoBlockJob() {
  try {
    // Dynamic import to avoid hard crash if dependency not installed yet
    const { default: cron } = await import('node-cron');
    cron.schedule('10 0 * * *', async () => {
      try {
        const result = await sql`
          UPDATE public.users
          SET status = 'blocked'
          WHERE status = 'active'
            AND last_payment_date IS NOT NULL
            AND last_payment_date + INTERVAL '30 days' < NOW()
          RETURNING user_id
        `;
        if (Array.isArray(result) && result.length > 0) {
          console.log(`🔒 Auto-blocked ${result.length} user(s) for non-payment.`);
        }
      } catch (err) {
        console.error('Auto-block job failed:', err);
      }
    }, { timezone: 'UTC' });
    console.log('✅ Auto-block job scheduled (daily at 00:10 UTC)');
  } catch (e) {
    console.warn('node-cron not available; skipping auto-block scheduler. Run "npm install" to enable.');
  }
}
