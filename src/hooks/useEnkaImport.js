import { useState, useCallback, useRef } from "react";
import { mapAvatar } from "../lib/enka.js";

const UID = /^\d{9}$/;
// A pasted Enka profile URL carries the UID after /u/ and can carry a trailing
// path segment (a share hash) after it. Stripping all non-digits before
// matching would glue the UID to digits from that later segment and produce a
// wrong number instead of failing, so this scans for the first isolated run of
// exactly nine digits instead.
const UID_IN_TEXT = /(?<!\d)\d{9}(?!\d)/;

// Accepts a bare UID or a pasted profile URL/text and returns the nine-digit
// UID to send, or null if none can be found. A digits-only input must be
// exactly nine digits: an 8- or 10-digit number is a typo, not a UID embedded
// in surrounding text, so it is rejected rather than trimmed or padded.
function extractUid(raw) {
  const clean = raw.trim();
  if (UID.test(clean)) return clean;
  if (/^\d+$/.test(clean)) return null;
  const match = clean.match(UID_IN_TEXT);
  return match ? match[0] : null;
}

// The proxy forwards Enka's status, so each one gets its own sentence.
const HTTP_MESSAGES = {
  400: "That does not look like a Genshin UID. It should be nine digits.",
  404: "No player with that UID. Check the number on your in-game profile.",
  424: "Enka.Network cannot read profiles right now, which usually means game maintenance.",
  429: "Too many requests reached Enka.Network. Wait a minute and try again.",
};
const SHOWCASE_OFF =
  "That profile shows no character details. Switch on “Show character details” in " +
  "your in-game profile, then try again. Enka caches a profile for 60 seconds, so an " +
  "immediate retry can still look empty.";

export function useEnkaImport({ byId, owned }) {
  const [uid, setUid] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [nickname, setNickname] = useState("");
  const [rows, setRows] = useState([]);
  const [unknown, setUnknown] = useState(0);
  const [picked, setPicked] = useState({});

  // Only the most recently started fetchProfile call is allowed to write to
  // state. Without this, firing a second request before the first resolves
  // lets whichever response lands last win, even if it's for a UID the user
  // already moved on from.
  const requestRef = useRef(0);

  const fail = (reqId, message) => {
    if (reqId !== requestRef.current) return;
    setStatus("error");
    setError(message);
  };

  const reset = useCallback(() => {
    requestRef.current += 1;
    setStatus("idle");
    setError("");
    setRows([]);
    setUnknown(0);
    setPicked({});
  }, []);

  const fetchProfile = useCallback(async () => {
    const reqId = ++requestRef.current;
    const parsedUid = extractUid(uid);
    if (!parsedUid) {
      fail(reqId, HTTP_MESSAGES[400]);
      return;
    }
    setStatus("loading");
    setError("");
    setRows([]);
    setUnknown(0);

    let data;
    try {
      const res = await fetch(`/api/enka?uid=${parsedUid}`);
      if (!res.ok) {
        fail(
          reqId,
          HTTP_MESSAGES[res.status] || "The import service is unavailable. Try again shortly."
        );
        return;
      }
      data = await res.json();
    } catch {
      fail(reqId, "Could not reach the import service. Check your connection and try again.");
      return;
    }

    const list = data.avatarInfoList || [];
    if (list.length === 0) {
      fail(reqId, SHOWCASE_OFF);
      return;
    }

    // A newer fetchProfile call (or a reset) may have landed while this one
    // was in flight; drop the result instead of overwriting the current one.
    if (reqId !== requestRef.current) return;

    // mapAvatar returns null for a character the generated tables predate.
    const mapped = list.map((a) => mapAvatar(a, (id) => owned[id] || null));
    const next = mapped.filter(Boolean).map((m) => ({
      ...m,
      known: !!byId[m.id],
      tracked: !!owned[m.id],
    }));

    setNickname(data.nickname || "");
    setRows(next);
    setUnknown(mapped.length - next.length);
    setPicked(Object.fromEntries(next.map((r) => [r.id, true])));
    setStatus("ready");
  }, [uid, byId, owned]);

  const toggle = useCallback((id) => {
    setPicked((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  return {
    uid,
    setUid,
    status,
    error,
    nickname,
    rows,
    unknown,
    picked,
    toggle,
    fetchProfile,
    reset,
  };
}
