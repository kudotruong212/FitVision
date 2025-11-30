// src/hooks/useCoach.js
// Coach chat hooks

import { useState, useEffect } from "react";
import {
  fetchCoachContext,
  fetchCoachThread,
  sendCoachMessage,
  resetCoachThread,
} from "../api/services/coachService.js";

/**
 * Hook to manage coach chat
 * @returns {Object} { messages, loading, error, sendMessage, resetThread, context }
 */
export function useCoachChat() {
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const loadContext = async () => {
    try {
      const ctx = await fetchCoachContext();
      setContext(ctx);
      return ctx;
    } catch (err) {
      console.error("Error loading coach context:", err);
      setError("Không tải được context từ server.");
      throw err;
    }
  };

  const loadHistory = async () => {
    try {
      const history = await fetchCoachThread();
      setMessages(Array.isArray(history) ? history : []);
      return history;
    } catch (err) {
      console.error("Error loading coach history:", err);
      setError("Không tải được lịch sử chat.");
      throw err;
    }
  };

  const sendMessage = async (payload) => {
    try {
      setSending(true);
      setError(null);
      const response = await sendCoachMessage(payload);
      
      if (response.history) {
        setMessages(response.history);
      } else if (response.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.reply },
        ]);
      }
      
      return response;
    } catch (err) {
      console.error("Error sending coach message:", err);
      setError("Không gửi được tin nhắn.");
      throw err;
    } finally {
      setSending(false);
    }
  };

  const resetThread = async () => {
    try {
      await resetCoachThread();
      setMessages([]);
    } catch (err) {
      console.error("Error resetting coach thread:", err);
      setError("Không reset được thread.");
      throw err;
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([loadContext(), loadHistory()]);
      } catch {
        // Error already set in individual functions
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return {
    messages,
    context,
    loading,
    error,
    sending,
    sendMessage,
    resetThread,
    refetchContext: loadContext,
    refetchHistory: loadHistory,
  };
}

