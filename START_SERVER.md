# 🚀 How to Start the Backend Server

## ✅ Correct Way to Start the Server

You **MUST** be in the `Backend-E-learning` directory to start the backend server.

### **Step 1: Navigate to Backend Directory**
```bash
cd /Users/apple/Other-project/elearningbackend/Backend-E-learning
```

### **Step 2: Start the Server**

**Option A: Production Mode**
```bash
npm start
```
This runs: `node src/server.js` and starts on port **5000**

**Option B: Development Mode (with auto-restart)**
```bash
npm run dev
```
This runs: `nodemon src/server.js` - auto-restarts on file changes

---

## ❌ What NOT to Do

**DO NOT run `npm start` from:**
- ❌ `/Users/apple/Other-project/elearningbackend/` (parent directory)
- ❌ Any other directory

**If you see Angular output (`ng serve`), you're in the wrong directory!**

---

## 🔍 Verify You're in the Right Directory

Before running `npm start`, check:
```bash
pwd
# Should show: /Users/apple/Other-project/elearningbackend/Backend-E-learning

ls package.json
# Should show: package.json exists

cat package.json | grep '"start"'
# Should show: "start": "node src/server.js"
```

---

## ✅ Expected Output When Starting Backend

When you run `npm start` from the **correct** directory, you should see:
```
Starting Quiz Timer Service...
🚀 Server running on port 5000
```

**NOT** Angular output like:
```
❌ Browser bundles
❌ Initial chunk files
❌ ng serve
```

---

## 🛠️ Quick Fix

If you're seeing Angular output:

1. **Stop the current process** (Ctrl+C)

2. **Navigate to correct directory:**
   ```bash
   cd /Users/apple/Other-project/elearningbackend/Backend-E-learning
   ```

3. **Verify you're in the right place:**
   ```bash
   ls src/server.js
   # Should show: src/server.js exists
   ```

4. **Start the backend:**
   ```bash
   npm start
   ```

5. **You should see:**
   ```
   Starting Quiz Timer Service...
   🚀 Server running on port 5000
   ```

---

## 📝 Summary

- ✅ **Correct directory:** `/Users/apple/Other-project/elearningbackend/Backend-E-learning`
- ✅ **Command:** `npm start` or `npm run dev`
- ✅ **Port:** 5000 (not 4200)
- ✅ **Output:** Node.js server logs (not Angular bundle output)


