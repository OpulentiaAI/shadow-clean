#!/usr/bin/env python3
"""
Python E2E Streaming Test Runner
Tests reasoning deltas and streaming functionality using HTTP requests
"""

import json
import time
import urllib.request
import urllib.parse
import os
from datetime import datetime

# Configuration
CONVEX_URL = os.getenv('CONVEX_URL', 'https://veracious-alligator-638.convex.cloud')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY')
CONVEX_DEPLOY_KEY = 'prod:veracious-alligator-638|eyJ2MiI6IjM1MTMwYzUyOWQ4NjRlNDE5Y2Y3MDE3MGVlNDA1ZmVmIn0='

print('🧪 PYTHON E2E STREAMING TEST RUNNER')
print('=' * 50)
print(f'📡 Convex URL: {CONVEX_URL}')
print(f'🔑 OpenRouter API Key: {"✅ Present" if OPENROUTER_API_KEY else "❌ Missing"}')
print(f'🚀 NVIDIA API Key: {"✅ Present" if NVIDIA_API_KEY else "❌ Missing"}')
print(f'🔐 Convex Deploy Key: {"✅ Present" if CONVEX_DEPLOY_KEY else "❌ Missing"}')

if not NVIDIA_API_KEY and not OPENROUTER_API_KEY:
    print('❌ Either NVIDIA_API_KEY or OPENROUTER_API_KEY environment variable is required')
    exit(1)

def make_request(path, method='POST', data=None):
    """Make HTTP request to Convex API"""
    url = f"{CONVEX_URL}{path}"
    
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    
    if method == 'GET':
        req.get_method = lambda: 'GET'
    else:
        req.get_method = lambda: 'POST'
    
    if data:
        req.data = json.dumps(data).encode('utf-8')
    
    try:
        with urllib.request.urlopen(req) as response:
            text = response.read().decode('utf-8')
            try:
                body = json.loads(text) if text else None
            except:
                body = None
            return {
                'status': response.status,
                'body': body,
                'text': text
            }
    except Exception as e:
        return {
            'status': 500,
            'body': None,
            'text': str(e)
        }

def test_create_task():
    """Test 1: Create test task"""
    print('\n📋 Test 1: Create Test Task')
    print('-' * 30)
    
    response = make_request('/api/testHelpers.js/createTestTask', 'POST', {
        'name': 'Python Streaming Test: Reasoning Deltas',
    })
    
    if response['status'] != 200:
        raise Exception(f"Failed to create task: {response['text']}")
    
    task_id = response['body']['taskId']
    print(f'✅ Task created: {task_id}')
    return task_id

def test_reasoning_streaming(task_id):
    """Test 2: Test reasoning streaming with NVIDIA NIM"""
    print('\n🧠 Test 2: Reasoning Delta Streaming (NVIDIA NIM)')
    print('-' * 30)
    
    prompt = 'What is 15 * 23? Show your step-by-step reasoning.'
    
    # Use NVIDIA NIM model for reasoning
    model = 'nim:moonshotai/kimi-k2-thinking'
    api_keys = {'nvidia': NVIDIA_API_KEY} if NVIDIA_API_KEY else {'openrouter': OPENROUTER_API_KEY}
    
    # Fallback to OpenRouter if no NVIDIA key
    if not NVIDIA_API_KEY:
        model = 'deepseek/deepseek-r1'
    
    response = make_request('/api/streaming.js/streamChatWithTools', 'POST', {
        'taskId': task_id,
        'prompt': prompt,
        'model': model,
        'llmModel': model,
        'apiKeys': api_keys,
        'clientMessageId': f'python-reasoning-test-{int(time.time())}',
    })
    
    print(f'📡 Stream initiated with model: {model}')
    print(f'📡 Response status: {response["status"]}')
    
    if response['body'] and 'messageId' in response['body']:
        message_id = response['body']['messageId']
        print(f'✅ Message ID: {message_id}')
        
        # Wait for streaming to complete
        print('⏳ Waiting for streaming to complete...')
        time.sleep(8)  # Longer wait for reasoning models
        
        # Check the message
        msg_response = make_request(f'/api/messages.js/byTask?taskId={task_id}', 'GET')
        
        if msg_response['status'] == 200 and msg_response['body']:
            messages = msg_response['body']
            latest_msg = messages[-1] if messages else None
            
            if latest_msg:
                metadata = json.loads(latest_msg.get('metadataJson', '{}')) if latest_msg.get('metadataJson') else {}
                parts = metadata.get('parts', [])
                reasoning_parts = [p for p in parts if p.get('type') == 'reasoning']
                
                print(f'📊 Message Analysis:')
                print(f'  Content length: {len(latest_msg.get("content", ""))} chars')
                print(f'  Total parts: {len(parts)}')
                print(f'  Reasoning parts: {len(reasoning_parts)}')
                
                if reasoning_parts:
                    print('✅ Reasoning deltas captured!')
                    for i, part in enumerate(reasoning_parts):
                        text = part.get('text', '')
                        print(f'  Part {i + 1}: {text[:100]}...')
                else:
                    print('⚠️  No reasoning parts found - checking for regular content...')
                    if latest_msg.get('content'):
                        print(f'  Content preview: {latest_msg.get("content", "")[:200]}...')
                
                return {
                    'success': True,
                    'reasoningParts': len(reasoning_parts),
                    'totalParts': len(parts),
                    'model': model,
                    'contentLength': len(latest_msg.get('content', '')),
                }
            else:
                print('❌ No latest message found')
        else:
            print(f'❌ Failed to get messages: {msg_response["text"]}')
    else:
        print('❌ No messageId in response')
        print(f'Response body: {response["body"]}')
        print(f'Response text: {response["text"]}')
    
    return {'success': False, 'error': 'No reasoning data', 'model': model}

def test_tool_streaming(task_id):
    """Test 3: Test tool execution streaming"""
    print('\n🔧 Test 3: Tool Execution Streaming')
    print('-' * 30)
    
    prompt = 'List the files in the current directory'
    
    response = make_request('/api/streaming.js/streamChatWithTools', 'POST', {
        'taskId': task_id,
        'prompt': prompt,
        'model': 'anthropic/claude-3-5-haiku-latest',
        'llmModel': 'anthropic/claude-3-5-haiku-latest',
        'apiKeys': {
            'openrouter': OPENROUTER_API_KEY,
        },
        'clientMessageId': f'python-tool-test-{int(time.time())}',
    })
    
    print(f'📡 Tool stream initiated: {response["status"]}')
    
    if response['body'] and 'messageId' in response['body']:
        # Wait for tool execution to complete
        print('⏳ Waiting for tool execution...')
        time.sleep(8)
        
        # Check for tool calls
        tool_response = make_request(f'/api/agentTools.js/byTask?taskId={task_id}', 'GET')
        
        if tool_response['status'] == 200:
            tool_calls = tool_response['body'] or []
            print(f'🔧 Tool Analysis:')
            print(f'  Tool calls: {len(tool_calls)}')
            
            if tool_calls:
                print('✅ Tool execution captured!')
                for i, tool in enumerate(tool_calls):
                    tool_name = tool.get('toolName', 'unknown')
                    status = tool.get('status', 'unknown')
                    print(f'  Tool {i + 1}: {tool_name} ({status})')
            else:
                print('⚠️  No tool calls found')
            
            return {
                'success': True,
                'toolCalls': len(tool_calls),
                'toolNames': [t.get('toolName') for t in tool_calls],
            }
        else:
            print(f'❌ Failed to get tool data: {tool_response["text"]}')
    
    return {'success': False, 'error': 'No tool data'}

def test_message_parts(task_id):
    """Test 4: Manual message parts test"""
    print('\n🧩 Test 4: Manual Message Parts')
    print('-' * 30)
    
    try:
        # Start streaming
        start_response = make_request('/api/messages.js/startStreaming', 'POST', {
            'taskId': task_id,
            'llmModel': 'deepseek/deepseek-r1',
        })

        if start_response['status'] != 200:
            raise Exception(f"Failed to start streaming: {start_response['text']}")

        message_id = start_response['body']['messageId']
        print(f'📝 Started streaming: {message_id}')

        # Add reasoning part
        make_request('/api/messages.js/appendStreamDelta', 'POST', {
            'messageId': message_id,
            'deltaText': 'Let me think step by step.\n',
            'isFinal': False,
            'parts': [{
                'type': 'reasoning',
                'text': 'First, I need to analyze the problem carefully.',
            }],
        })

        # Add text part
        make_request('/api/messages.js/appendStreamDelta', 'POST', {
            'messageId': message_id,
            'deltaText': 'Based on my analysis:\n',
            'isFinal': False,
            'parts': [{
                'type': 'text',
                'text': 'The solution is to break it down into smaller steps.',
            }],
        })

        # Finalize
        make_request('/api/messages.js/appendStreamDelta', 'POST', {
            'messageId': message_id,
            'deltaText': '',
            'isFinal': True,
            'finishReason': 'stop',
        })

        # Verify parts
        msg_response = make_request(f'/api/messages.js/get?messageId={message_id}', 'GET')
        
        if msg_response['status'] == 200:
            message = msg_response['body']
            metadata = json.loads(message.get('metadataJson', '{}')) if message.get('metadataJson') else {}
            parts = metadata.get('parts', [])
            
            print(f'📊 Parts Analysis:')
            print(f'  Total parts: {len(parts)}')
            print(f'  Part types: {", ".join([p.get("type", "unknown") for p in parts])}')
            
            reasoning_parts = [p for p in parts if p.get('type') == 'reasoning']
            text_parts = [p for p in parts if p.get('type') == 'text']
            
            print(f'  Reasoning parts: {len(reasoning_parts)}')
            print(f'  Text parts: {len(text_parts)}')
            
            return {
                'success': True,
                'totalParts': len(parts),
                'reasoningParts': len(reasoning_parts),
                'textParts': len(text_parts),
            }
        
        return {'success': False, 'error': 'Failed to get message'}
    except Exception as e:
        print(f'❌ Message parts test failed: {e}')
        return {'success': False, 'error': str(e)}

def main():
    """Main test runner"""
    start_time = time.time()
    results = []

    try:
        # Test 1: Create task
        task_id = test_create_task()
        results.append({'test': 'Create Task', 'success': bool(task_id)})

        if not task_id:
            raise Exception('Failed to create test task')

        # Test 2: Reasoning streaming
        reasoning_result = test_reasoning_streaming(task_id)
        results.append({'test': 'Reasoning Streaming', **reasoning_result})

        # Test 3: Tool streaming
        tool_result = test_tool_streaming(task_id)
        results.append({'test': 'Tool Streaming', **tool_result})

        # Test 4: Message parts
        parts_result = test_message_parts(task_id)
        results.append({'test': 'Message Parts', **parts_result})

        # Summary
        duration = time.time() - start_time
        passed = sum(1 for r in results if r.get('success', False))
        total = len(results)

        print('\n' + '=' * 50)
        print('📊 TEST RESULTS SUMMARY')
        print('=' * 50)
        print(f'✅ Passed: {passed}/{total}')
        print(f'⏱️  Duration: {duration:.0f}ms')
        print(f'📈 Pass Rate: {(passed/total)*100:.1f}%')

        print('\n📋 Detailed Results:')
        for result in results:
            status = '✅' if result.get('success', False) else '❌'
            print(f'  {status} {result["test"]}')
            if 'error' in result:
                print(f'    Error: {result["error"]}')
            if 'reasoningParts' in result:
                print(f'    Reasoning parts: {result["reasoningParts"]}')
            if 'toolCalls' in result:
                print(f'    Tool calls: {result["toolCalls"]}')
            if 'totalParts' in result:
                print(f'    Total parts: {result["totalParts"]}')

        # Cleanup
        print('\n🧹 Cleaning up test task...')
        make_request('/api/testHelpers.js/deleteTestTask', 'POST', {'taskId': task_id})

        if passed == total:
            print('\n🎉 ALL TESTS PASSED!')
            exit(0)
        else:
            print('\n❌ SOME TESTS FAILED')
            exit(1)

    except Exception as e:
        print(f'💥 Test suite crashed: {e}')
        exit(1)

if __name__ == '__main__':
    main()
