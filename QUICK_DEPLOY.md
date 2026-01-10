# Quick Deploy Commands

## 🚀 TL;DR - Copy & Paste These Commands

Open terminal and paste each section one at a time:

### Deploy to Convex (5 min)
```bash
cd /Users/jeremyalston/shadow-clean
npx convex codegen
npx convex deploy --prod
```

### Deploy to Vercel (3 min)
```bash
npm run build
vercel --prod
```

### Verify No Duplicates (1 min)
```bash
TASK_ID=$(npx convex run --prod api.testHelpers:createTestTask '{"name":"Test"}' | jq -r '.taskId')
npx convex run --prod api.streaming:streamChatWithTools '{
  "taskId":"'$TASK_ID'",
  "prompt":"What is 2+2?",
  "model":"openai/gpt-4o-mini",
  "apiKeys":{"openrouter":"YOUR_KEY"}
}'
COUNT=$(npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '[.[] | select(.role=="ASSISTANT")] | length')
echo "Assistant messages: $COUNT (should be 1)"
npx convex run --prod api.testHelpers:deleteTestTask '{"taskId":"'$TASK_ID'"}'
```

---

## ✅ Success Indicators

After deployment, you should see:

1. **Convex**: ✓ Deployed successfully
2. **Vercel**: ✓ Production: https://code.opulentia.ai
3. **Tests**: Assistant messages = 1 (not 2 or more)

---

## 📍 Location

All commands run from:
```
/Users/jeremyalston/shadow-clean
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `npx: command not found` | Install Node.js from nodejs.org |
| `convex: command not found` | Run `npm install -g convex` |
| Convex deploy fails | Check you're in the right directory |
| Vercel deploy fails | Run `vercel login` first |

---

Done! That's all you need. See `DEPLOY_NOW.md` for detailed guide.
