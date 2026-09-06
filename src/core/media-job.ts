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

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Media job polling timed out after ${timeoutMs}ms`);
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
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        options.signal?.removeEventListener("abort", onAbort);
        resolve();
      }, intervalMs);
      const onAbort = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", onAbort);
        reject(new Error("Media job polling aborted"));
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}
