# 🚀 Vercel CLI Deployment - Path Traversal Fixed

## Execute These Commands in Your Local Terminal

### **Quick Deployment (One Command)**

```bash
cd /Users/jeremyalston/shadow-clean/apps/frontend && vercel --prod
```

### **Or Use the Script**

```bash
cd /Users/jeremyalston/shadow-clean
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

---

## 🔧 Path Traversal Fix Applied

**Fixed in:** `apps/frontend/vercel.json`

**Before:**
```json
{
  "buildCommand": "cd ../.. && npx turbo build --filter=frontend",
  "installCommand": "cd ../.. && npm ci"
}
```

**After:**
```json
{
  "buildCommand": "npx turbo build --filter=frontend",
  "installCommand": "npm ci"
}
```

---

## 📋 Manual Steps

```bash
# Navigate to frontend directory
cd /Users/jeremyalston/shadow-clean/apps/frontend

# Install dependencies
npm ci

# Build project
npm run build

# Deploy to production
vercel --prod
```

---

## ✅ Verification

```bash
# Check deployment status
vercel ls --prod

# View deployment logs
vercel logs --prod
```

---

**Execute the quick deployment command above!**
