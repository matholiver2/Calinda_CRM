"use client";

// Botão de ditado por voz (fala vira texto) usando a Web Speech API nativa
// do navegador — sem dependência nova, sem custo de servidor. Só disponível
// em navegadores baseados em Chromium (Chrome/Edge); em outros, o botão
// simplesmente não aparece. Não envia áudio a lugar nenhum — tudo roda no
// próprio navegador do usuário.

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResultLike = { isFinal: boolean; length: number; [index: number]: SpeechRecognitionAlternative };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
};
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function criarReconhecimento(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const janela = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  const Ctor = janela.SpeechRecognition ?? janela.webkitSpeechRecognition;
  if (!Ctor) return null;
  const reconhecimento = new Ctor();
  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;
  return reconhecimento;
}

export function DictationButton({
  valorAtual,
  onTexto,
  className,
}: {
  /** Valor atual do campo — o texto ditado é acrescentado a partir daqui. */
  valorAtual: string;
  onTexto: (texto: string) => void;
  className?: string;
}) {
  const [gravando, setGravando] = useState(false);
  const [suportado] = useState(() => criarReconhecimento() !== null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  function alternar() {
    if (gravando) {
      recognitionRef.current?.stop();
      return;
    }
    const reconhecimento = criarReconhecimento();
    if (!reconhecimento) return;

    const base = valorAtual.trim() ? `${valorAtual.trim()} ` : "";
    let textoFinal = "";

    reconhecimento.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        if (resultado.isFinal) textoFinal += `${resultado[0].transcript} `;
        else interim += resultado[0].transcript;
      }
      onTexto((base + textoFinal + interim).trim());
    };
    reconhecimento.onerror = () => setGravando(false);
    reconhecimento.onend = () => setGravando(false);

    recognitionRef.current = reconhecimento;
    reconhecimento.start();
    setGravando(true);
  }

  if (!suportado) return null;

  return (
    <button
      type="button"
      onClick={alternar}
      title={gravando ? "Parar gravação" : "Ditar por voz"}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
        gravando ? "animate-pulse bg-danger/10 text-danger" : "text-fg-subtle hover:bg-surface-hover hover:text-fg",
        className
      )}
    >
      {gravando ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
