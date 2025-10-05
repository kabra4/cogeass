import { useRef, useState } from "react";
import { loadSpec, listOperations } from "@/lib/openapi";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SpecLoader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const setSpec = useAppStore((s) => s.setSpec);
  const setOps = useAppStore((s) => s.setOperations);

  async function doLoad(specInput: string | File) {
    const spec = await loadSpec(specInput);
    setSpec(spec);
    setOps(listOperations(spec));
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Spec URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button onClick={() => doLoad(url)}>Load</Button>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".json,.yaml,.yml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doLoad(f);
        }}
      />
      <Button onClick={() => fileRef.current?.click()}>Upload</Button>
    </div>
  );
}
