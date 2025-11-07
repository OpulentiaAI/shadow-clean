# Vercel Environment Variables Setup Guide

**Issue:** Authentication endpoints returning 500/429 errors  
**Cause:** Missing required environment variables in Vercel deployment  
**Solution:** Configure environment variables in Vercel project settings

---

## 🔐 Required Environment Variables

### 1. **Better Auth Secret**
```bash
BETTER_AUTH_SECRET=<generate-random-secret>
```

**How to generate:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

### 2. **GitHub OAuth Application**

#### Create GitHub OAuth App:
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** Shadow Clean
   - **Homepage URL:** `https://shadow-clean-agent-space-7f0053b9.vercel.app`
   - **Authorization callback URL:** `https://shadow-clean-agent-space-7f0053b9.vercel.app/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID**
6. Generate a **Client Secret**

#### Set in Vercel:
```bash
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
```

---

### 3. **Database Connection**

You need a PostgreSQL database with Prisma support.

#### Option A: Neon (Recommended)
1. Go to https://neon.tech
2. Create a new project
3. Get connection strings:

```bash
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
```

#### Option B: Supabase
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings > Database
4. Copy connection strings (use Transaction pooler for DATABASE_URL)

---

### 4. **Production URL (Optional)**
```bash
NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=shadow-clean-agent-space-7f0053b9.vercel.app
```

---

## 🚀 How to Set Environment Variables in Vercel

### **Via Vercel Dashboard:**

1. **Navigate to Project Settings**
   ```
   https://vercel.com/agent-space-7f0053b9/shadow-clean/settings/environment-variables
   ```

2. **Add Each Variable**
   - Click "Add New"
   - Enter variable name (e.g., `BETTER_AUTH_SECRET`)
   - Enter value
   - Select environments: **Production, Preview, Development**
   - Click "Save"

3. **Required Variables to Add:**
   - `BETTER_AUTH_SECRET`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` (optional)

---

### **Via Vercel CLI:**

```bash
# Login to Vercel
vercel login

# Link to your project
cd /Users/jeremyalston/Downloads/Component\ paradise/shadow-clean
vercel link

# Add environment variables
vercel env add BETTER_AUTH_SECRET production
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Redeploy to apply changes
vercel --prod
```

---

## 🗄️ Database Setup (Prisma)

After setting DATABASE_URL, you need to run migrations:

### **Option 1: Using Vercel CLI**
```bash
# Set DATABASE_URL locally
export DATABASE_URL="your-production-database-url"

# Run Prisma migrations
cd apps/server
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### **Option 2: Add to Vercel Build**
The deployment already has `postinstall` script that runs `prisma generate`, but you may need to run migrations manually first.

---

## ✅ Verification Steps

After setting environment variables:

### 1. **Redeploy the Application**
```bash
vercel --prod
```

### 2. **Check Environment Variables**
```bash
# Via CLI
vercel env ls

# Or visit dashboard
https://vercel.com/agent-space-7f0053b9/shadow-clean/settings/environment-variables
```

### 3. **Test Authentication**
```bash
# Should return 200 (not 500)
curl -I https://shadow-clean-agent-space-7f0053b9.vercel.app/api/auth/session
```

### 4. **Check Logs**
```bash
# View deployment logs
vercel logs https://shadow-clean-agent-space-7f0053b9.vercel.app
```

---

## 🐛 Troubleshooting

### **500 Errors After Setting Variables**
- Ensure DATABASE_URL is accessible from Vercel
- Check if database allows connections from Vercel IPs
- Verify Prisma migrations are applied

### **429 Rate Limit Errors**
- GitHub OAuth rate limiting due to repeated failed attempts
- Wait a few minutes before testing again
- Clear browser cache and cookies

### **CORS Errors**
- Ensure `trustedOrigins` in auth config matches deployment URL
- Check `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` is set correctly

### **Database Connection Errors**
- Verify connection string format
- Check SSL mode (`?sslmode=require` for Neon)
- Ensure database is not hibernated (Neon free tier)

---

## 📝 Complete Environment Variable Checklist

- [ ] `BETTER_AUTH_SECRET` - Generated random secret
- [ ] `GITHUB_CLIENT_ID` - From GitHub OAuth app
- [ ] `GITHUB_CLIENT_SECRET` - From GitHub OAuth app
- [ ] `DATABASE_URL` - PostgreSQL connection string (pooled)
- [ ] `DIRECT_URL` - PostgreSQL connection string (direct)
- [ ] `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` - Production domain
- [ ] Prisma migrations run on production database
- [ ] GitHub OAuth callback URL configured correctly
- [ ] Redeploy after setting all variables

---

## 🎯 Quick Setup Commands

```bash
# 1. Generate auth secret
AUTH_SECRET=$(openssl rand -hex 32)
echo "BETTER_AUTH_SECRET=$AUTH_SECRET"

# 2. Add to Vercel (interactive)
vercel env add BETTER_AUTH_SECRET production
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# 3. Run migrations
export DATABASE_URL="your-production-db-url"
cd apps/server
npx prisma migrate deploy

# 4. Redeploy
cd ../..
vercel --prod
```

---

## 📚 Additional Resources

- **Better Auth Docs:** https://www.better-auth.com/docs/introduction
- **GitHub OAuth Apps:** https://docs.github.com/en/apps/oauth-apps/building-oauth-apps
- **Prisma Migrations:** https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Vercel Environment Variables:** https://vercel.com/docs/projects/environment-variables
- **Neon Database:** https://neon.tech/docs/get-started-with-neon

---

*Once environment variables are configured and the application is redeployed, authentication should work correctly.*
