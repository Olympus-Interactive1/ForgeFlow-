import { describe, expect, it, vi } from "vitest";
import { pollMediaJob, type MediaJob } from "./media-job.js";

const job = (status: MediaJob["status"], id = "job-1"): MediaJob => ({
  id,
  provider: "test",
  status,
  createdAt: 0,
  updatedAt: 0,
});

describe("pollMediaJob", () => {
  it("returns completed jobs", async () => {
    const getJob = vi.fn().mockResolvedValue(job("completed"));
    await expect(pollMediaJob(getJob, { intervalMs: 0 })).resolves.toMatchObject({ status: "completed" });
    expect(getJob).toHaveBeenCalledTimes(1);
  });

  it("polls queued/running jobs until completion", async () => {
    const getJob = vi.fn()
      .mockResolvedValueOnce(job("queued"))
      .mockResolvedValueOnce(job("running"))
      .mockResolvedValueOnce({ ...job("completed"), result: "asset" });

    await expect(pollMediaJob(getJob, { intervalMs: 0 })).resolves.toMatchObject({
      status: "completed",
      result: "asset",
    });
    expect(getJob).toHaveBeenCalledTimes(3);
  });

  it("surfaces provider failure", async () => {
    const getJob = vi.fn().mockResolvedValue({ ...job("failed"), error: "provider error" });
    await expect(pollMediaJob(getJob, { intervalMs: 0 })).rejects.toThrow("provider error");
  });

  it("honors cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(pollMediaJob(() => Promise.resolve(job("running")), {
      intervalMs: 0,
      signal: controller.signal,
    })).rejects.toThrow("aborted");
  });
});
