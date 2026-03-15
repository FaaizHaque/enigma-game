// EnigmaGame.js — React Native version of the Enigma 20-Questions game
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as LinkingExpo from 'expo-linking';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { firebaseConfig } from './config/firebase';
import { genCode, getInitials, fuzzyMatch } from './utils/helpers';
import { sounds } from './utils/sounds';

// ─── Firebase init ────────────────────────────────────────────────────────────
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#06060f',
  surface: '#0c0c1a',
  card: '#111122',
  card2: '#161628',
  border: '#1e1e38',
  border2: '#282848',
  gold: '#c8a84a',
  gold2: '#e8cc70',
  goldDim: '#7a6420',
  violet: '#6d28d9',
  violet2: '#8b5cf6',
  text: '#eeeef8',
  muted: '#8888aa',
  dim: '#4a4a66',
  success: '#22c55e',
  danger: '#ef4444',
  warn: '#f59e0b',
};

// ─── Constants ────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'personality', label: 'Famous Personality', icon: '👤', desc: 'A real or fictional person known worldwide' },
  { id: 'event', label: 'Historical Event', icon: '📜', desc: 'A pivotal moment that shaped history' },
  { id: 'object', label: 'Legendary Object', icon: '🏺', desc: 'An iconic object of great significance' },
  { id: 'place', label: 'Famous Place', icon: '🗺️', desc: 'A landmark or renowned location' },
  { id: 'invention', label: 'Great Invention', icon: '💡', desc: 'A discovery that changed the world' },
  { id: 'character', label: 'Fictional Character', icon: '🎭', desc: 'A beloved character from books, film or legend' },
];

const AVATAR_COLORS = [
  { bg: '#1c3a5c', fg: '#60aaee' },
  { bg: '#3c1c1c', fg: '#ee7060' },
  { bg: '#1c3c1c', fg: '#60cc70' },
  { bg: '#3c1c3c', fg: '#cc70cc' },
  { bg: '#3c2c1c', fg: '#ddaa50' },
  { bg: '#1c3c3c', fg: '#50cccc' },
];

const DEMO_PLAYERS = [
  { name: 'Ayesha', avatarIdx: 1 },
  { name: 'Marcus', avatarIdx: 2 },
  { name: 'Sofia', avatarIdx: 3 },
  { name: 'Jin', avatarIdx: 4 },
];

const av = (idx) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlayerAvatar({ p, size = 36 }) {
  const c = av(p.avatarIdx);
  const fs = size <= 26 ? 9 : 12;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Text style={{ color: c.fg, fontSize: fs, fontFamily: 'Outfit_700Bold' }}>
        {getInitials(p.name)}
      </Text>
    </View>
  );
}

function SimBar({ players, viewerId, onSwitch, onHome }) {
  return (
    <View style={{
      backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border2,
      paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center',
    }}>
      <TouchableOpacity
        onPress={onHome}
        style={{ borderWidth: 1, borderColor: C.border2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 }}
      >
        <Text style={{ fontSize: 14 }}>🏠</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: C.dim, letterSpacing: 2, marginRight: 6 }}>
        VIEW AS:
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        {players.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => onSwitch(p.id)}
            style={{
              backgroundColor: viewerId === p.id ? 'rgba(200,168,74,0.12)' : C.card,
              borderWidth: 1,
              borderColor: viewerId === p.id ? C.goldDim : C.border2,
              borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
            }}
          >
            <Text style={{
              fontSize: 11, fontFamily: 'Outfit_600SemiBold',
              color: viewerId === p.id ? C.gold : C.muted,
            }}>
              {p.isHost ? '👑 ' : ''}{p.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function Divider({ label = 'or' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border2 }} />
      <Text style={{ marginHorizontal: 10, fontSize: 10, color: C.dim, letterSpacing: 2, fontFamily: 'Outfit_600SemiBold' }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border2 }} />
    </View>
  );
}

function Chip({ label, style = 'gold' }) {
  const isGold = style === 'gold';
  return (
    <View style={{
      backgroundColor: isGold ? 'rgba(200,168,74,0.1)' : 'rgba(109,40,217,0.15)',
      borderWidth: 1,
      borderColor: isGold ? C.goldDim : 'rgba(109,40,217,0.3)',
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
    }}>
      <Text style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: isGold ? C.gold : C.violet2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnigmaGame() {
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState('home');
  const [game, setGame] = useState(null);
  const [viewerId, setViewerId] = useState(null);

  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [hintInput, setHintInput] = useState('');
  const [solveInput, setSolveInput] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [solveModalOpen, setSolveModalOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [partlyMode, setPartlyMode] = useState(false);
  const [partlyNote, setPartlyNote] = useState('');

  const feedScrollRef = useRef(null);

  // Deep link handling (QR code scans)
  useEffect(() => {
    const handleURL = ({ url }) => {
      try {
        const parsed = LinkingExpo.parse(url);
        const code = parsed.queryParams?.join || parsed.queryParams?.code;
        if (code) { setCodeInput(code.toUpperCase()); setScreen('join'); }
      } catch {}
    };
    LinkingExpo.getInitialURL().then((url) => { if (url) handleURL({ url }); }).catch(() => {});
    const sub = LinkingExpo.addEventListener('url', handleURL);
    return () => sub.remove();
  }, []);

  // Auto-scroll Q feed
  useEffect(() => {
    if (feedScrollRef.current) {
      setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [game?.questions?.length]);

  // Firestore real-time sync
  useEffect(() => {
    if (!game?.roomCode) return;
    const unsub = onSnapshot(doc(db, 'sessions', game.roomCode), (snap) => {
      if (!snap.exists()) return;
      const updated = snap.data();
      setGame(updated);
      setScreen((cur) => {
        if (updated.status === 'lobby') return 'lobby';
        if (updated.status === 'theme_select') return 'theme';
        if (updated.status === 'secret_entry') return cur;
        if (updated.status === 'playing') return 'game';
        if (updated.status === 'round_end') return cur === 'scoreboard' ? 'scoreboard' : 'result';
        return cur;
      });
    });
    return () => unsub();
  }, [game?.roomCode]);

  // Auto game-over check
  useEffect(() => {
    if (screen !== 'game' || !game || game.status !== 'playing') return;
    const activeG = game.players.filter((p) => !p.isHost && !p.isEliminated);
    const qUsed = game.questions.filter((q) => q.answer !== null).length;
    if (activeG.length === 0 || qUsed >= 20) endRound(null, game);
  }, [game?.players, game?.questions]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const viewer = game?.players.find((p) => p.id === viewerId);
  const host = game?.players.find((p) => p.isHost);
  const activeGuessers = game?.players.filter((p) => !p.isHost && !p.isEliminated) || [];
  const currentQuestioner = activeGuessers.length > 0
    ? activeGuessers[game.currentQuestionerIndex % activeGuessers.length]
    : null;
  const viewerIsHost = viewer?.isHost;
  const viewerIsEliminated = viewer?.isEliminated && !viewer?.isHost;
  const isMyTurn = currentQuestioner?.id === viewerId;
  const pendingQ = game?.questions.find((q) => q.answer === null);
  const answeredQs = game?.questions.filter((q) => q.answer !== null).length || 0;

  // ─── Firebase helpers ─────────────────────────────────────────────────────
  const uniqueCode = async () => {
    let code;
    do {
      code = genCode();
      const snap = await getDoc(doc(db, 'sessions', code));
      if (!snap.exists()) break;
    } while (true);
    return code;
  };

  const syncGame = async (g) => {
    if (!g?.roomCode) return;
    try { await setDoc(doc(db, 'sessions', g.roomCode), g); } catch {}
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const createGame = async () => {
    if (!nameInput.trim()) return;
    try {
      const roomCode = await uniqueCode();
      const playerId = 'p1';
      const session = {
        roomCode,
        players: [{ id: playerId, name: nameInput.trim(), score: 0, isHost: true, isEliminated: false, avatarIdx: 0 }],
        round: 1, theme: null, secretAnswer: '', hostHint: '',
        questions: [], currentQuestionerIndex: 0, status: 'lobby',
        pendingSolve: null, roundWinnerId: null, createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'sessions', roomCode), session);
      setGame(session);
      setViewerId(playerId);
      setNameInput('');
      setScreen('lobby');
    } catch {
      Alert.alert('Error', 'Could not create game. Check your connection.');
    }
  };

  const joinGame = async () => {
    if (codeInput.length !== 6 || !nameInput.trim()) return;
    const roomCode = codeInput.toUpperCase();
    try {
      let playerId, sessionData;
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'sessions', roomCode);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('Session not found');
        const session = snap.data();
        if (session.status !== 'lobby') throw new Error('Game already in progress');
        playerId = `p${session.players.length + 1}`;
        sessionData = {
          ...session,
          players: [...session.players, {
            id: playerId, name: nameInput.trim(), score: 0,
            isHost: false, isEliminated: false, avatarIdx: Math.floor(Math.random() * 6),
          }],
        };
        tx.set(ref, sessionData);
      });
      setGame(sessionData);
      setViewerId(playerId);
      setNameInput('');
      setCodeInput('');
      setScreen('lobby');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not join session');
    }
  };

  const addDemoPlayer = async (dp) => {
    if (!game) return;
    const id = `p${game.players.length + 1}`;
    const p = { id, name: dp.name, score: 0, isHost: false, isEliminated: false, avatarIdx: dp.avatarIdx };
    const newGame = { ...game, players: [...game.players, p] };
    setGame(newGame);
    await syncGame(newGame);
  };

  const startGame = async () => {
    const newGame = { ...game, status: 'theme_select' };
    setGame(newGame);
    setScreen('theme');
    await syncGame(newGame);
  };

  const confirmTheme = async () => {
    if (!selectedTheme) return;
    const newGame = { ...game, theme: selectedTheme, status: 'secret_entry' };
    setGame(newGame);
    setScreen('secret');
    await syncGame(newGame);
  };

  const lockSecret = async () => {
    if (!secretInput.trim()) return;
    const newGame = {
      ...game, secretAnswer: secretInput.trim(), hostHint: hintInput.trim(),
      status: 'playing', questions: [], currentQuestionerIndex: 0, pendingSolve: null,
    };
    setGame(newGame);
    setSecretInput('');
    setHintInput('');
    setScreen('game');
    await syncGame(newGame);
  };

  const submitQuestion = async () => {
    if (!questionInput.trim() || !isMyTurn || pendingQ) return;
    const q = {
      id: Date.now(), askerId: viewerId, askerName: viewer.name,
      askerAvatarIdx: viewer.avatarIdx, text: questionInput.trim(), answer: null,
    };
    const newGame = { ...game, questions: [...game.questions, q] };
    setGame(newGame);
    setQuestionInput('');
    sounds.question();
    await syncGame(newGame);
  };

  const answerQ = async (ans, note = '') => {
    const questions = game.questions.map((q) => q.answer === null ? { ...q, answer: ans, note: note.trim() } : q);
    const newGame = { ...game, questions, currentQuestionerIndex: game.currentQuestionerIndex + 1 };
    setGame(newGame);
    setPartlyMode(false);
    setPartlyNote('');
    if (ans === 'YES') sounds.yes();
    else if (ans === 'NO') sounds.no();
    else sounds.partly();
    await syncGame(newGame);
  };

  const submitSolve = async () => {
    if (!solveInput.trim()) return;
    setSolveModalOpen(false);
    const newGame = { ...game, pendingSolve: { playerId: viewerId, playerName: viewer.name, answer: solveInput.trim() } };
    setGame(newGame);
    setSolveInput('');
    sounds.solve();
    await syncGame(newGame);
  };

  const hostVerify = async (correct) => {
    if (correct) {
      await endRound(game.pendingSolve.playerId);
    } else {
      sounds.eliminated();
      const newGame = {
        ...game,
        players: game.players.map((p) => p.id === game.pendingSolve.playerId ? { ...p, isEliminated: true } : p),
        pendingSolve: null,
      };
      setGame(newGame);
      await syncGame(newGame);
    }
  };

  const endRound = async (winnerId, currentGame = game) => {
    const newGame = {
      ...currentGame, roundWinnerId: winnerId, status: 'round_end', pendingSolve: null,
      players: currentGame.players.map((p) => {
        if (winnerId && p.id === winnerId) return { ...p, score: p.score + 10 };
        if (!winnerId && p.isHost) return { ...p, score: p.score + 5 };
        return p;
      }),
    };
    setGame(newGame);
    setScreen('result');
    if (winnerId) sounds.win(); else sounds.hostWin();
    await syncGame(newGame);
  };

  const nextRound = async () => {
    const currHostIdx = game.players.findIndex((p) => p.isHost);
    const newHostIdx = (currHostIdx + 1) % game.players.length;
    const players = game.players.map((p, i) => ({ ...p, isHost: i === newHostIdx, isEliminated: false }));
    const newGame = {
      ...game, players, round: game.round + 1, theme: null, secretAnswer: '',
      hostHint: '', questions: [], currentQuestionerIndex: 0,
      status: 'theme_select', pendingSolve: null, roundWinnerId: undefined,
    };
    setGame(newGame);
    setSelectedTheme(null);
    setScreen('theme');
    await syncGame(newGame);
  };

  const goHome = () => {
    if (game && game.status === 'playing') {
      Alert.alert('Leave Game', 'Leave the game? All progress will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => { setGame(null); setViewerId(null); setScreen('home'); } },
      ]);
    } else {
      setGame(null); setViewerId(null); setScreen('home');
    }
  };

  const joinLink = game?.roomCode
    ? LinkingExpo.createURL('/', { queryParams: { join: game.roomCode } })
    : `enigma://join?code=${game?.roomCode}`;

  const SBar = () => game
    ? <SimBar players={game.players} viewerId={viewerId} onSwitch={setViewerId} onHome={goHome} />
    : null;

  // ─── HOME ─────────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <Modal visible={howToPlayOpen} animationType="slide" transparent onRequestClose={() => setHowToPlayOpen(false)}>
          <View style={S.overlay}>
            <View style={[S.modal, { maxHeight: '90%' }]}>
              <View style={S.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[S.modalTitle, { marginBottom: 16 }]}>📖 How to Play</Text>

                <Text style={S.sectionLabel}>🎯 Objective</Text>
                <Text style={S.bodyText}>
                  One player is the <Text style={{ color: C.text, fontFamily: 'Outfit_700Bold' }}>Host</Text> who picks a secret.
                  All other players are <Text style={{ color: C.text, fontFamily: 'Outfit_700Bold' }}>Guessers</Text> who must
                  figure out the secret by asking up to <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions</Text>.
                  The Host answers with <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold' }}>Yes</Text>,{' '}
                  <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold' }}>No</Text>, or{' '}
                  <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold' }}>Partly</Text>.
                </Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>👥 The Roles</Text>
                <View style={S.infoCard}>
                  <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold', fontSize: 14, marginBottom: 4 }}>👑 The Host</Text>
                  <Text style={S.bodyText}>Selects a theme, thinks of a secret, and answers every question. A Partly answer can include a short note. The Host wins if nobody guesses correctly.</Text>
                </View>
                <View style={[S.infoCard, { marginTop: 8 }]}>
                  <Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold', fontSize: 14, marginBottom: 4 }}>🕵️ The Guessers</Text>
                  <Text style={S.bodyText}>Take turns asking one question at a time. All players can see every question and answer.</Text>
                </View>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>🔢 Question Limit</Text>
                <Text style={S.bodyText}>There are <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions total</Text>, shared equally among all guessers.</Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>💡 Solving the Secret</Text>
                <Text style={S.bodyText}>Any guesser can tap <Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold' }}>💡 Solve</Text> at any time. The Host decides if it's Correct or Wrong.</Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>🏆 Winning & Elimination</Text>
                <Text style={S.bodyText}>
                  {'• '}<Text style={{ color: C.success }}>Correct guess</Text>{' → Guesser wins, earns '}<Text style={{ color: C.gold }}>10 pts</Text>{'\n'}
                  {'• '}<Text style={{ color: C.danger }}>Wrong guess</Text>{' → Guesser eliminated\n'}
                  {'• All 20 questions used or all eliminated → '}<Text style={{ color: C.gold }}>Host wins, earns 5 pts</Text>
                </Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>🔄 Rounds</Text>
                <Text style={S.bodyText}>After each round the Host role rotates. Play as many rounds as you like!</Text>

                <TouchableOpacity style={[S.btnGold, { marginTop: 24, marginBottom: 8 }]} onPress={() => setHowToPlayOpen(false)}>
                  <Text style={S.btnGoldText}>Got it — Let's Play! ✦</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 52, marginBottom: 10 }}>🔍</Text>
            <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 32, letterSpacing: 6, color: C.gold }}>ENIGMA</Text>
            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 4, textTransform: 'uppercase', marginTop: 6, fontFamily: 'Outfit_400Regular' }}>
              Reviving the Classic Art of 20 Questions
            </Text>
          </View>

          <TouchableOpacity style={S.btnGold} onPress={() => setScreen('create')}>
            <Text style={S.btnGoldText}>✦  Create New Game</Text>
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity style={S.btnOutline} onPress={() => setScreen('join')}>
            <Text style={S.btnOutlineText}>Join with a Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[S.btnOutline, { marginTop: 24, borderColor: 'rgba(200,168,74,0.3)' }]} onPress={() => setHowToPlayOpen(true)}>
            <Text style={[S.btnOutlineText, { color: C.gold }]}>📖  How to Play</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────
  if (screen === 'create') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Create Game</Text>
          <Text style={[S.muted, { marginBottom: 24 }]}>You'll be the first host this round.</Text>
          <Text style={S.fieldLabel}>Your Name</Text>
          <TextInput
            style={S.input} placeholder="Enter your name..." placeholderTextColor={C.dim}
            value={nameInput} onChangeText={setNameInput} maxLength={20}
            autoFocus onSubmitEditing={createGame} returnKeyType="go"
          />
          <TouchableOpacity style={[S.btnGold, !nameInput.trim() && S.btnDisabled]} onPress={createGame} disabled={!nameInput.trim()}>
            <Text style={S.btnGoldText}>Create Room →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── JOIN ─────────────────────────────────────────────────────────────────
  if (screen === 'join') {
    const joinReady = codeInput.length === 6 && nameInput.trim();
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Join Game</Text>
          <Text style={[S.muted, { marginBottom: 24 }]}>Get the room code from your host.</Text>
          <Text style={S.fieldLabel}>Room Code</Text>
          <TextInput
            style={[S.input, { textAlign: 'center', fontFamily: 'Cinzel_700Bold', fontSize: 28, letterSpacing: 8, color: C.gold }]}
            placeholder="XXXXXX" placeholderTextColor={C.dim}
            value={codeInput} onChangeText={(t) => setCodeInput(t.toUpperCase())}
            maxLength={6} autoCapitalize="characters" autoFocus
          />
          <Text style={[S.fieldLabel, { marginTop: 16 }]}>Your Name</Text>
          <TextInput
            style={S.input} placeholder="Enter your name..." placeholderTextColor={C.dim}
            value={nameInput} onChangeText={setNameInput}
            maxLength={20} onSubmitEditing={joinGame} returnKeyType="go"
          />
          <TouchableOpacity style={[S.btnGold, !joinReady && S.btnDisabled]} onPress={joinGame} disabled={!joinReady}>
            <Text style={S.btnGoldText}>Join →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (!game) return null;

  // ─── LOBBY ────────────────────────────────────────────────────────────────
  if (screen === 'lobby') {
    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 90 }]}>
          <View style={S.screenHeader}>
            <Chip label="Lobby" />
            <Text style={{ fontSize: 12, color: C.dim, fontFamily: 'Outfit_400Regular' }}>
              {game.players.length} player{game.players.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Room code + QR */}
          <View style={S.codeBox}>
            <Text style={S.codeBoxLabel}>Room Code</Text>
            <Text style={S.codeBoxValue}>{game.roomCode}</Text>
            <Text style={S.codeBoxSub}>Share this code or scan QR to join</Text>
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 10 }}>
                <QRCode
                  value={joinLink || `enigma://join?code=${game.roomCode}`}
                  size={140} backgroundColor="#ffffff" color="#06060f"
                />
              </View>
            </View>
          </View>

          {/* Players */}
          <View style={S.card}>
            <Text style={S.cardTitle}>Players</Text>
            {game.players.map((p) => (
              <View key={p.id} style={S.playerItem}>
                <PlayerAvatar p={p} />
                <Text style={[S.playerName, { flex: 1 }]}>
                  {p.name}{p.id === viewerId ? <Text style={{ color: C.dim, fontSize: 11 }}> (You)</Text> : ''}
                </Text>
                <View style={p.isHost ? S.badgeHost : S.badgeGuesser}>
                  <Text style={p.isHost ? S.badgeHostText : S.badgeGuesserText}>
                    {p.isHost ? '👑 Host' : 'Guesser'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Demo players */}
          <View style={[S.card, { borderColor: 'rgba(109,40,217,0.3)' }]}>
            <Text style={[S.cardTitle, { color: C.violet2 }]}>⚡ Simulate Friends Joining</Text>
            <Text style={[S.bodyText, { marginBottom: 12 }]}>Tap to add demo players (simulates friends joining via code)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DEMO_PLAYERS.filter((dp) => !game.players.find((p) => p.name === dp.name)).map((dp) => (
                <TouchableOpacity key={dp.name} style={S.btnOutlineSm} onPress={() => addDemoPlayer(dp)}>
                  <Text style={S.btnOutlineSmText}>+ {dp.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {viewerIsHost && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: 16, paddingBottom: insets.bottom + 16,
            backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
          }}>
            {game.players.length >= 2
              ? <TouchableOpacity style={S.btnGold} onPress={startGame}><Text style={S.btnGoldText}>Start Game →</Text></TouchableOpacity>
              : <Text style={[S.muted, { textAlign: 'center' }]}>Need at least 2 players to start</Text>
            }
          </View>
        )}
      </View>
    );
  }

  // ─── THEME SELECT ─────────────────────────────────────────────────────────
  if (screen === 'theme') {
    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <Chip label={`Round ${game.round}`} />
            <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular' }}>Host: {host?.name}</Text>
          </View>

          {viewerIsHost ? (
            <>
              <Text style={S.h2}>Choose a Theme</Text>
              <Text style={[S.muted, { marginBottom: 18 }]}>Your secret must fit within this category.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {THEMES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[S.themeTile, selectedTheme?.id === t.id && S.themeTileSel]}
                    onPress={() => setSelectedTheme(t)}
                  >
                    <Text style={{ fontSize: 26, marginBottom: 7 }}>{t.icon}</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: C.text, textAlign: 'center', lineHeight: 16 }}>{t.label}</Text>
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 4, textAlign: 'center', lineHeight: 14, fontFamily: 'Outfit_400Regular' }}>{t.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[S.btnGold, !selectedTheme && S.btnDisabled]} onPress={confirmTheme} disabled={!selectedTheme}>
                <Text style={S.btnGoldText}>Continue →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>⏳</Text>
              <Text style={[S.h2, { textAlign: 'center', marginBottom: 8 }]}>Host is choosing...</Text>
              <Text style={[S.muted, { textAlign: 'center', marginBottom: 28 }]}>The host is selecting a theme. Prepare your mind.</Text>
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border2, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: C.dim, letterSpacing: 2, marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>HOST THIS ROUND</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.gold }}>{host?.name}</Text>
              </View>
              <Text style={{ fontSize: 11, color: C.dim, marginTop: 20, fontFamily: 'Outfit_400Regular' }}>
                Switch to host in the bar above to proceed
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── SECRET ENTRY ─────────────────────────────────────────────────────────
  if (screen === 'secret') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <Chip label={`${game.theme?.icon} ${game.theme?.label}`} style="violet" />
          </View>

          {viewerIsHost ? (
            <>
              <Text style={S.h2}>Your Secret</Text>
              <Text style={[S.muted, { marginBottom: 18 }]}>Think of something within the theme. Guessers must unravel it.</Text>
              <Text style={S.fieldLabel}>Secret Answer</Text>
              <TextInput
                style={S.input}
                placeholder={`e.g. "Nikola Tesla", "The Magna Carta"...`}
                placeholderTextColor={C.dim}
                value={secretInput} onChangeText={setSecretInput} autoFocus
              />
              <Text style={[S.fieldLabel, { marginTop: 8 }]}>Optional Hint (visible to guessers)</Text>
              <TextInput
                style={S.input}
                placeholder='e.g. "A scientist from the 19th century"'
                placeholderTextColor={C.dim}
                value={hintInput} onChangeText={setHintInput}
              />
              <View style={{ backgroundColor: 'rgba(245,158,11,0.07)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 12, marginVertical: 10 }}>
                <Text style={{ fontSize: 12, color: C.warn, fontFamily: 'Outfit_400Regular' }}>🔒 Your answer is hidden until the round ends.</Text>
              </View>
              <TouchableOpacity style={[S.btnGold, !secretInput.trim() && S.btnDisabled]} onPress={lockSecret} disabled={!secretInput.trim()}>
                <Text style={S.btnGoldText}>Lock it in → Start Round</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>🤫</Text>
              <Text style={[S.h2, { textAlign: 'center', marginBottom: 8 }]}>Host is writing their secret...</Text>
              <Text style={[S.muted, { textAlign: 'center' }]}>Stay sharp. The questioning begins soon.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── GAME ─────────────────────────────────────────────────────────────────
  if (screen === 'game') {
    const qLeft = 20 - answeredQs;
    const canAsk = !viewerIsHost && !viewerIsEliminated && isMyTurn && !pendingQ;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />

        {/* Host verify modal */}
        <Modal visible={!!(game.pendingSolve && viewerIsHost)} transparent animationType="slide" onRequestClose={() => {}}>
          <View style={S.overlay}>
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <Text style={S.modalTitle}>Verify Guess</Text>
              <Text style={S.modalSub}>{game.pendingSolve?.playerName} thinks they cracked it!</Text>
              <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>THEIR GUESS</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.gold }}>{game.pendingSolve?.answer}</Text>
                {game.pendingSolve && (() => {
                  const looks = fuzzyMatch(game.pendingSolve.answer, game.secretAnswer);
                  return (
                    <View style={{ marginTop: 8, backgroundColor: looks ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, color: looks ? C.success : C.danger, fontFamily: 'Outfit_400Regular' }}>
                        {looks ? '🤖 Looks correct' : '🤖 Looks wrong'} — but you decide!
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>Actual Secret</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.violet2 }}>{game.secretAnswer}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[S.btnNo, { flex: 1 }]} onPress={() => hostVerify(false)}>
                  <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✗ Wrong</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btnYes, { flex: 1 }]} onPress={() => hostVerify(true)}>
                  <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✓ Correct!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Waiting modal (guesser sees pending solve) */}
        <Modal visible={!!(game.pendingSolve && !viewerIsHost)} transparent animationType="slide" onRequestClose={() => {}}>
          <View style={S.overlay}>
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <View style={{ alignItems: 'center', paddingVertical: 10, paddingBottom: 20 }}>
                <Text style={{ fontSize: 52, marginBottom: 12 }}>⚖️</Text>
                <Text style={S.modalTitle}>Host is deciding...</Text>
                <Text style={S.modalSub}>{game.pendingSolve?.playerName} submitted an answer — waiting for the verdict.</Text>
                <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 6, fontFamily: 'Outfit_400Regular' }}>ANSWER SUBMITTED</Text>
                  <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.gold }}>{game.pendingSolve?.answer}</Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Solve modal */}
        <Modal visible={solveModalOpen} transparent animationType="slide" onRequestClose={() => setSolveModalOpen(false)}>
          <View style={S.overlay}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSolveModalOpen(false)} />
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <Text style={S.modalTitle}>Make Your Guess</Text>
              <Text style={S.modalSub}>Be confident — a wrong guess eliminates you from the round!</Text>
              <TextInput
                style={[S.input, { marginBottom: 12 }]}
                placeholder="Type your answer..." placeholderTextColor={C.dim}
                value={solveInput} onChangeText={setSolveInput}
                autoFocus onSubmitEditing={submitSolve} returnKeyType="done"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[S.btnOutline, { flex: 1, paddingVertical: 14 }]} onPress={() => setSolveModalOpen(false)}>
                  <Text style={S.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btnSolve, { flex: 1 }, !solveInput.trim() && S.btnDisabled]} onPress={submitSolve} disabled={!solveInput.trim()}>
                  <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>Submit Guess</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Game content */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {/* Top bar */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ gap: 4 }}>
              <Chip label={`${game.theme?.icon} ${game.theme?.label}`} style="violet" />
              <Chip label={`Round ${game.round}`} />
            </View>
            {game.hostHint ? (
              <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', borderRadius: 8, padding: 8, maxWidth: 160 }}>
                <Text style={{ fontSize: 10, color: C.warn, letterSpacing: 1, marginBottom: 2, fontFamily: 'Outfit_700Bold' }}>HINT</Text>
                <Text style={{ fontSize: 11, color: C.text, fontFamily: 'Outfit_400Regular' }}>{game.hostHint}</Text>
              </View>
            ) : null}
          </View>

          {/* Progress bar */}
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_400Regular' }}>Questions Remaining</Text>
              <Text style={{ fontSize: 11, color: qLeft <= 5 ? C.danger : C.dim, fontFamily: 'Outfit_600SemiBold' }}>{qLeft} / 20</Text>
            </View>
            <View style={{ height: 3, backgroundColor: C.border2, borderRadius: 2 }}>
              <View style={{ height: 3, width: `${(answeredQs / 20) * 100}%`, backgroundColor: qLeft <= 5 ? C.danger : C.gold, borderRadius: 2 }} />
            </View>
          </View>

          {/* Player strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {game.players.map((p) => {
              const c = av(p.avatarIdx);
              const isCur = currentQuestioner?.id === p.id && !p.isHost;
              return (
                <View key={p.id} style={[S.stripItem, isCur && S.stripItemCur, p.isEliminated && { opacity: 0.4 }]}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c.fg, fontSize: 9, fontFamily: 'Outfit_700Bold' }}>{getInitials(p.name)}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: C.muted, fontFamily: 'Outfit_400Regular' }} numberOfLines={1}>
                    {p.isHost ? '👑' : p.isEliminated ? '❌' : ''}{p.name.split(' ')[0]}
                  </Text>
                  <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 11, color: C.gold }}>{p.score}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Turn banner */}
          {pendingQ && viewerIsHost ? (
            <View style={[S.turnBanner, { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.06)', marginBottom: 8 }]}>
              <View style={[S.turnDot, { backgroundColor: C.warn }]} />
              <Text style={[S.turnText, { color: C.warn }]}>A question awaits your answer!</Text>
            </View>
          ) : (
            <View style={[S.turnBanner, { marginBottom: 8 }]}>
              <View style={S.turnDot} />
              <Text style={S.turnText}>
                {currentQuestioner
                  ? `${currentQuestioner.name}'s turn${currentQuestioner.id === viewerId ? " — that's you!" : ''}`
                  : 'All guessers are out!'}
              </Text>
            </View>
          )}

          {/* Host secret reveal */}
          {viewerIsHost && (
            <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>Your Secret</Text>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.violet2 }}>{game.secretAnswer}</Text>
            </View>
          )}

          {/* Q Feed */}
          <ScrollView ref={feedScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {game.questions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: C.dim, fontSize: 13, textAlign: 'center', lineHeight: 22, fontFamily: 'Outfit_400Regular' }}>
                  No questions yet.{'\n'}The first guesser will set the tone...
                </Text>
              </View>
            ) : (
              game.questions.map((q, i) => {
                const c = av(q.askerAvatarIdx);
                return (
                  <View key={q.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: c.fg, fontSize: 9, fontFamily: 'Outfit_700Bold' }}>{getInitials(q.askerName)}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>{q.askerName}</Text>
                      <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_400Regular' }}>Q{i + 1}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: C.text, lineHeight: 20, fontFamily: 'Outfit_400Regular' }}>{q.text}</Text>
                    {q.answer === null ? (
                      <View style={[S.qBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }]}>
                        <Text style={{ color: C.warn, fontSize: 12, fontFamily: 'Outfit_700Bold' }}>⏳ Awaiting answer</Text>
                      </View>
                    ) : q.answer === 'PARTLY' ? (
                      <View style={[S.qBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                        <Text style={{ color: C.warn, fontSize: 12, fontFamily: 'Outfit_700Bold' }}>
                          {'~ Partly'}{q.note ? `\n"${q.note}"` : ''}
                        </Text>
                      </View>
                    ) : (
                      <View style={[S.qBadge, {
                        backgroundColor: q.answer === 'YES' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        borderColor: q.answer === 'YES' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      }]}>
                        <Text style={{ color: q.answer === 'YES' ? C.success : C.danger, fontSize: 12, fontFamily: 'Outfit_700Bold' }}>
                          {q.answer === 'YES' ? '✓ Yes' : '✗ No'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Action area */}
          <View style={{ paddingVertical: 10, paddingBottom: insets.bottom + 8 }}>
            {viewerIsHost && pendingQ ? (
              <View>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontFamily: 'Outfit_400Regular' }}>
                  {'Answering: '}<Text style={{ color: C.text, fontFamily: 'Outfit_600SemiBold' }}>"{pendingQ.text}"</Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: partlyMode ? 8 : 0 }}>
                  <TouchableOpacity style={[S.btnYes, { flex: 1 }]} onPress={() => answerQ('YES')}>
                    <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✓ YES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.btnPartly, { flex: 1 }, partlyMode && S.btnPartlyActive]} onPress={() => { setPartlyMode((m) => !m); setPartlyNote(''); }}>
                    <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>~ PARTLY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.btnNo, { flex: 1 }]} onPress={() => answerQ('NO')}>
                    <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✗ NO</Text>
                  </TouchableOpacity>
                </View>
                {partlyMode && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[S.input, { flex: 1, paddingVertical: 10, fontSize: 13, marginBottom: 0 }]}
                      placeholder="Add a note (optional)..." placeholderTextColor={C.dim}
                      value={partlyNote} onChangeText={setPartlyNote}
                      onSubmitEditing={() => answerQ('PARTLY', partlyNote)}
                      autoFocus returnKeyType="done"
                    />
                    <TouchableOpacity style={[S.btnPartly, { paddingHorizontal: 16 }]} onPress={() => answerQ('PARTLY', partlyNote)}>
                      <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold', fontSize: 13 }}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : viewerIsEliminated ? (
              <View style={{ padding: 14, backgroundColor: 'rgba(239,68,68,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: C.danger, fontFamily: 'Outfit_400Regular' }}>
                  ❌ You've been eliminated — watch the others play on...
                </Text>
              </View>
            ) : !viewerIsHost ? (
              canAsk ? (
                <View>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={[S.input, { flex: 1, paddingVertical: 12, fontSize: 14, marginBottom: 0 }]}
                      placeholder="Ask a yes/no question..." placeholderTextColor={C.dim}
                      value={questionInput} onChangeText={setQuestionInput}
                      onSubmitEditing={submitQuestion} returnKeyType="send"
                    />
                    <TouchableOpacity
                      style={[S.btnGold, { width: 'auto', paddingHorizontal: 18, borderRadius: 10 }, !questionInput.trim() && S.btnDisabled]}
                      onPress={submitQuestion} disabled={!questionInput.trim()}
                    >
                      <Text style={S.btnGoldText}>Ask</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={S.btnSolve} onPress={() => { setSolveInput(''); setSolveModalOpen(true); }}>
                    <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>💡 I Know It — Solve!</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, padding: 12, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular' }}>
                      {pendingQ ? 'Waiting for host to answer...' : `Waiting for ${currentQuestioner?.name || 'next player'}...`}
                    </Text>
                  </View>
                  <TouchableOpacity style={[S.btnSolve, { paddingHorizontal: 16 }]} onPress={() => { setSolveInput(''); setSolveModalOpen(true); }}>
                    <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>💡 Solve</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: C.dim, fontFamily: 'Outfit_400Regular' }}>
                  Host — watch and answer questions as they come in.
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── RESULT ───────────────────────────────────────────────────────────────
  if (screen === 'result') {
    const winner = game.players.find((p) => p.id === game.roundWinnerId);
    const hostWon = !winner;
    const sorted = [...game.players].sort((a, b) => b.score - a.score);

    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          {/* Winner block */}
          <View style={{ alignItems: 'center', padding: 28, backgroundColor: 'rgba(200,168,74,0.06)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 20, marginVertical: 16 }}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>{hostWon ? '🎩' : '🎉'}</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 26, color: C.gold }}>
              {hostWon ? host?.name : winner?.name}
            </Text>
            <Text style={{ fontSize: 10, color: C.goldDim, letterSpacing: 3, textTransform: 'uppercase', marginTop: 8, fontFamily: 'Outfit_400Regular' }}>
              {hostWon ? 'defended the secret — nobody cracked it!' : 'cracked the secret!'}
            </Text>
          </View>

          {/* Secret reveal */}
          <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>The Secret Was</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.violet2 }}>{game.secretAnswer}</Text>
            <Text style={{ fontSize: 12, color: C.dim, marginTop: 4, fontFamily: 'Outfit_400Regular' }}>{game.theme?.icon} {game.theme?.label}</Text>
          </View>

          {/* Leaderboard */}
          <View style={S.card}>
            <Text style={S.cardTitle}>Leaderboard</Text>
            {sorted.map((p, i) => {
              const c = av(p.avatarIdx);
              return (
                <View key={p.id} style={[S.sbRow, i === 0 && S.sbRowFirst]}>
                  <Text style={[S.sbRank, i === 0 && { color: C.gold }]}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </Text>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c.fg, fontSize: 10, fontFamily: 'Outfit_700Bold' }}>{getInitials(p.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: i === 0 ? 'Outfit_700Bold' : 'Outfit_500Medium', color: C.text }}>{p.name}</Text>
                    {p.id === game.roundWinnerId && <Text style={{ fontSize: 11, color: C.gold, fontFamily: 'Outfit_400Regular' }}>+10 pts this round</Text>}
                    {!game.roundWinnerId && p.isHost && <Text style={{ fontSize: 11, color: C.gold, fontFamily: 'Outfit_400Regular' }}>+5 pts (host win)</Text>}
                  </View>
                  <Text style={S.sbPts}>{p.score}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <TouchableOpacity style={[S.btnOutline, { flex: 1 }]} onPress={() => setScreen('scoreboard')}>
              <Text style={S.btnOutlineText}>Final Scores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.btnGold, { flex: 1 }]} onPress={nextRound}>
              <Text style={S.btnGoldText}>Next Round →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── FINAL SCOREBOARD ─────────────────────────────────────────────────────
  if (screen === 'scoreboard') {
    const sorted = [...game.players].sort((a, b) => b.score - a.score);
    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 60, marginBottom: 10 }}>🏆</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 30, color: C.gold }}>Final Standings</Text>
          </View>
          <View style={S.card}>
            {sorted.map((p, i) => {
              const c = av(p.avatarIdx);
              return (
                <View key={p.id} style={[S.sbRow, i === 0 && S.sbRowFirst]}>
                  <Text style={[S.sbRank, { fontSize: i === 0 ? 22 : 18 }, i === 0 && { color: C.gold }]}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </Text>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c.fg, fontSize: 12, fontFamily: 'Outfit_700Bold' }}>{getInitials(p.name)}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontFamily: i === 0 ? 'Outfit_700Bold' : 'Outfit_500Medium', color: C.text }}>{p.name}</Text>
                  <Text style={[S.sbPts, { fontSize: i === 0 ? 24 : 20 }]}>{p.score}</Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={[S.btnGold, { marginTop: 16 }]} onPress={goHome}>
            <Text style={S.btnGoldText}>Play Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingHorizontal: 16 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 16 },
  backBtn: { fontSize: 13, color: C.muted, fontFamily: 'Outfit_500Medium' },
  h2: { fontFamily: 'Cinzel_600SemiBold', fontSize: 20, color: C.text, marginBottom: 6 },
  muted: { fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular' },
  bodyText: { fontSize: 13, color: C.muted, lineHeight: 20, fontFamily: 'Outfit_400Regular' },
  sectionLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: C.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  infoCard: { backgroundColor: C.card2, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },

  // Buttons
  btnGold: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  btnGoldText: { color: '#1a0f00', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border2, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { color: C.text, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  btnOutlineSm: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border2, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnOutlineSmText: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  btnDisabled: { opacity: 0.4 },
  btnYes: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnNo: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPartly: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPartlyActive: { backgroundColor: 'rgba(245,158,11,0.25)', borderColor: 'rgba(245,158,11,0.6)' },
  btnSolve: { backgroundColor: C.violet, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },

  // Input
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16, fontFamily: 'Outfit_400Regular', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },

  // Card
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 18, marginBottom: 12 },
  cardTitle: { fontFamily: 'Cinzel_600SemiBold', fontSize: 12, color: C.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },

  // Code box
  codeBox: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.goldDim, borderRadius: 16, padding: 22, alignItems: 'center', marginVertical: 14 },
  codeBoxLabel: { fontSize: 10, color: C.dim, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Outfit_400Regular' },
  codeBoxValue: { fontFamily: 'Cinzel_700Bold', fontSize: 38, color: C.gold, letterSpacing: 10 },
  codeBoxSub: { fontSize: 11, color: C.dim, marginTop: 8, fontFamily: 'Outfit_400Regular' },

  // Player item
  playerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  playerName: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: C.text },
  badgeHost: { backgroundColor: 'rgba(200,168,74,0.12)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeHostText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: C.gold, letterSpacing: 1, textTransform: 'uppercase' },
  badgeGuesser: { backgroundColor: 'rgba(109,40,217,0.15)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeGuesserText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: C.violet2, letterSpacing: 1, textTransform: 'uppercase' },

  // Theme tiles
  themeTile: { width: '48%', backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 14, padding: 16, alignItems: 'center' },
  themeTileSel: { borderColor: C.gold, backgroundColor: 'rgba(200,168,74,0.08)' },

  // Turn banner
  turnBanner: { backgroundColor: 'rgba(200,168,74,0.06)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  turnDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.gold },
  turnText: { fontSize: 13, color: C.gold, fontFamily: 'Outfit_500Medium', flex: 1 },

  // Player strip
  stripItem: { alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, minWidth: 58, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 6 },
  stripItemCur: { borderColor: C.goldDim, backgroundColor: 'rgba(200,168,74,0.08)' },

  // Q badge
  qBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 7 },

  // Scoreboard
  sbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  sbRowFirst: { backgroundColor: 'rgba(200,168,74,0.08)', borderColor: C.goldDim },
  sbRank: { fontFamily: 'Cinzel_400Regular', fontSize: 18, color: C.dim, width: 28 },
  sbPts: { fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.gold },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end', alignItems: 'center' },
  modal: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, width: '100%' },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Cinzel_700Bold', fontSize: 18, color: C.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 20, fontFamily: 'Outfit_400Regular' },
});
