# Rerun Button Usage Example

## Quick Start

### 1. Create a Simple Eval File

Create `example.eval.ts` in your project:

```typescript
import { evalite } from "evalite";

evalite("simple math test", {
  data: () => [
    { input: "2 + 2", expected: "4" },
    { input: "3 * 3", expected: "9" },
  ],
  task: async ({ input }) => {
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return eval(input).toString();
  },
  scorer: (output, expected) => {
    return output === expected ? 1 : 0;
  },
});
```

### 2. Start Evalite in Watch Mode

```bash
evalite watch
```

### 3. Open the UI

Navigate to `http://localhost:3006` in your browser.

### 4. Use the Rerun Button

1. Look for the "Rerun" button in the sidebar (below the logo)
2. Click the button to trigger a manual rerun
3. Watch the real-time updates as tests execute
4. See the results update in the UI

## Advanced Usage

### Serve Mode

```bash
# Run once and serve UI
evalite serve

# Open UI and use rerun button
# This will rerun the historical evaluations
```

### With Specific Files

```bash
# Watch specific eval file
evalite watch example.eval.ts

# Serve specific eval file
evalite serve example.eval.ts
```

## UI Features

### Rerun Button States

- **Normal**: Shows "Rerun" with refresh icon
- **Loading**: Shows "Rerunning..." with spinner
- **Disabled**: When tests are already running
- **Error**: Shows error message if rerun fails

### Real-time Updates

- Button automatically disables during test execution
- Results update in real-time via WebSocket
- Progress indicators show test status
- Final results display when complete

## Integration with Existing Workflow

### Development Workflow

1. Make changes to eval files
2. Use rerun button for immediate testing
3. Watch mode still auto-reruns on file changes
4. Manual rerun provides additional control

### CI/CD Integration

- Rerun button works in development
- Export functionality still available for CI
- Static mode doesn't include rerun (by design)

## Troubleshooting

### Button Not Working

1. Check browser console for errors
2. Verify server is running
3. Check WebSocket connection
4. Look for network errors

### Tests Not Running

1. Ensure eval files exist
2. Check file paths are correct
3. Verify eval syntax is valid
4. Check server logs for errors

### UI Not Updating

1. Check WebSocket connection
2. Refresh browser page
3. Verify server state endpoint
4. Check for JavaScript errors

## Best Practices

### When to Use Rerun

- After making code changes
- To test specific scenarios
- When file watching doesn't trigger
- For debugging test issues

### Performance Considerations

- Rerun executes all tests (not selective)
- Use caching for LLM calls in watch mode
- Consider test execution time
- Monitor resource usage

### Error Handling

- Check error messages in UI
- Review server logs for details
- Verify network connectivity
- Test with simple eval files first
