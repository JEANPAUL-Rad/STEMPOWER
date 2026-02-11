import sql from '../config/db.js';

// Runs daily at 00:10
export async function startAutoBlockJob() {
  try {
    // Dynamic import to avoid hard crash if dependency not installed yet
    const { default: cron } = await import('node-cron');
    cron.schedule('10 0 * * *', async () => {
      try {
        // Block users based on last_payment_date in users table (legacy check)
        const result1 = await sql`
          UPDATE public.users
          SET status = 'blocked'
          WHERE status = 'active'
            AND last_payment_date IS NOT NULL
            AND last_payment_date + INTERVAL '30 days' < NOW()
          RETURNING user_id
        `;
        
        // Block users who don't have any paid registration in register table
        const result2 = await sql`
          UPDATE public.users u
          SET status = 'blocked'
          WHERE u.status = 'active'
            AND u.role = 'student'
            AND NOT EXISTS (
              SELECT 1 FROM register r
              WHERE (r.user_id = u.user_id OR r.email_address = u.email)
                AND r.payment_status = 'Paid'
            )
          RETURNING u.user_id
        `;
        
        // Block users whose last paid registration is more than 30 days old
        // Use updated_at if available (when payment was confirmed), otherwise use created_at
        const result3 = await sql`
          UPDATE public.users u
          SET status = 'blocked'
          WHERE u.status = 'active'
            AND u.role = 'student'
            AND EXISTS (
              SELECT 1 FROM register r
              WHERE (r.user_id = u.user_id OR r.email_address = u.email)
                AND r.payment_status = 'Paid'
                AND (COALESCE(r.updated_at, r.created_at) + INTERVAL '30 days' < NOW())
                AND NOT EXISTS (
                  SELECT 1 FROM register r2
                  WHERE (r2.user_id = u.user_id OR r2.email_address = u.email)
                    AND r2.payment_status = 'Paid'
                    AND (COALESCE(r2.updated_at, r2.created_at) + INTERVAL '30 days' >= NOW())
                )
            )
          RETURNING u.user_id
        `;
        
        const result4 = await sql`
          UPDATE register r
          SET payment_status = 'Unpaid'
          WHERE r.payment_status = 'Paid'
            AND (COALESCE(r.updated_at, r.created_at) + INTERVAL '30 days' < NOW())
            AND NOT EXISTS (
              SELECT 1 FROM register r2
              WHERE (r2.user_id = r.user_id OR r2.email_address = r.email_address)
                AND r2.payment_status = 'Paid'
                AND (COALESCE(r2.updated_at, r2.created_at) + INTERVAL '30 days' >= NOW())
            )
          RETURNING r.id
        `;
        
        const totalBlocked = (result1?.length || 0) + (result2?.length || 0) + (result3?.length || 0);
        if (totalBlocked > 0) {
          console.log(`🔒 Auto-blocked ${totalBlocked} user(s) for non-payment.`);
        }
        const totalUnpaid = result4?.length || 0;
        if (totalUnpaid > 0) {
          console.log(`💳 Marked ${totalUnpaid} registration(s) as Unpaid after 30 days.`);
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
