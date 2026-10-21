import { useEffect, useState } from "react";

import { loadConversation, startConversation, type Conversation } from "../api";

export function useConversation() {
  const [conversation, setConversation] = useState<Conversation>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);

  useEffect(() => {
    loadConversation()
      .then(setConversation)
      .catch(() => setLoadFailed(true));
  }, []);

  async function reset() {
    setResetFailed(false);
    try {
      setConversation(await startConversation());
    } catch {
      setResetFailed(true);
    }
  }

  return { conversation, loadFailed, resetFailed, reset };
}
