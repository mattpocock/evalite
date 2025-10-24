# Testing Rerun Button Functionality

## Test Setup

### Prerequisites

1. Node.js version 22+ (due to Vite requirements)
2. All dependencies installed
3. Evalite project with eval files

### Test Steps

#### 1. Basic Functionality Test

```bash
# Start evalite in watch mode
evalite watch

# Open browser to http://localhost:3006
# Look for rerun button in sidebar
# Click rerun button
# Verify tests execute and UI updates
```

#### 2. Serve Mode Test

```bash
# Start evalite in serve mode
evalite serve

# Open browser to http://localhost:3006
# Click rerun button
# Verify tests execute and UI updates
```

#### 3. Error Handling Test

```bash
# Test with no eval files
# Verify appropriate error messages
# Test network disconnection scenarios
```

## Expected Behavior

### Watch Mode

- Rerun button should be visible in sidebar
- Button should be disabled when tests are running
- Clicking button should trigger test execution
- Results should update in real-time via WebSocket

### Serve Mode

- Rerun button should be visible in sidebar
- Button should be disabled when tests are running
- Clicking button should trigger test execution
- Results should update in real-time via WebSocket

### Error Scenarios

- Network errors should show user-friendly messages
- Server errors should be handled gracefully
- Button should re-enable after errors

## Implementation Verification

### Server Endpoints

- `POST /api/rerun` should return 200 on success
- `POST /api/rerun` should return 501 when rerun not available
- `POST /api/rerun` should return 500 on server errors

### WebSocket Updates

- State should change from "idle" to "running" when rerun starts
- State should change back to "idle" when rerun completes
- UI should reflect state changes in real-time

### UI Components

- Rerun button should be properly styled
- Loading state should show spinner
- Error messages should be displayed
- Button should be disabled during execution

## Troubleshooting

### Common Issues

1. **Build Errors**: Ensure Node.js version 22+ and all dependencies installed
2. **WebSocket Connection**: Check that server is running on correct port
3. **Button Not Visible**: Verify component is properly imported and rendered
4. **Rerun Not Working**: Check server logs for error messages

### Debug Steps

1. Check browser console for JavaScript errors
2. Check server logs for API errors
3. Verify WebSocket connection status
4. Test API endpoints directly with curl

## Success Criteria

✅ Rerun button appears in UI sidebar
✅ Button is disabled when tests are running
✅ Clicking button triggers test execution
✅ Results update in real-time
✅ Error handling works properly
✅ Works in both watch and serve modes
✅ Graceful handling of unsupported modes
