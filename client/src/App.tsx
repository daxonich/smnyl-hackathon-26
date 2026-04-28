import { useEffect, useState, useCallback } from 'react';
import { Message } from './types';
import ChatWindow from './components/ChatWindow';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [_step, setStep] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch('/api/chat/start', { method: 'POST' });
        const data = await res.json();
        setSessionId(data.sessionId);
        setStep(data.step);
        setCurrentOptions(data.options ?? []);
        setMessages([
          {
            id: crypto.randomUUID(),
            text: data.message,
            sender: 'system',
            timestamp: new Date(),
            options: data.options,
          },
        ]);
      } catch {
        setMessages([
          {
            id: crypto.randomUUID(),
            text: 'No se pudo conectar con el servidor. Intenta recargar la página.',
            sender: 'system',
            timestamp: new Date(),
          },
        ]);
      }
    };

    initSession();
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!sessionId) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        text,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setCurrentOptions([]);
      setIsTyping(true);

      try {
        const res = await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, text }),
        });
        const data = await res.json();
        setStep(data.step);

        const systemMsg: Message = {
          id: crypto.randomUUID(),
          text: data.message,
          sender: 'system',
          timestamp: new Date(),
          options: data.options,
          agent: data.agent,
          summary: data.summary,
        };
        setMessages((prev) => [...prev, systemMsg]);
        setCurrentOptions(data.options ?? []);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: 'Error al enviar el mensaje. Intenta de nuevo.',
            sender: 'system',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId],
  );

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f9fafb',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          textAlign: 'center',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
          Asignación Inteligente de Agentes
        </h1>
      </header>

      <main style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          currentOptions={currentOptions}
        />
      </main>
    </div>
  );
}

export default App;
