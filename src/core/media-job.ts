export type MediaJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface MediaJob<T = unknown> {
  id: string;
  provider: string;
  status: MediaJobStatus;
  createdAt: number;
  updatedAt: number;
  result?: T;
  error?: string;
}

export interface MediaJobPollOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

export async function pollMediaJob<T>(
  getJob: () => Promise<MediaJob<T>>,
  options: MediaJobPollOptions = {},
): Promise<MediaJob<T>> {
  const timeoutMs = options.timeoutMs ?? 10 * 60_000;
  const intervalMs = options.intervalMs ?? 2_000;
  const startedAt = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new Error("Media job polling aborted");
    }

    const job = await getJob();

    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job.error ?? `Media job ${job.id} failed`);
    }
    if (job.status === "cancelled") {
      throw new Error(`Media job ${job.id} was cancelled`);
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Media job ${job.id} timed out after ${timeoutMs}ms`);
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      options.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Media job polling aborted"));
      }, { once: true });
    });
  }
}
