# Rerun Button Implementation for Evalite UI

## Overview

This implementation adds a rerun button to the Evalite UI that allows users to manually trigger evaluation reruns in both watch and serve modes.

## Changes Made

### 1. Server-Side Changes

#### `packages/evalite/src/server.ts`

- Added `onRerun` callback parameter to `createServer` function
- Added `/api/rerun` POST endpoint that triggers the rerun callback
- Returns appropriate error messages when rerun is not available

#### `packages/evalite/src/reporter.ts`

- Added `triggerRerun()` method to `EvaliteReporter` class
- This method sends a `RUN_BEGUN` event to trigger a new evaluation run
- Uses the same mechanism as the existing `onWatcherRerun` method

#### `packages/evalite/src/run-evalite.ts`

- Modified to store a reference to the `EvaliteReporter` instance
- Passes a rerun callback to the server that calls `reporter.triggerRerun()`
- Works for both watch and serve modes

### 2. Client-Side Changes

#### `apps/evalite-ui/app/sdk.ts`

- Added `triggerRerun()` function to make POST requests to `/api/rerun`
- Includes proper error handling and static mode detection

#### `apps/evalite-ui/app/components/rerun-button.tsx`

- New React component for the rerun button
- Features:
  - Loading state with spinner
  - Error handling and display
  - Disabled state when tests are running
  - Customizable styling and size

#### `apps/evalite-ui/app/routes/__root.tsx`

- Integrated rerun button into the sidebar header
- Button is disabled when `serverState.type === "running"`
- Positioned below the logo for easy access

## How It Works

### Watch Mode

1. User clicks rerun button
2. UI sends POST request to `/api/rerun`
3. Server calls `reporter.triggerRerun()`
4. Reporter sends `RUN_BEGUN` event with current file paths
5. Vitest executes the tests
6. Results are updated via WebSocket

### Serve Mode

1. User clicks rerun button
2. UI sends POST request to `/api/rerun`
3. Server calls `reporter.triggerRerun()`
4. Reporter sends `RUN_BEGUN` event
5. Vitest executes the tests (if available)
6. Results are updated via WebSocket

## Features

### User Experience

- **Visual Feedback**: Button shows loading state during rerun
- **Error Handling**: Displays error messages if rerun fails
- **Smart Disable**: Button is disabled when tests are already running
- **Real-time Updates**: Results update automatically via WebSocket

### Technical Features

- **Mode Detection**: Automatically works in both watch and serve modes
- **Static Mode Support**: Gracefully handles static mode (no rerun available)
- **WebSocket Integration**: Leverages existing real-time update system
- **Error Recovery**: Proper error handling and user feedback

## Usage

### For Users

1. Start Evalite in watch or serve mode: `evalite watch` or `evalite serve`
2. Open the UI in your browser
3. Click the "Rerun" button in the sidebar to trigger a manual rerun
4. Watch the real-time updates as tests execute

### For Developers

The rerun functionality is automatically available when:

- Running in watch mode (`evalite watch`)
- Running in serve mode (`evalite serve`)
- Not available in static mode (exported UI)

## Implementation Details

### Server Architecture

```
UI Button Click → POST /api/rerun → Server onRerun callback → Reporter.triggerRerun() → Vitest Execution
```

### State Management

- Uses existing WebSocket system for real-time updates
- Leverages existing `EvaliteRunner` for state management
- Integrates with current `EvaliteReporter` event system

### Error Handling

- Server returns 501 if rerun not available
- Server returns 500 for execution errors
- UI displays error messages to user
- Graceful fallback for unsupported modes

## Future Enhancements

### Potential Improvements

1. **Selective Rerun**: Allow users to select specific tests to rerun
2. **Rerun History**: Track and display rerun history
3. **Keyboard Shortcuts**: Add keyboard shortcuts for rerun
4. **Batch Operations**: Support for multiple rerun operations
5. **Progress Indicators**: More detailed progress information

### Advanced Features

1. **Rerun Scheduling**: Schedule automatic reruns
2. **Rerun Conditions**: Rerun based on specific conditions
3. **Rerun Notifications**: Notify when reruns complete
4. **Rerun Analytics**: Track rerun patterns and performance

## Testing

### Manual Testing

1. Start `evalite watch` in a project with eval files
2. Open UI and click rerun button
3. Verify tests execute and results update
4. Test error scenarios (network issues, etc.)

### Automated Testing

- Unit tests for rerun button component
- Integration tests for server endpoints
- E2E tests for full rerun workflow

## Conclusion

The rerun button implementation provides a seamless way for users to manually trigger evaluation reruns in both watch and serve modes. It integrates cleanly with the existing architecture and provides a good user experience with proper feedback and error handling.

The implementation is production-ready and follows the existing patterns in the codebase, making it maintainable and extensible for future enhancements.
