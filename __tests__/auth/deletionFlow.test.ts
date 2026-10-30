import {
  runDeletion,
  deletionIntent,
  type DeletionIntent,
  type DeletionPort,
} from "../../src/services/auth/deletionFlow";
function harness() {
  let intent: DeletionIntent | null = null;
  let uid: string | null = "player";
  const events: string[] = [];
  const port: DeletionPort = {
    read: () => intent,
    write: (value) => {
      intent = value;
      events.push(value.stage);
    },
    uid: () => uid,
    verify: jest.fn(async () => {
      events.push("verify");
    }),
    removeCloud: jest.fn(async () => {
      events.push("cloud-removed");
    }),
    removeAuth: jest.fn(async () => {
      events.push("auth-removed");
      uid = null;
    }),
    clearLocal: jest.fn(() => {
      events.push("local-cleared");
    }),
    finish: jest.fn(() => {
      intent = null;
      events.push("finished");
    }),
  };
  return {
    port,
    events,
    intent: () => intent,
    setUid: (value: string | null) => {
      uid = value;
    },
  };
}
it("verifies ownership before any deletion and clears the journal last", async () => {
  const h = harness();
  await runDeletion(h.port);
  expect(h.events).toEqual([
    "verify",
    "cloud",
    "cloud-removed",
    "auth",
    "auth-removed",
    "local",
    "local-cleared",
    "finished",
  ]);
  expect(h.intent()).toBeNull();
});
it("cancelled verification leaves all data and the journal untouched", async () => {
  const h = harness();
  jest.mocked(h.port.verify).mockRejectedValueOnce(new Error("cancelled"));
  await expect(runDeletion(h.port)).rejects.toThrow("cancelled");
  expect(h.intent()).toBeNull();
  expect(h.port.removeCloud).not.toHaveBeenCalled();
  expect(h.port.clearLocal).not.toHaveBeenCalled();
});
it("rejects an identity switch during verification", async () => {
  const h = harness();
  jest.mocked(h.port.verify).mockImplementationOnce(async () => {
    h.setUid("other");
  });
  await expect(runDeletion(h.port)).rejects.toThrow("account-changed");
  expect(h.port.removeCloud).not.toHaveBeenCalled();
});
it.each(["removeCloud", "removeAuth"] as const)(
  "retains durable retry state when %s fails",
  async (method) => {
    const h = harness();
    jest.mocked(h.port[method]).mockRejectedValueOnce(new Error("offline"));
    await expect(runDeletion(h.port)).rejects.toThrow("offline");
    expect(h.intent()?.stage).toBe(method === "removeCloud" ? "cloud" : "auth");
    expect(h.port.clearLocal).not.toHaveBeenCalled();
    await runDeletion(h.port);
    expect(h.intent()).toBeNull();
    if (method === "removeAuth")
      expect(h.port.removeCloud).toHaveBeenCalledTimes(1);
  }
);
it.each(["cloud", "auth", "local"] as const)(
  "recovers interruption while persisting %s stage",
  async (stage) => {
    const h = harness();
    const write = h.port.write;
    let failed = false;
    h.port.write = (value) => {
      if (value.stage === stage && !failed) {
        failed = true;
        throw new Error("disk interrupted");
      }
      write(value);
    };
    await expect(runDeletion(h.port)).rejects.toThrow("disk interrupted");
    await runDeletion(h.port);
    expect(h.intent()).toBeNull();
  }
);
it("retries local cleanup without signing in or deleting a new account", async () => {
  const h = harness();
  jest.mocked(h.port.clearLocal).mockImplementationOnce(() => {
    throw new Error("disk interrupted");
  });
  await expect(runDeletion(h.port)).rejects.toThrow("disk interrupted");
  expect(h.intent()?.stage).toBe("local");
  await runDeletion(h.port);
  expect(h.port.removeAuth).toHaveBeenCalledTimes(1);
  expect(h.intent()).toBeNull();
});
it("never deletes a different account after interrupted cloud deletion", async () => {
  const h = harness();
  jest.mocked(h.port.removeAuth).mockRejectedValueOnce(new Error("offline"));
  await expect(runDeletion(h.port)).rejects.toThrow("offline");
  h.setUid("another-user");
  await expect(runDeletion(h.port)).rejects.toThrow("account-changed");
  expect(h.port.removeAuth).toHaveBeenCalledTimes(1);
  expect(h.port.clearLocal).not.toHaveBeenCalled();
});

it.each([
  null,
  {},
  { uid: "", stage: "cloud" },
  { uid: "player", stage: "done" },
  { uid: 1, stage: "local" },
])("rejects malformed deletion journals: %p", (value) => {
  expect(deletionIntent(value)).toBeNull();
});
it("accepts only normalized supported journal stages", () => {
  expect(
    deletionIntent({ uid: "player", stage: "auth", extra: "discard" })
  ).toEqual({ uid: "player", stage: "auth" });
});
