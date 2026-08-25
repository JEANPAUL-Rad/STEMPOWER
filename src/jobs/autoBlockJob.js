import sql from '../config/db.js';

// Runs daily at 00:10
export async function startAutoBlockJob() {
  try {
    // Dynamic import to avoid hard crash if dependency not installed yet
    const { default: cron } = await import('node-cron');
    cron.schedule('10 0 * * *', async () => {
      try {
        // ============================================================
        // STEP 0: Ensure ADMIN users always stay active regardless of
        //         payment state.  They should never be blocked.
        // ============================================================
        const adminUnblockResult = await sql`
          UPDATE public.users
          SET status = 'active'
          WHERE role = 'admin'
            AND status != 'active'
          RETURNING user_id
        `;
        if (adminUnblockResult && adminUnblockResult.length > 0) {
          console.log(`🛡️  Auto-unblocked ${adminUnblockResult.length} admin user(s) — admins always stay active.`);
        }

        // ============================================================
        // STEP 1: Auto-renew payments that are exactly 1 day from
        //         expiring to prevent unintended expiration.
        //   - Admin users are always auto-renewed unconditionally
        //     (also resets last_payment_date on the user row)
        //   - For any user with a Paid registration at exactly 29 days
        //     old (1 day before 30-day limit), extend payment another
        //     month so they never get blocked inadvertently.
        // ============================================================
        const adminAutoRenewRegistrations = await sql`
          UPDATE public.register r
          SET payment_status   = 'Paid',
              updated_at       = NOW(),
              payment_amount   = COALESCE(r.payment_amount, CASE WHEN LOWER(COALESCE(r.module, r.module_title, '')) LIKE '%mep%' THEN 250000 ELSE 150000 END),
              payment_method   = COALESCE(r.payment_method, 'Auto-Renew (Admin)')
          FROM public.users u
          WHERE (r.user_id = u.user_id OR r.email_address = u.email)
            AND u.role = 'admin'
            AND r.payment_status = 'Paid'
          RETURNING r.id
        `;
        const adminCount = adminAutoRenewRegistrations?.length || 0;
        if (adminCount > 0) {
          // Also refresh last_payment_date on the admin users themselves
          await sql`
            UPDATE public.users u
            SET last_payment_date = NOW(),
                status = 'active'
            WHERE u.role = 'admin'
              AND EXISTS (
                SELECT 1 FROM register r
                WHERE (r.user_id = u.user_id OR r.email_address = u.email)
                  AND r.payment_status = 'Paid'
              )
          `;
          console.log(`♻️  Auto-renewed ${adminCount} admin registration payment(s).`);
        }

        // Auto-renew for 1-day-left registrations (29 days since payment)
        // regardless of role — grace so users don't drop on day 30 boundary
        const oneDayLeftRenewals = await sql`
          UPDATE public.register r
          SET payment_status   = 'Paid',
              updated_at       = NOW(),
              payment_method   = CASE WHEN r.payment_method IS NULL OR r.payment_method = '' THEN 'Auto-Renew' ELSE r.payment_method END
          WHERE r.payment_status = 'Paid'
            AND (COALESCE(r.updated_at, r.created_at) + INTERVAL '29 days' <= NOW())
            AND (COALESCE(r.updated_at, r.created_at) + INTERVAL '30 days' > NOW())
            AND NOT EXISTS (
              SELECT 1 FROM public.users u
              WHERE (r.user_id = u.user_id OR r.email_address = u.email)
                AND u.role = 'admin'
            )
          RETURNING r.id
        `;
        const oneDayCount = oneDayLeftRenewals?.length || 0;
        if (oneDayCount > 0) {
          console.log(`♻️  Auto-renewed ${oneDayCount} 1-day-left registration payment(s).`);
        }

        // If any renewal happened, refresh user-level last_payment_date
        if (adminCount + oneDayCount > 0) {
          await sql`
            UPDATE public.users u
            SET last_payment_date = (
              SELECT MAX(COALESCE(r.updated_at, r.created_at))
              FROM register r
              WHERE (r.user_id = u.user_id OR r.email_address = u.email)
                AND r.payment_status = 'Paid'
            )
            WHERE u.status = 'active'
              AND EXISTS (
                SELECT 1 FROM register r
                WHERE (r.user_id = u.user_id OR r.email_address = u.email)
                  AND r.payment_status = 'Paid'
              )
          `;
        }

        // ============================================================
        // STEP 2: Block users for non-payment (excluding admins)
        // ============================================================

        // Block users based on last_payment_date in users table (legacy check)
        // — only NON-admin users
        const result1 = await sql`
          UPDATE public.users
          SET status = 'blocked'
          WHERE status = 'active'
            AND role != 'admin'
            AND last_payment_date IS NOT NULL
            AND last_payment_date + INTERVAL '30 days' < NOW()
          RETURNING user_id
        `;

        // Block users who don't have any paid registration in register table
        // — only student/non-admin users
        const result2 = await sql`
          UPDATE public.users u
          SET status = 'blocked'
          WHERE u.status = 'active'
            AND u.role != 'admin'
            AND NOT EXISTS (
              SELECT 1 FROM register r
              WHERE (r.user_id = u.user_id OR r.email_address = u.email)
                AND r.payment_status = 'Paid'
            )
          RETURNING u.user_id
        `;

        // Block users whose last paid registration is more than 30 days old
        // Use updated_at if available (when payment was confirmed), otherwise use created_at
        // — only NON-admin users
        const result3 = await sql`
          UPDATE public.users u
          SET status = 'blocked'
          WHERE u.status = 'active'
            AND u.role != 'admin'
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

        const totalBlocked = (result1?.length || 0) + (result2?.length || 0) + (result3?.length || 0);
        if (totalBlocked > 0) {
          console.log(`🔒 Auto-blocked ${totalBlocked} non-admin user(s) for non-payment.`);
        }

        const totalRenewed = adminCount + oneDayCount;
        if (totalRenewed === 0 && totalBlocked === 0) {
          console.log('⏰ Auto-block job ran; nothing to block or renew today.');
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
