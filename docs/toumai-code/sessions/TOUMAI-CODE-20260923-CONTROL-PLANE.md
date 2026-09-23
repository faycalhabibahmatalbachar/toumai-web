# Session TOUMAI-CODE-20260923-CONTROL-PLANE

## Scope
Typed Web contract for the Toumaï Code durable Control Plane. No production deployment.

## Architecture
The Web side does not own project execution state. It calls the backend Control Plane and consumes a read-only SSE projection. Closing the browser or aborting the stream only closes the HTTP reader; it does not issue cancel and cannot terminate the durable worker.

The shared role identifiers exactly match Coding Agent V2:
`architect`, `research`, `repo_explorer`, `database`, `backend`, `frontend`, `tester`, `debugger`, `security`, `reviewer`, `release`.

The client exposes typed create/status/pause/resume/cancel/event APIs. SSE uses authenticated `fetch` rather than `EventSource` because Toumaï authenticated requests carry bearer headers. Reconnection can resume with `Last-Event-ID`.

## Files modified
- `lib/toumai-code-api.ts`
- `docs/toumai-code/sessions/TOUMAI-CODE-20260923-CONTROL-PLANE.md`

## Tests executed
- Isolated TypeScript contract harness: `tsc --noEmit` — exit code 0.
- No production deployment.
- Full repository Web build/test suite was not run in this session; the verification claim is limited to the new typed client contract.

## Remaining limits
No Toumaï Code dashboard page is added in this milestone. The typed API/SSE contract is ready for a UI without moving orchestration state into the browser.

## Commit SHA
Implementation code head before this documentation-only commit: `5a3f95f7af5eaf8d326c9786237e86a0b9e798ba`.
