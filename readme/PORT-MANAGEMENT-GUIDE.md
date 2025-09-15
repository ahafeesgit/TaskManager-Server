# Port 3000 Process Management Guide

## 🚨 Common Issue: Port Already in Use

When you see this error:
```
Error: listen EADDRINUSE: address already in use :::3000
```

This means another process is already using port 3000. Here's how to resolve it.

## 🔍 Step 1: Identify the Process

### **macOS/Linux:**
```bash
# Find process using port 3000
lsof -ti :3000

# Get detailed process info
lsof -i :3000

# Alternative method
netstat -tulpn | grep :3000
```

### **Windows:**
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Get process details
tasklist /FI "PID eq [process_id]"
```

## ⚡ Step 2: Kill the Process

### **macOS/Linux - Method 1 (Recommended):**
```bash
# Quick one-liner to kill process on port 3000
kill $(lsof -ti :3000)

# Or step by step:
# 1. Find the PID
PID=$(lsof -ti :3000)
echo "Process using port 3000: $PID"

# 2. Kill the process
kill $PID
```

### **macOS/Linux - Method 2 (Force Kill):**
```bash
# If normal kill doesn't work, force kill
kill -9 $(lsof -ti :3000)

# Or manually with PID
kill -9 [PID_NUMBER]
```

### **Windows:**
```cmd
# Kill process by PID
taskkill /PID [PID_NUMBER] /F

# Kill all node processes (use with caution)
taskkill /IM node.exe /F
```

## 🛠 Step 3: Verify Port is Free

### **macOS/Linux:**
```bash
# Check if port 3000 is now free
lsof -ti :3000
# Should return nothing if port is free

# Alternative verification
netstat -tulpn | grep :3000
# Should return nothing if port is free
```

### **Windows:**
```cmd
# Check if port 3000 is now free
netstat -ano | findstr :3000
# Should return nothing if port is free
```

## 🚀 Step 4: Start Your Application

Once the port is free, start your TaskManager server:

```bash
# Start development server
npm run start:dev

# Or production server
npm run start:prod
```

## 🔧 Automated Solutions

### **Create a Kill Script (macOS/Linux):**

Create `scripts/kill-port-3000.sh`:
```bash
#!/bin/bash

PORT=3000
echo "🔍 Checking for processes on port $PORT..."

PID=$(lsof -ti :$PORT)

if [ -z "$PID" ]; then
    echo "✅ Port $PORT is already free!"
else
    echo "🚨 Found process $PID using port $PORT"
    echo "⚡ Killing process..."
    kill $PID
    
    # Wait a moment and verify
    sleep 1
    
    if lsof -ti :$PORT > /dev/null; then
        echo "⚠️  Process still running, force killing..."
        kill -9 $PID
    fi
    
    echo "✅ Port $PORT is now free!"
fi
```

Make it executable:
```bash
chmod +x scripts/kill-port-3000.sh
```

Usage:
```bash
./scripts/kill-port-3000.sh
```

### **Add npm Script:**

Add to your `package.json`:
```json
{
  "scripts": {
    "kill-port": "kill $(lsof -ti :3000) 2>/dev/null || echo 'Port 3000 is already free'",
    "start:clean": "npm run kill-port && npm run start:dev"
  }
}
```

Usage:
```bash
# Kill process on port 3000
npm run kill-port

# Kill and start fresh
npm run start:clean
```

## 🎯 Common Scenarios

### **Scenario 1: Development Server Crashed**
```bash
# The server crashed but process is still running
npm run kill-port
npm run start:dev
```

### **Scenario 2: Multiple Terminal Sessions**
```bash
# You started the server in another terminal and forgot
lsof -i :3000  # Find which terminal/process
kill $(lsof -ti :3000)
```

### **Scenario 3: IDE Started Server**
```bash
# VS Code or other IDE started a server
ps aux | grep node  # Find all node processes
kill [PID_OF_UNWANTED_PROCESS]
```

### **Scenario 4: Docker Container**
```bash
# If running in Docker
docker ps  # List running containers
docker stop [CONTAINER_ID]
```

## 🔍 Advanced Troubleshooting

### **Find All Node.js Processes:**
```bash
# macOS/Linux
ps aux | grep node

# Windows
tasklist | findstr node
```

### **Kill All Node.js Processes (Nuclear Option):**
```bash
# macOS/Linux (use with caution!)
pkill -f node

# Windows (use with caution!)
taskkill /IM node.exe /F
```

### **Check What's Running on Common Ports:**
```bash
# Check multiple ports at once
lsof -i :3000,3001,8000,8080

# Check all listening ports
netstat -tulpn | grep LISTEN
```

## 📋 Quick Reference Commands

| Task | macOS/Linux | Windows |
|------|-------------|---------|
| **Find process on port 3000** | `lsof -ti :3000` | `netstat -ano \| findstr :3000` |
| **Kill process on port 3000** | `kill $(lsof -ti :3000)` | `taskkill /PID [PID] /F` |
| **Force kill** | `kill -9 $(lsof -ti :3000)` | `taskkill /PID [PID] /F` |
| **Verify port is free** | `lsof -ti :3000` | `netstat -ano \| findstr :3000` |

## 💡 Prevention Tips

1. **Always stop servers properly** using `Ctrl+C` in the terminal
2. **Use process managers** like PM2 for production
3. **Check for running processes** before starting new servers
4. **Use different ports** for different projects
5. **Close terminals properly** when done developing

## ⚠️ Important Notes

- **Be careful with force kill** (`kill -9`) as it doesn't allow graceful shutdown
- **Check what you're killing** - make sure it's the right process
- **Windows users**: Administrator privileges may be required
- **Docker users**: Use Docker commands instead of system commands
- **Production servers**: Always use proper process managers

This guide ensures you can quickly resolve port conflicts and get your TaskManager server running smoothly! 🚀
