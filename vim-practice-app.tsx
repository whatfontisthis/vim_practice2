import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

const VimPractice = () => {
  // -------- Local auth + progress helpers (localStorage) --------
  const USERS_KEY = 'vim_users';
  const SESSION_KEY = 'vim_session_email';

  type StoredUsers = { [email: string]: { password: string; createdAt: string } };

  const loadUsers = (): StoredUsers => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveUsers = (users: StoredUsers) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const getSessionEmail = (): string | null => localStorage.getItem(SESSION_KEY);
  const setSessionEmail = (email: string) => localStorage.setItem(SESSION_KEY, email);
  const clearSessionEmail = () => localStorage.removeItem(SESSION_KEY);

  const loadProgress = (email: string): number | null => {
    try {
      const raw = localStorage.getItem(`vim_progress_${email}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.currentExercise === 'number' ? parsed.currentExercise : null;
    } catch {
      return null;
    }
  };

  const saveProgress = (email: string, currentExerciseIndex: number) => {
    localStorage.setItem(
      `vim_progress_${email}`,
      JSON.stringify({ currentExercise: currentExerciseIndex, savedAt: new Date().toISOString() })
    );
  };

  const exercises = [
    // All exercises below have deterministic final text for equality checking
    { question: "Move down one line and delete 'x'", shortcut: "j x", initialText: "hello world\nx", cursorPos: 0, expectedText: "hello world\n" },
    { question: "Delete character under cursor to fix the word", shortcut: "x", initialText: "Heallo World", cursorPos: 2, expectedText: "Hello World" },
    { question: "Delete the middle line", shortcut: "dd", initialText: "Keep this\nDelete this line\nKeep this too", cursorPos: 10, expectedText: "Keep this\nKeep this too" },
    { question: "Delete the next word from cursor", shortcut: "dw", initialText: "Delete this word and keep rest", cursorPos: 7, expectedText: "Delete word and keep rest" },
    { question: "Delete the word under cursor (inner word)", shortcut: "diw", initialText: "Delete entire word here", cursorPos: 9, expectedText: "Delete  word here" },
    { question: "Delete inside quotes only", shortcut: 'di"', initialText: 'text "delete this" more', cursorPos: 8, expectedText: 'text "" more' },
    { question: "Delete inside parentheses only", shortcut: "di(", initialText: "function(delete this content)", cursorPos: 12, expectedText: "function()" },
    { question: "Delete inside brackets only", shortcut: "di[", initialText: "array[remove this]", cursorPos: 8, expectedText: "array[]" },
    { question: "Delete inside braces only", shortcut: "di{", initialText: "object{clear this}", cursorPos: 9, expectedText: "object{}" },
    { question: "Delete the parentheses and contents", shortcut: "da(", initialText: "function(remove with parens)", cursorPos: 10, expectedText: "function" },
    { question: "Delete inside HTML tag only", shortcut: "dit", initialText: "<div>remove content</div>", cursorPos: 7, expectedText: "<div></div>" }
  ];

  const [currentExercise, setCurrentExercise] = useState(0);
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [mode, setMode] = useState('normal');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [keySequence, setKeySequence] = useState('');
  const [yankBuffer, setYankBuffer] = useState('');
  const [undoStack, setUndoStack] = useState([]);
  const [visualStart, setVisualStart] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const textareaRef = useRef(null);

  // -------- Auth UI state --------
  const [sessionEmail, setSessionEmailState] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Boot session and progress
  useEffect(() => {
    const email = getSessionEmail();
    if (email) {
      setSessionEmailState(email);
      const savedIndex = loadProgress(email);
      if (typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < exercises.length) {
        setCurrentExercise(savedIndex);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const exercise = exercises[currentExercise];
    setText(exercise.initialText);
    setCursorPos(exercise.cursorPos);
    setMode('normal');
    setShowHint(false);
    setFeedback('');
    setKeySequence('');
    setUndoStack([{ text: exercise.initialText, cursorPos: exercise.cursorPos }]);
    setVisualStart(null);
    setIsCompleted(false);
  }, [currentExercise]);

  // Persist progress for logged-in users when exercise changes
  useEffect(() => {
    if (sessionEmail) {
      saveProgress(sessionEmail, currentExercise);
    }
  }, [sessionEmail, currentExercise]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode, cursorPos]);

  const saveState = () => {
    setUndoStack(prev => [...prev, { text, cursorPos }]);
  };

  const checkCompletion = () => {
    const exercise = exercises[currentExercise] as any;
    if (exercise && typeof exercise.expectedText === 'string') {
      if (text === exercise.expectedText) {
        setIsCompleted(true);
        setFeedback('Completed!');
      } else if (isCompleted) {
        setIsCompleted(false);
      }
    }
  };

  useEffect(() => {
    checkCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const handleKeyDown = (e) => {
    e.preventDefault();
    
    if (mode === 'insert') {
      if (e.key === 'Escape' || (e.ctrlKey && (e.key === '[' || e.key === 'c'))) {
        setMode('normal');
        setFeedback('Exited Insert mode');
        return;
      }
      
      saveState();
      const before = text.slice(0, cursorPos);
      const after = text.slice(cursorPos);
      
      if (e.key === 'Backspace') {
        if (cursorPos > 0) {
          setText(before.slice(0, -1) + after);
          setCursorPos(cursorPos - 1);
        }
      } else if (e.key === 'Enter') {
        setText(before + '\n' + after);
        setCursorPos(cursorPos + 1);
      } else if (e.key.length === 1) {
        setText(before + e.key + after);
        setCursorPos(cursorPos + 1);
      }
      // Completion may change after any edit in insert mode
      setTimeout(checkCompletion, 0);
      return;
    }

    const newSeq = keySequence + e.key;
    setKeySequence(newSeq);

    // Movement commands
    if (newSeq === 'j') {
      const lines = text.split('\n');
      let currentLine = 0, pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= cursorPos) {
          currentLine = i;
          break;
        }
        pos += lines[i].length + 1;
      }
      if (currentLine < lines.length - 1) {
        const colOffset = cursorPos - pos;
        const nextLineStart = pos + lines[currentLine].length + 1;
        const nextLineLength = lines[currentLine + 1].length;
        setCursorPos(Math.min(nextLineStart + colOffset, nextLineStart + nextLineLength));
      }
      setKeySequence('');
    } else if (newSeq === 'k') {
      const lines = text.split('\n');
      let currentLine = 0, pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= cursorPos) {
          currentLine = i;
          break;
        }
        pos += lines[i].length + 1;
      }
      if (currentLine > 0) {
        const colOffset = cursorPos - pos;
        let prevLineStart = 0;
        for (let i = 0; i < currentLine - 1; i++) {
          prevLineStart += lines[i].length + 1;
        }
        const prevLineLength = lines[currentLine - 1].length;
        setCursorPos(Math.min(prevLineStart + colOffset, prevLineStart + prevLineLength));
      }
      setKeySequence('');
    } else if (newSeq === 'h') {
      if (cursorPos > 0) setCursorPos(cursorPos - 1);
      setKeySequence('');
    } else if (newSeq === 'l') {
      if (cursorPos < text.length) setCursorPos(cursorPos + 1);
      setKeySequence('');
    } else if (newSeq === 'w') {
      let pos = cursorPos;
      while (pos < text.length && /\S/.test(text[pos])) pos++;
      while (pos < text.length && /\s/.test(text[pos])) pos++;
      setCursorPos(pos);
      setKeySequence('');
    } else if (newSeq === 'b') {
      let pos = cursorPos - 1;
      while (pos > 0 && /\s/.test(text[pos])) pos--;
      while (pos > 0 && /\S/.test(text[pos - 1])) pos--;
      setCursorPos(Math.max(0, pos));
      setKeySequence('');
    } else if (newSeq === 'e') {
      let pos = cursorPos + 1;
      while (pos < text.length && /\s/.test(text[pos])) pos++;
      while (pos < text.length && /\S/.test(text[pos])) pos++;
      setCursorPos(Math.max(cursorPos, pos - 1));
      setKeySequence('');
    } else if (newSeq === 'x') {
      saveState();
      setText(text.slice(0, cursorPos) + text.slice(cursorPos + 1));
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'i') {
      setMode('insert');
      setFeedback('-- INSERT --');
      setKeySequence('');
    } else if (newSeq === 'yy') {
      const lines = text.split('\n');
      let currentLine = 0, pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= cursorPos) {
          currentLine = i;
          break;
        }
        pos += lines[i].length + 1;
      }
      setYankBuffer(lines[currentLine] + '\n');
      setFeedback('Yanked 1 line');
      setKeySequence('');
    } else if (newSeq === 'p') {
      saveState();
      setText(text.slice(0, cursorPos + 1) + yankBuffer + text.slice(cursorPos + 1));
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'u') {
      if (undoStack.length > 1) {
        const prevState = undoStack[undoStack.length - 2];
        setText(prevState.text);
        setCursorPos(prevState.cursorPos);
        setUndoStack(undoStack.slice(0, -1));
      }
      setKeySequence('');
    } else if (newSeq === 'dd') {
      saveState();
      const lines = text.split('\n');
      let currentLine = 0, pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= cursorPos) {
          currentLine = i;
          break;
        }
        pos += lines[i].length + 1;
      }
      lines.splice(currentLine, 1);
      setText(lines.join('\n'));
      setCursorPos(Math.min(cursorPos, lines.join('\n').length));
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'v') {
      setMode('visual');
      setVisualStart(cursorPos);
      setFeedback('-- VISUAL --');
      setKeySequence('');
    } else if (newSeq === 'V') {
      setMode('visual-line');
      setVisualStart(cursorPos);
      setFeedback('-- VISUAL LINE --');
      setKeySequence('');
    } else if (newSeq === '>>') {
      saveState();
      const lines = text.split('\n');
      let currentLine = 0, pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= cursorPos) {
          currentLine = i;
          break;
        }
        pos += lines[i].length + 1;
      }
      lines[currentLine] = '  ' + lines[currentLine];
      setText(lines.join('\n'));
      setCursorPos(cursorPos + 2);
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === '<<') {
      saveState();
      const lines = text.split('\n');
      let currentLine = 0, pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= cursorPos) {
          currentLine = i;
          break;
        }
        pos += lines[i].length + 1;
      }
      if (lines[currentLine].startsWith('  ')) {
        lines[currentLine] = lines[currentLine].slice(2);
        setText(lines.join('\n'));
        setCursorPos(Math.max(0, cursorPos - 2));
      }
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'dw') {
      saveState();
      let pos = cursorPos;
      while (pos < text.length && /\S/.test(text[pos])) pos++;
      while (pos < text.length && /\s/.test(text[pos])) pos++;
      setText(text.slice(0, cursorPos) + text.slice(pos));
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'cw') {
      saveState();
      let pos = cursorPos;
      while (pos < text.length && /\S/.test(text[pos])) pos++;
      setText(text.slice(0, cursorPos) + text.slice(pos));
      setMode('insert');
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'de') {
      saveState();
      let pos = cursorPos;
      while (pos < text.length && /\S/.test(text[pos])) pos++;
      setText(text.slice(0, cursorPos) + text.slice(pos));
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'yw') {
      let pos = cursorPos;
      while (pos < text.length && /\S/.test(text[pos])) pos++;
      setYankBuffer(text.slice(cursorPos, pos));
      setFeedback('Yanked word');
      setKeySequence('');
    } else if (newSeq === 'diw') {
      saveState();
      let start = cursorPos, end = cursorPos;
      while (start > 0 && /\S/.test(text[start - 1])) start--;
      while (end < text.length && /\S/.test(text[end])) end++;
      setText(text.slice(0, start) + text.slice(end));
      setCursorPos(start);
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'ciw') {
      saveState();
      let start = cursorPos, end = cursorPos;
      while (start > 0 && /\S/.test(text[start - 1])) start--;
      while (end < text.length && /\S/.test(text[end])) end++;
      setText(text.slice(0, start) + text.slice(end));
      setCursorPos(start);
      setMode('insert');
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq.startsWith('di') && '([{'.includes(newSeq[2])) {
      saveState();
      const open = newSeq[2];
      const close = open === '(' ? ')' : open === '[' ? ']' : '}';
      let start = text.lastIndexOf(open, cursorPos);
      let end = text.indexOf(close, cursorPos);
      if (start !== -1 && end !== -1) {
        setText(text.slice(0, start + 1) + text.slice(end));
        setCursorPos(start + 1);
      }
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq.startsWith('da') && '([{'.includes(newSeq[2])) {
      saveState();
      const open = newSeq[2];
      const close = open === '(' ? ')' : open === '[' ? ']' : '}';
      let start = text.lastIndexOf(open, cursorPos);
      let end = text.indexOf(close, cursorPos);
      if (start !== -1 && end !== -1) {
        setText(text.slice(0, start) + text.slice(end + 1));
        setCursorPos(start);
      }
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq.startsWith('ci"') || newSeq.startsWith('di"')) {
      saveState();
      let start = text.lastIndexOf('"', cursorPos - 1);
      let end = text.indexOf('"', cursorPos);
      if (start === -1) start = text.lastIndexOf('"', cursorPos);
      if (start !== -1 && end !== -1 && start < end) {
        setText(text.slice(0, start + 1) + text.slice(end));
        setCursorPos(start + 1);
        if (newSeq.startsWith('ci')) setMode('insert');
      }
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    } else if (newSeq === 'dit') {
      saveState();
      let start = text.lastIndexOf('>', cursorPos);
      let end = text.indexOf('<', cursorPos);
      if (start !== -1 && end !== -1) {
        setText(text.slice(0, start + 1) + text.slice(end));
        setCursorPos(start + 1);
      }
      setKeySequence('');
      setTimeout(checkCompletion, 0);
    }

    setTimeout(() => setKeySequence(''), 1000);
  };

  const nextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
    }
  };

  const prevExercise = () => {
    if (currentExercise > 0) {
      setCurrentExercise(currentExercise - 1);
    }
  };

  const resetExercise = () => {
    const exercise = exercises[currentExercise];
    setText(exercise.initialText);
    setCursorPos(exercise.cursorPos);
    setMode('normal');
    setFeedback('');
    setKeySequence('');
    setUndoStack([{ text: exercise.initialText, cursorPos: exercise.cursorPos }]);
  };

  // -------- Auth actions --------
  const handleRegister = () => {
    setAuthError('');
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;
    if (!email || !password) {
      setAuthError('Email and password are required');
      return;
    }
    const users = loadUsers();
    if (users[email]) {
      setAuthError('Account already exists');
      return;
    }
    users[email] = { password, createdAt: new Date().toISOString() };
    saveUsers(users);
    setSessionEmail(email);
    setSessionEmailState(email);
    setAuthPassword('');
  };

  const handleLogin = () => {
    setAuthError('');
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;
    const users = loadUsers();
    if (!users[email] || users[email].password !== password) {
      setAuthError('Invalid email or password');
      return;
    }
    setSessionEmail(email);
    setSessionEmailState(email);
    setAuthPassword('');
    // load progress if exists
    const savedIndex = loadProgress(email);
    if (typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < exercises.length) {
      setCurrentExercise(savedIndex);
    }
  };

  const handleLogout = () => {
    clearSessionEmail();
    setSessionEmailState(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center text-blue-400">Vim Shortcuts Practice</h1>
        <p className="text-center text-gray-400 mb-8">Master Vim commands interactively</p>

        {/* Auth card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
          {sessionEmail ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Signed in as</p>
                <p className="text-lg font-semibold">{sessionEmail}</p>
              </div>
              <button onClick={handleLogout} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Logout</button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  className={`px-3 py-1 rounded ${authMode === 'login' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >Login</button>
                <button
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                  className={`px-3 py-1 rounded ${authMode === 'register' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >Register</button>
              </div>
              <div className="grid gap-3">
                <input
                  placeholder="Email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="px-3 py-2 bg-gray-900 rounded outline-none border border-gray-700 focus:border-blue-500"
                />
                <input
                  placeholder="Password"
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="px-3 py-2 bg-gray-900 rounded outline-none border border-gray-700 focus:border-blue-500"
                />
                {authError && <div className="text-red-400 text-sm">{authError}</div>}
                {authMode === 'login' ? (
                  <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">Login</button>
                ) : (
                  <button onClick={handleRegister} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">Create account</button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
          {!sessionEmail && (
            <div className="mb-4 p-3 rounded bg-yellow-900 text-yellow-200">
              Please login or register to start and save your progress.
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Exercise {currentExercise + 1} / {exercises.length}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevExercise}
                disabled={currentExercise === 0}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={resetExercise}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-2"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button
                onClick={nextExercise}
                disabled={currentExercise === exercises.length - 1}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>

          <div className="bg-gray-700 rounded p-4 mb-4">
            <p className="text-xl">
              <span className="font-semibold text-yellow-400">Q:</span> {exercises[currentExercise].question}
            </p>
          </div>

          <div className="relative bg-black rounded p-4 font-mono text-sm mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-gray-400">Mode: <span className="text-green-400 font-semibold">{mode.toUpperCase()}</span></span>
              {keySequence && <span className="text-blue-400">Keys: {keySequence}</span>}
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={() => {}}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-green-400 resize-none outline-none"
              style={{ caretColor: mode === 'insert' ? 'green' : 'transparent' }}
              rows={Math.max(3, text.split('\n').length)}
              disabled={!sessionEmail}
            />
            {mode === 'normal' && (
              <div
                className="absolute bg-green-400 opacity-70"
                style={{
                  left: '1rem',
                  top: `${2.5 + (text.slice(0, cursorPos).split('\n').length - 1) * 1.5}rem`,
                  width: '0.5rem',
                  height: '1.2rem'
                }}
              />
            )}
          </div>

          {feedback && (
            <div className="bg-blue-900 text-blue-200 rounded p-3 mb-4">
              {feedback}
            </div>
          )}

          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white font-semibold"
            disabled={!sessionEmail}
          >
            <HelpCircle size={20} />
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>

          {showHint && (
            <div className="mt-4 bg-yellow-900 border-l-4 border-yellow-500 p-4 rounded">
              <p className="text-lg">
                <span className="font-semibold">Keyboard Shortcut:</span> <code className="bg-gray-800 px-2 py-1 rounded">{exercises[currentExercise].shortcut}</code>
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
          <p className="mb-2"><strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click on the text box to start practicing</li>
            <li>The cursor position is shown in Normal mode</li>
            <li>Press <code className="bg-gray-700 px-1 rounded">Esc</code> to exit Insert mode</li>
            <li>Try to complete each exercise using the correct Vim command</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VimPractice;