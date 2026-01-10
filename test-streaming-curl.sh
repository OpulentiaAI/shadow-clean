#!/bin/bash

# Convex E2E Streaming Test Runner using curl
# Tests reasoning deltas and streaming functionality

set -e

CONVEX_URL="https://veracious-alligator-638.convex.cloud"
CONVEX_DEPLOY_KEY="prod:veracious-alligator-638|eyJ2MiI6IjM1MTMwYzUyOWQ4NjRlNDE5Y2Y3MDE3MGVlNDA1ZmVmIn0="

echo "🧪 CONVEX E2E STREAMING TEST RUNNER (curl)"
echo "=================================================="
echo "📡 Convex URL: $CONVEX_URL"
echo "🔐 Deploy Key: ${CONVEX_DEPLOY_KEY:0:30}..."

# Function to make Convex API request
make_convex_request() {
    local endpoint="$1"
    local method="${2:-POST}"
    local data="$3"
    
    echo "📡 Request: $method $endpoint"
    if [ -n "$data" ]; then
        echo "📦 Data: $data"
        response=$(curl -s -w "\n%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$CONVEX_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            "$CONVEX_URL$endpoint")
    fi
    
    # Split response and status code
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "📊 Status: $http_code"
    echo "📄 Response: $body"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Success"
        return 0
    else
        echo "❌ Failed"
        return 1
    fi
}

# Test 1: Create test task
echo ""
echo "📋 Test 1: Create Test Task"
echo "----------------------------"

task_data='{"name":"curl-streaming-test"}'
if make_convex_request "/api/testHelpers/createTestTask" "POST" "$task_data"; then
    task_id=$(echo "$body" | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Task created: $task_id"
else
    echo "❌ Failed to create task"
    exit 1
fi

# Test 2: Test basic streaming
echo ""
echo "📡 Test 2: Basic Streaming Test"
echo "----------------------------"

stream_data='{"taskId":"'$task_id'","llmModel":"anthropic/claude-3-5-haiku-latest"}'
if make_convex_request "/api/messages/startStreaming" "POST" "$stream_data"; then
    message_id=$(echo "$body" | grep -o '"messageId":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Streaming started: $message_id"
else
    echo "❌ Failed to start streaming"
    exit 1
fi

# Test 3: Add streaming deltas
echo ""
echo "📝 Test 3: Add Streaming Deltas"
echo "----------------------------"

delta1_data='{"messageId":"'$message_id'","deltaText":"Hello! This is a test.\n","isFinal":false}'
if make_convex_request "/api/messages/appendStreamDelta" "POST" "$delta1_data"; then
    echo "✅ Delta 1 added"
else
    echo "❌ Failed to add delta 1"
fi

delta2_data='{"messageId":"'$message_id'","deltaText":"This tests basic streaming functionality.\n","isFinal":false}'
if make_convex_request "/api/messages/appendStreamDelta" "POST" "$delta2_data"; then
    echo "✅ Delta 2 added"
else
    echo "❌ Failed to add delta 2"
fi

delta3_data='{"messageId":"'$message_id'","deltaText":"Test completed successfully!","isFinal":true,"finishReason":"stop"}'
if make_convex_request "/api/messages/appendStreamDelta" "POST" "$delta3_data"; then
    echo "✅ Final delta added"
else
    echo "❌ Failed to add final delta"
fi

# Test 4: Verify message
echo ""
echo "🔍 Test 4: Verify Message Content"
echo "----------------------------"

if make_convex_request "/api/messages/get?messageId=$message_id" "GET"; then
    content_length=$(echo "$body" | grep -o '"content":"[^"]*"' | cut -d'"' -f4 | wc -c)
    echo "✅ Message verified: $content_length characters"
else
    echo "❌ Failed to verify message"
fi

# Test 5: Test reasoning parts
echo ""
echo "🧠 Test 5: Test Reasoning Parts"
echo "----------------------------"

reasoning_delta_data='{"messageId":"'$message_id'","deltaText":"Let me think step by step.\n","isFinal":false,"parts":[{"type":"reasoning","text":"First, I need to analyze the problem."}]}'
if make_convex_request "/api/messages/appendStreamDelta" "POST" "$reasoning_delta_data"; then
    echo "✅ Reasoning part added"
else
    echo "❌ Failed to add reasoning part"
fi

# Test 6: Check all messages for task
echo ""
echo "📋 Test 6: List All Messages"
echo "----------------------------"

if make_convex_request "/api/messages/byTask?taskId=$task_id" "GET"; then
    message_count=$(echo "$body" | grep -o '"_id"' | wc -l)
    echo "✅ Found $message_count messages"
else
    echo "❌ Failed to list messages"
fi

# Cleanup
echo ""
echo "🧹 Cleanup: Delete Test Task"
echo "----------------------------"

cleanup_data='{"taskId":"'$task_id'"}'
if make_convex_request "/api/testHelpers/deleteTestTask" "POST" "$cleanup_data"; then
    echo "✅ Task deleted"
else
    echo "❌ Failed to delete task"
fi

echo ""
echo "=================================================="
echo "🎉 ALL TESTS COMPLETED"
echo "=================================================="
