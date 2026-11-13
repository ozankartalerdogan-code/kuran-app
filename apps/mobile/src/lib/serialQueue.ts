export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(action: () => Promise<T>): Promise<T> {
    const result = this.tail.then(action);
    // Bir işin hatası sıradaki kullanıcı kararını engellemez.
    this.tail = result.catch(() => {});
    return result;
  }
}

// Bir native iş hata verse bile diğerleri bitmeden kuyruk kilidi bırakılmaz.
export async function settleJobs<T>(jobs: Promise<T>[]): Promise<void> {
  const results = await Promise.allSettled(jobs);
  const failed = results.find(result => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}
