export interface SafeApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

export async function fetchApiJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeApiResult<T>> {
  const res = await fetch(input, init);
  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {
      ok: res.ok,
      status: res.status,
      data: ({} as unknown) as T & { error?: string },
    };
  }

  if (trimmed.startsWith('<')) {
    return {
      ok: false,
      status: res.status || 502,
      data: ({
        error:
          'A rota de serviço retornou página HTML em vez de dados JSON. Tente novamente em instantes ou recarregue a página.',
      } as unknown) as T & { error?: string },
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as T & { error?: string };
    return {
      ok: res.ok,
      status: res.status,
      data: parsed,
    };
  } catch {
    return {
      ok: false,
      status: res.status || 502,
      data: ({
        error: `Resposta inesperada do servidor (HTTP ${res.status}).`,
      } as unknown) as T & { error?: string },
    };
  }
}
