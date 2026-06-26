// Prioritäts-Anfragewarteschlange mit begrenzter Parallelität — schützt den ressourcenbegrenzten
// KI-Server (1 Slot je Modell) vor Überlast (KONZEPT §8). Höhere Priorität läuft zuerst.

export type Priority = "high" | "normal" | "low";

const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

interface Job<T> {
  run: () => Promise<T>;
  priority: Priority;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
  seq: number;
}

export class RequestQueue {
  private q: Job<unknown>[] = [];
  private active = 0;
  private seq = 0;

  constructor(private concurrency = 2) {}

  add<T>(run: () => Promise<T>, priority: Priority = "normal"): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const job: Job<T> = { run, priority, resolve, reject, seq: this.seq++ };
      this.q.push(job as Job<unknown>);
      // Nach Priorität, dann FIFO sortieren.
      this.q.sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.seq - b.seq);
      this.pump();
    });
  }

  private pump() {
    while (this.active < this.concurrency && this.q.length) {
      const job = this.q.shift()!;
      this.active++;
      job
        .run()
        .then((v) => job.resolve(v))
        .catch((e) => job.reject(e))
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  get pending() {
    return this.q.length + this.active;
  }
}
