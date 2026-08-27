import { useState, useRef, useCallback } from 'react';
import { Keyboard, TextInput } from 'react-native';
import type { TextConfig, TextPosition, FontFamily, BgMode, TextAlign } from '@/components/camera/DraggableText';

export const BG_CYCLE: BgMode[] = ['none', 'dark', 'light'];
export const ALIGN_CYCLE: TextAlign[] = ['center', 'left', 'right'];

export const DEFAULT_CONFIG: TextConfig = {
  font: 'modern',
  color: '#FFFFFF',
  bgMode: 'none',
  align: 'center',
  fontSize: 28,
};

export interface UseTextOverlayReturn {
  state: {
    isTextEditing: boolean;
    isDragging: boolean;
    isOverTrash: boolean;
    inputText: string;
    committedText: string;
    textConfig: TextConfig;
    textPosition: TextPosition;
  };
  handlers: {
    handleOpenTextEditor: () => void;
    handleTextDone: () => void;
    handleClearText: () => void;
    handleTapText: () => void;
    handleDragStart: () => void;
    handleDragEnd: (droppedInTrash: boolean) => void;
    handleDragOverTrash: (isOver: boolean) => void;
    handlePositionChange: (pos: TextPosition) => void;
    handleChangeFont: (font: FontFamily) => void;
    handleChangeColor: (color: string) => void;
    handleToggleBg: () => void;
    handleToggleAlign: () => void;
    handleChangeFontSize: (fontSize: number) => void;
    setInputText: (text: string) => void;
  };
  refs: {
    inputRef: React.RefObject<TextInput | null>;
  };
}

export function useTextOverlay(): UseTextOverlayReturn {
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [inputText, setInputText] = useState('');
  const [committedText, setCommittedText] = useState('');
  const [textConfig, setTextConfig] = useState<TextConfig>(DEFAULT_CONFIG);
  const [textPosition, setTextPosition] = useState<TextPosition>({ x: 0, y: 0, scale: 1, rotation: 0 });

  const inputRef = useRef<TextInput>(null);

  const handleOpenTextEditor = useCallback(() => {
    setInputText(committedText);
    setIsTextEditing(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [committedText]);

  const handleTextDone = useCallback(() => {
    setCommittedText(inputText.trim());
    setIsTextEditing(false);
    Keyboard.dismiss();
  }, [inputText]);

  const handleClearText = useCallback(() => {
    setCommittedText('');
    setInputText('');
  }, []);

  const handleTapText = useCallback(() => {
    handleOpenTextEditor();
  }, [handleOpenTextEditor]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setIsOverTrash(false);
  }, []);

  const handleDragEnd = useCallback((droppedInTrash: boolean) => {
    setIsDragging(false);
    setIsOverTrash(false);
    if (droppedInTrash) {
      setCommittedText('');
      setInputText('');
    }
  }, []);

  const handleDragOverTrash = useCallback((isOver: boolean) => {
    setIsOverTrash(isOver);
  }, []);

  const handlePositionChange = useCallback((pos: TextPosition) => {
    setTextPosition(pos);
  }, []);

  const handleChangeFont = useCallback((font: FontFamily) => {
    setTextConfig((c) => ({ ...c, font }));
  }, []);

  const handleChangeColor = useCallback((color: string) => {
    setTextConfig((c) => ({ ...c, color }));
  }, []);

  const handleToggleBg = useCallback(() => {
    setTextConfig((c) => {
      const idx = BG_CYCLE.indexOf(c.bgMode);
      return { ...c, bgMode: BG_CYCLE[(idx + 1) % BG_CYCLE.length]! };
    });
  }, []);

  const handleToggleAlign = useCallback(() => {
    setTextConfig((c) => {
      const idx = ALIGN_CYCLE.indexOf(c.align);
      return { ...c, align: ALIGN_CYCLE[(idx + 1) % ALIGN_CYCLE.length]! };
    });
  }, []);

  const handleChangeFontSize = useCallback((fontSize: number) => {
    setTextConfig((c) => ({ ...c, fontSize }));
  }, []);

  return {
    state: {
      isTextEditing,
      isDragging,
      isOverTrash,
      inputText,
      committedText,
      textConfig,
      textPosition,
    },
    handlers: {
      handleOpenTextEditor,
      handleTextDone,
      handleClearText,
      handleTapText,
      handleDragStart,
      handleDragEnd,
      handleDragOverTrash,
      handlePositionChange,
      handleChangeFont,
      handleChangeColor,
      handleToggleBg,
      handleToggleAlign,
      handleChangeFontSize,
      setInputText,
    },
    refs: {
      inputRef,
    },
  };
}
