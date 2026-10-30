import {
  breadcrumb,
  clearDiagnostics,
  diagnosticContext,
  diagnosticSnapshot,
  errorCode,
  reportIssue,
  safeDetails,
  setDiagnosticSink,
  setRemoteReporting,
} from "../../src/services/diagnostics/client";

beforeEach(() => {
  clearDiagnostics();
  setRemoteReporting(true);
});
const makeSink = () => ({
  log: jest.fn(),
  context: jest.fn(),
  error: jest.fn(),
});
it("allows small useful metadata while rejecting identities, credentials, messages and URLs", () => {
  expect(
    safeDetails({
      levelId: 15,
      density: 3.333333,
      preview: true,
      screen: "Game",
      email: "player@example.com",
      uid: "secret",
      token: "abc",
      scope: "user@example.com",
      reason: "https://host/?token=secret",
      musicVolume: Infinity,
    })
  ).toEqual({
    levelId: "15",
    density: "3.33",
    preview: "true",
    screen: "Game",
  });
});
it("keeps a copy of only the last 50 events and rejects arbitrary event names", () => {
  for (let i = 0; i < 70; i++) breadcrumb("game.move", { moves: i });
  breadcrumb("email@example.com");
  const snapshot = diagnosticSnapshot();
  expect(snapshot.recent).toHaveLength(50);
  expect(snapshot.recent[0].detail.moves).toBe("20");
  snapshot.recent[0].detail.moves = "changed";
  expect(diagnosticSnapshot().recent[0].detail.moves).toBe("20");
});
it("sends only changed context and survives a broken native adapter", () => {
  const sink = makeSink();
  setDiagnosticSink(sink);
  sink.context.mockClear();
  diagnosticContext({ screen: "Game", levelId: 15 });
  diagnosticContext({ screen: "Game", levelId: 15 });
  expect(sink.context).toHaveBeenCalledTimes(1);
  sink.log.mockImplementation(() => {
    throw new Error("native unavailable");
  });
  sink.error.mockImplementation(() => {
    throw new Error("native unavailable");
  });
  expect(() => {
    breadcrumb("game.loaded");
    reportIssue("assets.decode", new Error("failed"));
  }).not.toThrow();
});
it("redacts the original error message, keeps stack frame locations and deduplicates issues", () => {
  const sink = makeSink();
  setDiagnosticSink(sink);
  const cause = new TypeError("player@example.com token=private");
  cause.stack =
    "TypeError: player@example.com\n    at load (index.android.bundle:1:321)\n    at https://secret.com/?token=private";
  reportIssue("assets.decode", cause);
  reportIssue("assets.decode", cause);
  expect(sink.error).toHaveBeenCalledTimes(1);
  const reported = sink.error.mock.calls[0][0] as Error;
  expect(reported.message).toBe("assets.decode:TypeError");
  expect(reported.stack).toContain("index.android.bundle:1:321");
  expect(reported.stack).not.toMatch(/example.com|private|secret.com/);
});
it("caps unique reports per session and buffers only 20 before native initialization", () => {
  for (let i = 0; i < 100; i++) reportIssue(`scope.${i}`, new Error("failure"));
  const sink = makeSink();
  setDiagnosticSink(sink);
  expect(sink.error).toHaveBeenCalledTimes(20);
});
it("keeps expected offline failures as local breadcrumbs, without non-fatal spam", () => {
  const sink = makeSink();
  setDiagnosticSink(sink);
  reportIssue("sync.write", {
    code: "firestore/unavailable",
    message: "sensitive",
  });
  expect(sink.error).not.toHaveBeenCalled();
  expect(diagnosticSnapshot().recent[0].detail.code).toBe(
    "firestore/unavailable"
  );
  expect(errorCode({ code: "email@example.com" })).toBe("unknown");
});
it("never uploads buffered errors or breadcrumbs from an opted-out interval", () => {
  reportIssue("before.optout", new Error("old"));
  setRemoteReporting(false);
  setDiagnosticSink(null);
  breadcrumb("optout.local");
  reportIssue("optout.failure", new Error("private"));
  expect(diagnosticSnapshot().recent.length).toBeGreaterThan(0);
  setRemoteReporting(true);
  const sink = makeSink();
  setDiagnosticSink(sink);
  expect(sink.log).not.toHaveBeenCalled();
  expect(sink.error).not.toHaveBeenCalled();
  reportIssue("new.failure", new Error("new"));
  expect(sink.error).toHaveBeenCalledTimes(1);
});
it("clears all context, history and pending issues on account deletion", () => {
  diagnosticContext({ linked: true, levelId: 15 });
  reportIssue("sync.write", new Error("failed"));
  clearDiagnostics();
  const sink = makeSink();
  setDiagnosticSink(sink);
  expect(diagnosticSnapshot()).toEqual({ context: {}, recent: [] });
  expect(sink.error).not.toHaveBeenCalled();
});
