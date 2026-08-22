function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4001),
  workerSecret: required("WORKER_SHARED_SECRET"),
  calindaBaseUrl: required("CALINDA_BASE_URL"),
  sessionsDir: process.env.SESSIONS_DIR ?? "./sessions",
};
