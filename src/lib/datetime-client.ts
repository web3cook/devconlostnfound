/** <input type="datetime-local"> values are in the device's zone; send UTC ISO. */
export function localInputToIso(fd: FormData, name: string) {
  const v = fd.get(name);
  if (typeof v === "string" && v) fd.set(name, new Date(v).toISOString());
}

/** ISO → value for <input type="datetime-local"> in the device's zone. */
export function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
