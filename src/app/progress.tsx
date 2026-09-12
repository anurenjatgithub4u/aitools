"use client";

import { useEffect, useState } from "react";
import { store } from "@/world/store";

// Points / visited counter in the landing header. Reads localStorage after mount
// so the statically exported HTML never disagrees with the client.
export function Progress() {
  const [text, setText] = useState("0 points");
  useEffect(() => {
    setText(`${store.points()} points · ${store.friends().length} friends`);
  }, []);
  return (
    <div className="score">
      🏆 <b>{text}</b>
    </div>
  );
}

export function NameField() {
  const [name, setName] = useState("Explorer");
  useEffect(() => setName(store.name()), []);
  return (
    <label className="name">
      Your name
      <input
        maxLength={18}
        placeholder="Explorer"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={(e) => store.setName(e.target.value)}
      />
    </label>
  );
}
