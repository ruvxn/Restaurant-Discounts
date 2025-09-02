export type GenerateReq = {
    restaurant_slug: string;
    date: string;
    opening_hours: { hour: number }[];
  };
  
  export type GenerateRes = {
    predictions: { hour: number; walkins: number }[];
    discounts: { hour: number; discountPct: number }[];
    model_version?: string;
  };
  
  const base = process.env.MODEL_SERVER_URL!;
  
  export async function callModelServer(payload: GenerateReq): Promise<GenerateRes> {
    const res = await fetch(`${base}/v1/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // @ts-ignore
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Model server error: ${res.status}`);
    return res.json();
  }
  