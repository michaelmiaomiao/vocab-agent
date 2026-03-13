export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}
