import { useCallback, useState } from "react";

export function useLogs(maxItems: number = 500) {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const pushLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message].slice(-maxItems));
  }, [maxItems]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, pushLog, clearLogs, autoScroll, setAutoScroll };
}


