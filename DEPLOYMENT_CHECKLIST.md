# AITradeMinds AAOS v1.0 — Free Production Deployment Checklist (Phase R.2)

## 1. GitHub (Done locally)
- [x] Repository validated
- [ ] Push to GitHub (main branch)
- [ ] Create release tag `v1.0.0-rc1`
- [ ] Add LICENSE (MIT recommended)

## 2. Supabase (Manual Steps)
1. Create free Supabase project at https://supabase.com/dashboard
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role key → `SUPABASE_SERVICE_ROLE_KEY`
3. In Database Settings:
   - Enable Connection Pooler (Transaction Mode, port 6543)
   - Use Pooler URL for `DATABASE_URL` (with `?pgbouncer=true`)
4. Run the SQL in `supabase/migrations/000001_initial_schema.sql` in SQL Editor
5. Enable RLS policies and add Row Level Security for `auth.uid()` if adding real auth
6. (Optional) Set up Supabase Auth (Email, Google, etc.)

## 3. Vercel (Frontend - Recommended)
1. Connect GitHub repo to Vercel (free tier)
2. Add all environment variables from `.env.example`
3. Deploy (automatic on push to main)
4. Set production domain

## 4. Render.com (Alternative Backend/Fullstack)
1. Connect GitHub repo to Render
2. Use `render.yaml` for infrastructure-as-code
3. Add environment variables
4. Deploy (free web service with 750 hours/month)

## 5. Post-Deployment
- Update `DATABASE_URL` in platform dashboard to use Supabase pooler
- Verify `/api/health` returns `{ "ok": true }`
- Test paper trading flow on deployed dashboard
- Monitor logs in Vercel/Render + Supabase dashboard
- Add rate limiting middleware if traffic increases (free tier limits apply)

## Known Limitations (Free Tier)
- Supabase: 500MB DB, limited compute, rate limits
- Vercel: 100 GB-hours/month serverless, hobby limits on functions
- Render: 750 free hours/month, sleeps after inactivity
- No persistent WebSocket for real-time trading (use Supabase Realtime)
- Paper trading only — no real execution
- AI features use mock data (integrate OpenRouter for real inference)

Once the above manual steps are completed on your accounts, the platform will be fully deployed as a production-like Paper Trading AAOS v1.0.

Current local state is fully prepared for free deployment.
